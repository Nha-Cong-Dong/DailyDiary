# MongoDB với PyMongo async: client, truy vấn, cập nhật an toàn

Mô hình dữ liệu (collection, trường, index) nằm ở `docs/Project_Specs.md` mục 5.4. File này nói cách viết code.

## Mục lục
1. Client và dependency
2. Chuyển đổi document ↔ schema
3. Đọc: lọc theo user_id, projection, phân trang
4. Ghi một ngày: upsert + phát hiện xung đột
5. Ảnh nhúng: giới hạn 10 ảnh nguyên tử, xóa theo id
6. Tìm kiếm từ khóa không dấu
7. Lỗi từ MongoDB → lỗi chuẩn
8. Thao tác nhiều collection (xóa tài khoản)
9. Những điều không làm

## 1. Client và dependency (`app/db/client.py`)

```python
from typing import Annotated
from fastapi import Depends, Request
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase


def make_client(uri: str) -> AsyncMongoClient:
    return AsyncMongoClient(
        uri,
        uuidRepresentation="standard",   # uuid.UUID ↔ BSON binary subtype 4
        tz_aware=True,                   # datetime đọc ra có tzinfo=UTC
        serverSelectionTimeoutMS=3000,   # DB sập: lỗi sau 3 s thay vì 30 s
        appname="dailydiary-api",
    )


async def get_db(request: Request) -> AsyncDatabase:
    return request.app.state.db


Db = Annotated[AsyncDatabase, Depends(get_db)]
```

- Một client cho mỗi process, tạo trong lifespan, đóng bằng `await client.close()`.
- Tên collection lấy từ `app/db/collections.py` (`c.ENTRIES`...), không gõ chuỗi.
- Hosting: chuỗi kết nối Atlas dạng `mongodb+srv://...`; đặt trong `MONGODB_URI`, không commit.

## 2. Chuyển đổi document ↔ schema

Document dùng `_id`; API trả `id`. Viết hàm chuyển trong service, đừng để `_id` lọt ra response.

```python
from pydantic import BaseModel, ConfigDict


class EntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=False)
    id: UUID
    entry_date: date
    title: str | None
    score: int
    keywords: list[str]
    updated_at: datetime


def entry_out(doc: dict) -> EntryOut:
    return EntryOut(
        id=doc["_id"],
        entry_date=date.fromisoformat(doc["entry_date"]),
        title=doc.get("title"),
        score=doc["score"],
        keywords=[k["keyword"] for k in doc.get("keywords", [])],
        updated_at=doc["updated_at"],
    )
```

- Trong DB, `entry_date` là chuỗi `"YYYY-MM-DD"`. Ở schema là `datetime.date`; chuyển bằng
  `day.isoformat()` / `date.fromisoformat()`. Chuỗi này sắp xếp theo thứ tự thời gian, nên `$gte`/`$lt`/sort đều đúng.
- Thời gian tạo bằng `datetime.now(UTC)`, không dùng `datetime.utcnow()` (không có múi giờ).

## 3. Đọc: lọc theo user_id, projection, phân trang

```python
from pymongo import DESCENDING

ACTIVE = {"deleted_at": None}  # khớp cả document chưa có trường deleted_at


async def get_entry(db: AsyncDatabase, user_id: UUID, day: date) -> dict | None:
    return await db[c.ENTRIES].find_one({"user_id": user_id, "entry_date": day.isoformat(), **ACTIVE})


async def list_entries(db, user_id: UUID, before: date | None, limit: int) -> list[dict]:
    filt = {"user_id": user_id, **ACTIVE}
    if before:
        filt["entry_date"] = {"$lt": before.isoformat()}   # con trỏ = entry_date của bài cuối trang trước
    cursor = db[c.ENTRIES].find(filt).sort("entry_date", DESCENDING).limit(limit + 1)  # +1 để biết còn trang
    return await cursor.to_list()


async def month_cells(db, user_id: UUID, year: int, month: int) -> list[dict]:
    """Lịch tháng: chỉ lấy trường cần thiết, KHÔNG tải title/content (F-02)."""
    start = f"{year:04d}-{month:02d}-01"
    end = f"{year + month // 12:04d}-{month % 12 + 1:02d}-01"
    # Bộ icon lấy từ users.icon_set_id cho mọi ngày (chốt 20/10/2026), entries không lưu bộ icon riêng.
    projection = {"_id": 0, "entry_date": 1, "score": 1, "sub_icon": 1, "flag_color": 1,
                  "photo_count": {"$size": {"$ifNull": ["$photos", []]}}}
    cursor = db[c.ENTRIES].find(
        {"user_id": user_id, "entry_date": {"$gte": start, "$lt": end}, **ACTIVE}, projection
    )
    return await cursor.to_list()
```

