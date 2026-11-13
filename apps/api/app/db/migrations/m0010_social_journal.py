"""Sổ chung và bạn bè (ADR 0007, Giai đoạn 1): ba collection mới + `users.friend_code`.

- `shared_journals`: một cuốn sổ cho mỗi cặp. `member_key` = hai uuid đã sắp xếp, index unique
  (partial, chỉ `scope == "pair"`) → hai request cùng lúc chỉ tạo được một cuốn sổ.
- `shared_entries`: một mục = một người, một ngày, trong một cuốn sổ. Unique
  (journal_id, author_id, entry_date) — cùng bất biến "một ngày một trang" của `entries`.
- `friendships`: yêu cầu kết bạn → chấp nhận → sinh sổ chung.
- `users.friend_code`: mã bạn 10 ký tự, index unique sparse (nhiều user có thể chưa có mã).
- `deletion_log`: thêm loại `"social"` để ghi nhận việc dọn dữ liệu xã hội.

Chạy lại được: có collection thì collMod, chưa có thì tạo; index tên cố định; validator của
`users` dựng lại từ m0006 (giữ đúng chuỗi collMod của các migration trước).
"""

from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.db.migrations import m0006_user_avatar_key

ID = "0010_social_journal"

_UUID = {"bsonType": "binData"}
_DATE = {"bsonType": "date"}
_OPT_DATE = {"bsonType": ["date", "null"]}
_OPT_STR = {"bsonType": ["string", "null"]}
_DAY = {"bsonType": "string", "pattern": r"^\d{4}-\d{2}-\d{2}$"}
_COUNT = {"bsonType": ["int", "long"], "minimum": 0}

# Số ký tự mã bạn: 10. Bảng chữ không nhầm (không 0/O, 1/I/l) — xem services/friendships.py.
FRIEND_CODE_LEN = 10

SHARED_JOURNALS_VALIDATOR = {
    "bsonType": "object",
    "required": ["_id", "scope", "mode", "status", "member_key", "members", "created_by", "created_at"],
    "properties": {
        "_id": _UUID,
        "scope": {"enum": ["pair", "group"]},
        "mode": {"enum": ["together", "alternating"]},
        "status": {"enum": ["active", "ended"]},
        # Hai uuid thành viên đã sắp xếp, nối bằng "|". Rỗng với scope "group" (chưa dùng ở M1).
        "member_key": {"bsonType": "string"},
        "members": {
            "bsonType": "array",
            "minItems": 2,
            "items": {
                "bsonType": "object",
                "required": ["user_id", "role", "joined_at"],
                "properties": {
                    "user_id": _UUID,
                    "role": {"enum": ["member", "owner"]},
                    "joined_at": _DATE,
                },
            },
        },
        "created_by": _UUID,
        "created_at": _DATE,
        "updated_at": _DATE,
        "ended_at": _OPT_DATE,
    },
}

SHARED_ENTRIES_VALIDATOR = {
    "bsonType": "object",
    "required": [
        "_id",
        "journal_id",
        "author_id",
        "entry_date",
        "score",
        "icon_set_id",
        "created_at",
        "updated_at",
    ],
    "properties": {
        "_id": _UUID,
        "journal_id": _UUID,
        "author_id": _UUID,
        "entry_date": _DAY,
        "score": {"bsonType": "int", "minimum": 1, "maximum": 5},
        "icon_set_id": {"bsonType": "string"},
        "title": _OPT_STR,
        "content": _OPT_STR,
        "sub_icon": _OPT_STR,
        "flag_color": {"bsonType": ["string", "null"], "pattern": "^#[0-9A-Fa-f]{6}$"},
        "photos": {
            "bsonType": "array",
            "items": {
                "bsonType": "object",
                "required": [
                    "id",
                    "storage_key",
                    "thumb_key",
                    "width",
                    "height",
                    "size_bytes",
                    "position",
                    "created_at",
                ],
                "properties": {
                    "id": _UUID,
                    "storage_key": {"bsonType": "string"},
                    "thumb_key": {"bsonType": "string"},
                    "width": {"bsonType": "int", "minimum": 1},
                    "height": {"bsonType": "int", "minimum": 1},
                    "size_bytes": {"bsonType": ["int", "long"], "minimum": 1},
                    "position": {"bsonType": "int", "minimum": 0},
                    "created_at": _DATE,
                },
            },
        },
        "created_at": _DATE,
        "updated_at": _DATE,
        "deleted_at": _OPT_DATE,
    },
}

