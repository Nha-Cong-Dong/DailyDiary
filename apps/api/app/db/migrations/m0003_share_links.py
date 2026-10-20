"""share_links: link chia sẻ công khai một ngày nhật ký (thiết kế B8 · Chia sẻ).

- Mỗi người tối đa một link cho mỗi ngày. Tắt link = xóa document; bật lại tạo document mới với token mới,
  nên link cũ không bao giờ mở lại được.
- `token` lưu dạng gốc (không băm) vì chủ trang cần xem lại và sao chép link ở màn "Trang đang chia sẻ".
  Băm cũng không bảo vệ thêm được gì: ai đọc được collection này cũng đọc được `entries` (nội dung gốc).
- Nội dung không chép sang đây: trang công khai đọc thẳng từ `entries` mỗi lần mở, nên sửa hay xóa mềm
  nhật ký có hiệu lực ngay.

Chạy lại được: tạo collection nếu chưa có, ngược lại collMod; index đặt tên cố định.
"""

from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c

ID = "0003_share_links"

_BOOL = {"bsonType": "bool"}
SHOW_FIELDS = (
    "show_name",
    "show_score",
    "show_sub_icon",
    "show_flag",
    "show_title",
    "show_content",
    "show_keywords",
)

VALIDATOR = {
    "bsonType": "object",
    "required": [
        "_id",
        "user_id",
        "entry_date",
        "token",
        *SHOW_FIELDS,
        "photo_ids",
        "created_at",
        "updated_at",
    ],
    "properties": {
        "_id": {"bsonType": "binData"},
        "user_id": {"bsonType": "binData"},
        "entry_date": {"bsonType": "string", "pattern": r"^\d{4}-\d{2}-\d{2}$"},
        "token": {"bsonType": "string", "pattern": "^[A-Za-z0-9_-]{22,64}$"},
        **{name: _BOOL for name in SHOW_FIELDS},
        "photo_ids": {"bsonType": "array", "items": {"bsonType": "binData"}},
        "created_at": {"bsonType": "date"},
        "updated_at": {"bsonType": "date"},
    },
}

INDEXES = [
    # Một link mỗi ngày; cũng phục vụ danh sách "Trang đang chia sẻ" (mới nhất trước).
    IndexModel([("user_id", ASCENDING), ("entry_date", DESCENDING)], unique=True, name="uq_user_date"),
    # Trang công khai tìm theo token.
    IndexModel([("token", ASCENDING)], unique=True, name="uq_token"),
]


async def up(db: AsyncDatabase) -> None:
    validator = {"$jsonSchema": VALIDATOR}
    if c.SHARE_LINKS in await db.list_collection_names():
        await db.command({"collMod": c.SHARE_LINKS, "validator": validator, "validationLevel": "strict"})
    else:
        await db.create_collection(
            c.SHARE_LINKS, validator=validator, validationLevel="strict", validationAction="error"
        )
    await db[c.SHARE_LINKS].create_indexes(INDEXES)