- Phân trang theo con trỏ trên `entry_date` (duy nhất cho mỗi người dùng), không dùng `skip`.
- Thống kê (điểm trung bình, phân bố) có thể tính bằng aggregation `$match` → `$group`; dữ liệu một tháng
  rất nhỏ nên tính trong Python cũng được. Chuỗi ngày liên tiếp tính trong Python (`date-timezone-rules`).

## 4. Ghi một ngày: upsert + phát hiện xung đột (`PUT /entries/{date}`)

Một lệnh duy nhất, nguyên tử. Điều kiện xung đột nằm trong filter:

```python
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


async def save_entry(db, user_id: UUID, day: date, data: EntryUpdate, known_updated_at: datetime | None) -> dict:
    now = datetime.now(UTC)
    filt = {"user_id": user_id, "entry_date": day.isoformat()}
    if known_updated_at is not None:
        filt["updated_at"] = known_updated_at        # client đang sửa bản này
    # Chỉ $set các trường đã kiểm tra kiểu trong schema — KHÔNG truyền dict từ request.
    fields = {
        "title": data.title,
        "content": data.content,
        "score": data.score,
        "sub_icon": data.sub_icon,
        "flag_color": data.flag_color,
        "keywords": [{"keyword": k, "norm": keyword_norm(k)} for k in data.keywords],
        # Tìm kiếm F-05 khớp chuỗi con không dấu trên các trường *_norm.
        "title_norm": keyword_norm(data.title) if data.title else None,
        "content_norm": keyword_norm(data.content) if data.content else None,
        "updated_at": now,
        "deleted_at": None,
    }
    try:
        return await db[c.ENTRIES].find_one_and_update(
            filt,
            {"$set": fields, "$setOnInsert": {"_id": uuid4(), "photos": [], "created_at": now}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        # Đã có bài ngày đó nhưng updated_at khác: upsert cố tạo document mới và đụng unique (user_id, entry_date)
        raise ApiError(409, "ENTRY_CONFLICT", "Bài đã được sửa ở nơi khác")
```

- Bài mới (client chưa biết `updated_at`): gửi `known_updated_at=None`. Nếu thực ra đã có bài (tab khác vừa tạo),
  filter vẫn khớp và ghi đè. Muốn chặt hơn thì dùng `insert_one` cho lần tạo đầu và bắt `DuplicateKeyError` → 409.
- `updated_at` frontend gửi lên phải là đúng chuỗi ISO nhận từ API. BSON date lưu tới mili giây nên so sánh khớp.
- Xóa mềm: `update_one(filt, {"$set": {"deleted_at": now, "updated_at": now}})`; khôi phục: `$set deleted_at=None`
  với điều kiện `deleted_at` còn trong 30 ngày.

## 5. Ảnh nhúng: giới hạn số ảnh nguyên tử, xóa theo id

```python
async def add_photo(db, user_id: UUID, day: date, photo: dict, max_photos: int) -> bool:
    """Trả False nếu bài không tồn tại hoặc đã đủ ảnh (kiểm tra và thêm trong một lệnh)."""
    res = await db[c.ENTRIES].update_one(
        {
            "user_id": user_id,
            "entry_date": day.isoformat(),
            **ACTIVE,
            f"photos.{max_photos - 1}": {"$exists": False},  # chưa có ảnh thứ max_photos
        },
        {"$push": {"photos": photo}, "$set": {"updated_at": datetime.now(UTC)}},
    )
    return res.modified_count == 1


async def remove_photo(db, user_id: UUID, photo_id: UUID) -> dict | None:
    """Trả document trước khi xóa (để lấy storage_key xóa trong kho); None nếu không thuộc người dùng → 404."""
    return await db[c.ENTRIES].find_one_and_update(
        {"user_id": user_id, "photos.id": photo_id},
        {"$pull": {"photos": {"id": photo_id}}, "$set": {"updated_at": datetime.now(UTC)}},
        projection={"photos.$": 1},
        return_document=ReturnDocument.BEFORE,
    )
```

- `max_photos` lấy từ `shared/limits.json` (`photos.per_day_max`), không viết cứng.
- Sắp xếp lại ảnh: đọc mảng, sắp xếp trong Python theo danh sách id client gửi (phải đúng tập id hiện có),
  rồi `update_one` với điều kiện `updated_at` cũ để tránh ghi đè đồng thời.

## 6. Tìm kiếm không dấu (F-05)

