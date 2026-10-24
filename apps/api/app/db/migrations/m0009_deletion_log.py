"""deletion_log: ghi nhận mỗi lần xóa dữ liệu / xóa tài khoản, KHÔNG chứa dữ liệu cá nhân
(Bước 12, 24/10/2026).

- Chỉ có loại thao tác, thời điểm (UTC) và số lượng đã xóa; không có user_id, email, tên hay nội dung —
  để thống kê và chứng minh việc xóa đã diễn ra, mà không giữ lại gì nối được về người dùng.
- `kind`: "journal" (xóa toàn bộ dữ liệu) | "account" (xóa tài khoản); Bước 13 thêm "trash"
  (dọn thùng rác 30 ngày).
- Số 0008 để dành cho migration `feedback` của nhánh góp ý.

Chạy lại được: có collection thì collMod, chưa có thì tạo; index tên cố định.
"""

from pymongo import DESCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c

ID = "0009_deletion_log"

_COUNT = {"bsonType": ["int", "long"], "minimum": 0}
VALIDATOR = {
    "bsonType": "object",
    "required": ["_id", "kind", "at", "pages", "photos", "share_links"],
    "additionalProperties": False,
    "properties": {
        "_id": {"bsonType": "binData"},
        "kind": {"enum": ["journal", "account", "trash"]},
        "at": {"bsonType": "date"},
        "pages": _COUNT,
        "photos": _COUNT,
        "share_links": _COUNT,
        "feedback_anonymized": _COUNT,
    },
}
INDEXES = [IndexModel([("at", DESCENDING)], name="ix_at")]


async def up(db: AsyncDatabase) -> None:
    validator = {"$jsonSchema": VALIDATOR}
    if c.DELETION_LOG in await db.list_collection_names():
        await db.command({"collMod": c.DELETION_LOG, "validator": validator, "validationLevel": "strict"})
    else:
        await db.create_collection(
            c.DELETION_LOG, validator=validator, validationLevel="strict", validationAction="error"
        )
    await db[c.DELETION_LOG].create_indexes(INDEXES)