FRIENDSHIPS_VALIDATOR = {
    "bsonType": "object",
    "required": ["_id", "requester_id", "addressee_id", "status", "created_at"],
    "properties": {
        "_id": _UUID,
        "requester_id": _UUID,
        "addressee_id": _UUID,
        "status": {"enum": ["pending", "accepted", "declined", "ended"]},
        # Sổ chung sinh ra khi quan hệ được chấp nhận.
        "journal_id": {"bsonType": ["binData", "null"]},
        "created_at": _DATE,
        "responded_at": _OPT_DATE,
    },
}

SHARED_JOURNALS_INDEXES = [
    # Một cặp chỉ có một cuốn sổ. Partial: chỉ áp cho scope "pair" (M1).
    IndexModel(
        [("member_key", ASCENDING)],
        unique=True,
        name="uq_member_key",
        partialFilterExpression={"scope": "pair"},
    ),
    IndexModel([("members.user_id", ASCENDING)], name="ix_member_user"),
    IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="ix_status_created"),
]

SHARED_ENTRIES_INDEXES = [
    # Mỗi người mỗi ngày tối đa một mục trong một cuốn sổ.
    IndexModel(
        [("journal_id", ASCENDING), ("author_id", ASCENDING), ("entry_date", DESCENDING)],
        unique=True,
        name="uq_journal_author_date",
    ),
    IndexModel([("journal_id", ASCENDING), ("entry_date", DESCENDING)], name="ix_journal_date"),
    IndexModel([("author_id", ASCENDING), ("entry_date", DESCENDING)], name="ix_author_date"),
]

FRIENDSHIPS_INDEXES = [
    IndexModel(
        [("addressee_id", ASCENDING), ("status", ASCENDING)],
        name="ix_addressee_status",
    ),
    IndexModel([("requester_id", ASCENDING)], name="ix_requester"),
    IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="ix_status_created"),
]


def users_validator() -> dict:
    """Validator của `users` dựng lại từ m0006 (giữ chuỗi collMod), thêm `friend_code`."""
    schema = m0006_user_avatar_key.users_validator()
    schema["properties"]["friend_code"] = {"bsonType": "string"}
    return schema


async def _ensure(db: AsyncDatabase, name: str, validator: dict, indexes: list[IndexModel]) -> None:
    if name in await db.list_collection_names():
        await db.command({"collMod": name, "validator": validator, "validationLevel": "strict"})
    else:
        await db.create_collection(
            name, validator=validator, validationLevel="strict", validationAction="error"
        )
    await db[name].create_indexes(indexes)


async def up(db: AsyncDatabase) -> None:
    await db.command({"collMod": c.USERS, "validator": {"$jsonSchema": users_validator()}})
    # Unique sparse: nhiều user chưa có mã bạn thì không đụng nhau; có mã thì không trùng mã.
    await db[c.USERS].create_index(
        [("friend_code", ASCENDING)], unique=True, name="uq_friend_code", sparse=True
    )

    await _ensure(db, c.SHARED_JOURNALS, {"$jsonSchema": SHARED_JOURNALS_VALIDATOR}, SHARED_JOURNALS_INDEXES)
    await _ensure(db, c.SHARED_ENTRIES, {"$jsonSchema": SHARED_ENTRIES_VALIDATOR}, SHARED_ENTRIES_INDEXES)
    await _ensure(db, c.FRIENDSHIPS, {"$jsonSchema": FRIENDSHIPS_VALIDATOR}, FRIENDSHIPS_INDEXES)

    # `deletion_log` thêm loại "social" (dọn sổ chung, quan hệ, mục chung).
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
                        "pages": _COUNT,
                        "photos": _COUNT,
                        "share_links": _COUNT,
                        "feedback_anonymized": _COUNT,
                        "journals": _COUNT,
                        "shared_entries": _COUNT,
                        "friendships": _COUNT,
                    },
                }
            },
            "validationLevel": "strict",
        }
    )