```python
import re
import unicodedata


def keyword_norm(text: str) -> str:
    """Dùng chung cho lúc ghi và lúc tìm: NFC → bỏ dấu → đ→d → chữ thường → gộp khoảng trắng."""
    text = unicodedata.normalize("NFD", unicodedata.normalize("NFC", text))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D")
    return " ".join(text.lower().split())


def has_diacritics(q: str) -> bool:
    """Gõ có dấu thì so đúng dấu; gõ không dấu thì so không dấu (F-05, thiết kế B7)."""
    q = unicodedata.normalize("NFC", q).lower()
    return keyword_norm(q) != " ".join(q.split())


async def search(db, user_id: UUID, q: str, before: date | None, limit: int) -> list[dict]:
    """F-05: chuỗi con trong tiêu đề, nội dung, từ khóa. Luôn lọc user_id trước (index (user_id, entry_date))."""
    q = " ".join(unicodedata.normalize("NFC", q).split())
    if not q:
        return []
    if has_diacritics(q):
        pattern = {"$regex": re.escape(q), "$options": "i"}   # so đúng dấu trên trường gốc
        fields = ("title", "content", "keywords.keyword")
    else:
        pattern = {"$regex": re.escape(keyword_norm(q))}      # *_norm đã là chữ thường, không dấu
        fields = ("title_norm", "content_norm", "keywords.norm")
    filt = {"user_id": user_id, **ACTIVE, "$or": [{f: pattern} for f in fields]}
    if before:
        filt["entry_date"] = {"$lt": before.isoformat()}
    projection = {"photos": 0, "title_norm": 0, "content_norm": 0}
    cursor = db[c.ENTRIES].find(filt, projection).sort("entry_date", DESCENDING).limit(limit + 1)
    return await cursor.to_list()
```

- Chuỗi con không neo đầu nên không dùng được index trên trường văn bản; chi phí chấp nhận được vì đã thu hẹp theo
  `user_id` (vài nghìn trang mỗi người). Luôn `re.escape` để chặn chèn regex và ReDoS.
- Nhánh không dấu so trên `*_norm` (đã chữ thường); nhánh có dấu cần `$options: "i"` trên trường gốc.
- Không ghi `q` vào log hay Sentry (là nội dung nhật ký).
- Hàm `keyword_norm` đặt ở `app/core/text.py` (xem `docs/Project_Structure.md`) và có unit test với tiếng Việt có dấu.

## 7. Lỗi từ MongoDB → lỗi chuẩn

| Exception | Khi nào | Trả về |
| --- | --- | --- |
| `pymongo.errors.DuplicateKeyError` | vi phạm index unique | 409 (xung đột) hoặc bỏ qua nếu thao tác chạy lại được |
| `pymongo.errors.WriteError` mã 121 | document không qua validator | lỗi lập trình: log loại lỗi, trả 500; schema Pydantic lẽ ra đã chặn |
| `pymongo.errors.ServerSelectionTimeoutError` | không kết nối được DB | 503 `DB_UNAVAILABLE` |

Không log `exc.details` hay `errInfo` nguyên văn: chúng có thể chứa giá trị người dùng nhập.

## 8. Thao tác nhiều collection (xóa tài khoản)

MVP không dùng transaction. Viết theo thứ tự để có thể chạy lại khi gián đoạn, và đặt dấu trên user trước:

```python
async def delete_account(db, s3, user_id: UUID) -> None:
    now = datetime.now(UTC)
    await db[c.USERS].update_one({"_id": user_id}, {"$set": {"deleted_at": now}})  # 1. chặn đăng nhập
    await db[c.USER_SESSIONS].delete_many({"user_id": user_id})                     # 2. thu hồi phiên
    await delete_prefix(s3, f"{user_id}/")                                          # 3. ảnh trong kho
    for name in (c.ENTRIES, c.USER_ITEMS, c.FEEDBACK):                              # 4. dữ liệu
        await db[name].delete_many({"user_id": user_id})
    await db[c.USERS].delete_one({"_id": user_id})                                  # 5. cuối cùng
```

Một tác vụ định kỳ quét user có `deleted_at` mà còn dữ liệu để chạy lại từ bước 2.

## 9. Những điều không làm

- Không đưa nguyên dict từ request vào filter/update (`{"user_id": ..., **body}`), kể cả "chỉ để lọc". Một body
  `{"title": {"$ne": null}}` sẽ thành toán tử. Luôn dựng từ trường của schema Pydantic đã khai báo kiểu.
- Không dùng `$where`, `$function`, `$accumulator` (chạy JavaScript trên server).
- Không dùng `skip()` để phân trang dữ liệu lớn; dùng con trỏ theo `entry_date`.
- Không đọc cả document khi chỉ cần vài trường (lịch, pixels): luôn có projection.
- Không gọi hàm sync chặn (boto3, đọc file lớn) trực tiếp trong endpoint `async def`; bọc bằng `anyio.to_thread.run_sync`.
