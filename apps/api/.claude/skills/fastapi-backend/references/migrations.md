# Migration MongoDB

Dự án không dùng thư viện migration ngoài; runner nhỏ ở `app/db/migrate.py` đủ cho validator, index và cập nhật
dữ liệu. Quy trình đầy đủ khi đổi cấu trúc dữ liệu: skill `/add-db-change`.

## Cấu trúc

```
app/db/
├── migrate.py                 # runner + danh sách MIGRATIONS theo thứ tự
└── migrations/
    ├── m0001_initial.py       # collection, $jsonSchema validator, index ban đầu
    └── m0002_<mo_ta>.py       # migration tiếp theo
```

Mỗi migration:

```python
from pymongo.asynchronous.database import AsyncDatabase

ID = "0002_add_entry_mood_tags"


async def up(db: AsyncDatabase) -> None:
    ...
```

Thêm module vào `MIGRATIONS = [m0001_initial, m0002_add_entry_mood_tags]` trong `migrate.py`.

## Quy tắc

- **Chỉ tiến.** Không có downgrade. Muốn hoàn tác thì viết migration mới.
- **Chạy lại được.** Runner ghi `_id` migration vào `_migrations` sau khi `up()` xong; nếu `up()` lỗi giữa chừng,
  lần sau sẽ chạy lại từ đầu, nên mọi bước phải an toàn khi chạy hai lần:
  - `create_index`/`create_indexes` với `name=` cố định (đã có thì bỏ qua).
  - Validator: `create_collection(..., validator=...)` nếu chưa có, ngược lại `collMod`.
  - Cập nhật dữ liệu: filter chỉ khớp document chưa được cập nhật (vd. `{"new_field": {"$exists": False}}`).
- **Không sửa migration đã chạy** trên môi trường nào; tạo migration mới.
- **Không đưa giới hạn từ `shared/limits.json` vào validator.** Validator chỉ chứa ràng buộc không đổi
  (kiểu, điểm 1–5, enum, mẫu `#RRGGBB`).
- Chạy ở bước triển khai: `uv run python -m app.db.migrate`. Không chạy trong `lifespan` (nhiều worker).
- Index lớn trên collection nhiều dữ liệu: MongoDB 4.2+ tạo index không khóa collection, nhưng vẫn tốn tài nguyên;
  với dữ liệu MVP (< 20 người) không đáng lo.

## Mẫu: thêm trường mới vào document đã có

```python
async def up(db):
    # 1. Cho phép trường mới (chưa bắt buộc)
    schema = VALIDATORS_V2[c.ENTRIES]          # copy validator cũ, thêm "mood_tags" vào properties
    await db.command({"collMod": c.ENTRIES, "validator": {"$jsonSchema": schema}})
    # 2. Điền giá trị cho document cũ (chạy lại được)
    await db[c.ENTRIES].update_many({"mood_tags": {"$exists": False}}, {"$set": {"mood_tags": []}})
    # 3. Index nếu cần
    await db[c.ENTRIES].create_index([("user_id", 1), ("mood_tags", 1)], name="ix_user_mood_tags")
```

Đưa trường vào `required` ở migration **sau**, khi chắc chắn mọi document đã có trường đó.

## Mẫu: đổi tên trường

```python
async def up(db):
    await db[c.ENTRIES].update_many({"old_name": {"$exists": True}}, {"$rename": {"old_name": "new_name"}})
```

Code đọc phải chấp nhận cả hai tên trong thời gian triển khai (deploy code mới trước, migration sau), hoặc dừng
ghi trong lúc chạy.

## Kiểm tra

- `uv run python -m app.db.migrate` chạy hai lần: lần hai in "Không có migration mới."
- `tests/db/`: index tồn tại, validator chặn dữ liệu sai, `run_migrations()` lần hai trả `[]`.
- `tests/conftest.py` xóa DB `*_test` và chạy toàn bộ migration ở đầu mỗi phiên test, nên migration hỏng sẽ làm
  mọi test lỗi ngay.
- Xem validator hiện tại: `db.get_collection_infos({name: "entries"})` trong `mongosh`.
