"""Mời mở sổ chung (ADR 0007, sửa theo phản hồi): thành bạn ≠ có sổ chung.

- `journal_requests`: lời mời mở sổ chung giữa hai người bạn. Hai bên phải chấp nhận (ai cũng
  được bấm) thì mới tạo cuốn sổ — không tự sinh sổ lúc chấp nhận yêu cầu kết bạn.
- `users.last_active`: thời điểm dùng app gần nhất (cập nhật ở `get_current_user`), dùng để hiện
  "lần hoạt động" (vừa xong / X phút trước / HHh / ngày).

Chạy lại được: collMod + index tên cố định; users validator dựng lại từ m0010, thêm `last_active`.
"""

from pymongo import ASCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.db.migrations import m0010_social_journal

ID = "0011_journal_requests"

_UUID = {"bsonType": "binData"}
_DATE = {"bsonType": "date"}

JOURNAL_REQUESTS_VALIDATOR = {
    "bsonType": "object",
    "required": ["_id", "requester_id", "addressee_id", "status", "created_at"],
    "properties": {
        "_id": _UUID,
        "requester_id": _UUID,
        "addressee_id": _UUID,
        "status": {"enum": ["pending", "accepted", "declined"]},
        "created_at": _DATE,
        "responded_at": {"bsonType": ["date", "null"]},
        # Cuốn sổ sinh ra khi hai bên chấp nhận (đặt ở bước accept, nullable để hợp validator).
        "journal_id": {"bsonType": ["binData", "null"]},
    },
}

JOURNAL_REQUESTS_INDEXES = [
    IndexModel([("addressee_id", ASCENDING), ("status", ASCENDING)], name="ix_addressee_status"),
    IndexModel([("requester_id", ASCENDING)], name="ix_requester"),
    # Một hướng (A→B) chỉ một lời mời; hai hướng cùng lúc chặn ở service (cross-direction).
    IndexModel(
        [("requester_id", ASCENDING), ("addressee_id", ASCENDING)],
        unique=True,
        name="uq_pair_directed",
    ),
]


def users_validator() -> dict:
    """Validator của `users` dựng lại từ m0010 (giữ chuỗi collMod), thêm `last_active`."""
    schema = m0010_social_journal.users_validator()
    schema["properties"]["last_active"] = {"bsonType": ["date", "null"]}
    return schema


async def up(db: AsyncDatabase) -> None:
    await db.command({"collMod": c.USERS, "validator": {"$jsonSchema": users_validator()}})

    if c.JOURNAL_REQUESTS in await db.list_collection_names():
        await db.command(
            {
                "collMod": c.JOURNAL_REQUESTS,
                "validator": {"$jsonSchema": JOURNAL_REQUESTS_VALIDATOR},
                "validationLevel": "strict",
            }
        )
    else:
        await db.create_collection(
            c.JOURNAL_REQUESTS,
            validator={"$jsonSchema": JOURNAL_REQUESTS_VALIDATOR},
            validationLevel="strict",
            validationAction="error",
        )
    await db[c.JOURNAL_REQUESTS].create_indexes(JOURNAL_REQUESTS_INDEXES)

    # `deletion_log` (m0009) thêm trường đếm lời mời mở sổ; giữ chuỗi collMod (m0009 → m0010 → m0011).
    await db.command(
        {
            "collMod": c.DELETION_LOG,
            "validator": {
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["_id", "kind", "at", "pages", "photos", "share_links"],
                    "additionalProperties": False,
                    "properties": {
                        "_id": _UUID,
                        "kind": {"enum": ["journal", "account", "trash", "social"]},
                        "at": _DATE,
                        "pages": {"bsonType": ["int", "long"], "minimum": 0},
                        "photos": {"bsonType": ["int", "long"], "minimum": 0},
                        "share_links": {"bsonType": ["int", "long"], "minimum": 0},
                        "feedback_anonymized": {"bsonType": ["int", "long"], "minimum": 0},
                        "journals": {"bsonType": ["int", "long"], "minimum": 0},
                        "shared_entries": {"bsonType": ["int", "long"], "minimum": 0},
                        "friendships": {"bsonType": ["int", "long"], "minimum": 0},
                        "journal_invites": {"bsonType": ["int", "long"], "minimum": 0},
                    },
                }
            },
            "validationLevel": "strict",
        }
    )
