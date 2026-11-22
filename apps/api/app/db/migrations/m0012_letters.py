"""Thư gửi tương lai (GĐ2 giữ chân): nội dung chỉ mở ra được từ `reveal_date`.

- `letters`: thư = nội dung chữ + ngày mở. Tối đa 1 thư cho mỗi `authored_date` của một người
  (chặn 1 thư/ngày bằng unique index `(user_id, authored_date)` — ADR 0001 "không transaction,
  dựa unique index, xử lý race ở service"). `reveal_date` là ngày mở (tương lai lúc ghi); trạng thái
  "đến hạn" tính lúc đọc (không có job nền — app không có scheduler, GĐ2 không cần).
- Chỉ chữ, không ảnh/flag: thư tối giản, không đụng storage.

Chạy lại được: create_collection + index tên cố định (collMod nếu đã tồn tại).
"""

from pymongo import ASCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c

ID = "0012_letters"

_UUID = {"bsonType": "binData"}

LETTERS_VALIDATOR = {
    "bsonType": "object",
    "required": ["_id", "user_id", "content", "reveal_date", "authored_date", "created_at"],
    "additionalProperties": False,
    "properties": {
        "_id": _UUID,
        "user_id": _UUID,
        "content": {"bsonType": "string", "minLength": 1},
        # Ngày mở (tương lai), ngày ghi và thời điểm tạo — theo múi giờ người dùng / UTC.
        "reveal_date": {"bsonType": "string"},
        "authored_date": {"bsonType": "string"},
        "created_at": {"bsonType": "date"},
    },
}

LETTERS_INDEXES = [
    # Tối đa 1 thư cho mỗi ngày ghi (race-safe, xử lý DuplicateKeyError ở service).
    IndexModel(
        [("user_id", ASCENDING), ("authored_date", ASCENDING)],
        unique=True,
        name="uq_user_authored",
    ),
    # Tra các thư của một người sắp/đã đến hạn (màn liệt kê thư).
    IndexModel([("user_id", ASCENDING), ("reveal_date", ASCENDING)], name="ix_user_reveal"),
]


async def up(db: AsyncDatabase) -> None:
    if c.LETTERS in await db.list_collection_names():
        await db.command(
            {
                "collMod": c.LETTERS,
                "validator": {"$jsonSchema": LETTERS_VALIDATOR},
                "validationLevel": "strict",
            }
        )
    else:
        await db.create_collection(
            c.LETTERS,
            validator={"$jsonSchema": LETTERS_VALIDATOR},
            validationLevel="strict",
            validationAction="error",
        )
    await db[c.LETTERS].create_indexes(LETTERS_INDEXES)
