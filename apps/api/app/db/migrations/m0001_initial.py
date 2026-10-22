"""Collection, validator ($jsonSchema) và index ban đầu cho MVP.

Validator chỉ kiểm tra cấu trúc và miền giá trị cố định (kiểu, điểm 1–5, enum...). Giới hạn độ dài, số ảnh,
số từ khóa nằm trong shared/limits.json và được kiểm tra ở schema Pydantic, không viết cứng ở đây.
"""

from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c

ID = "0001_initial"

_UUID = {"bsonType": "binData"}
_DATE = {"bsonType": "date"}
_OPT_DATE = {"bsonType": ["date", "null"]}
_OPT_STR = {"bsonType": ["string", "null"]}
_DAY = {"bsonType": "string", "pattern": r"^\d{4}-\d{2}-\d{2}$"}  # ngày địa phương "YYYY-MM-DD"

VALIDATORS: dict[str, dict] = {
    c.USERS: {
        "bsonType": "object",
        "required": ["_id", "google_sub", "email", "display_name", "timezone", "account_tier", "joined_at"],
        "properties": {
            "_id": _UUID,
            "google_sub": {"bsonType": "string"},
            "email": {"bsonType": "string"},
            "display_name": {"bsonType": "string"},
            "avatar_url": _OPT_STR,
            "timezone": {"bsonType": "string"},
            "account_tier": {"enum": ["beta", "free", "premium"]},
            "joined_at": _DATE,
            "deleted_at": _OPT_DATE,
        },
    },
    c.USER_SESSIONS: {
        "bsonType": "object",
        "required": ["_id", "user_id", "created_at", "expires_at"],
        "properties": {
            "_id": {"bsonType": "binData"},  # SHA-256 của token, không lưu token gốc
            "user_id": _UUID,
            "created_at": _DATE,
            "expires_at": _DATE,
        },
    },
    c.ENTRIES: {
        "bsonType": "object",
        "required": ["_id", "user_id", "entry_date", "score", "icon_set_id", "created_at", "updated_at"],
        "properties": {
            "_id": _UUID,
            "user_id": _UUID,
            "entry_date": _DAY,
            "title": _OPT_STR,
            "content": _OPT_STR,
            "score": {"bsonType": "int", "minimum": 1, "maximum": 5},
            "icon_set_id": {"bsonType": "string"},
            "sub_icon": _OPT_STR,
            "flag_color": {"bsonType": ["string", "null"], "pattern": "^#[0-9A-Fa-f]{6}$"},
            "keywords": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["keyword", "norm"],
                    "properties": {"keyword": {"bsonType": "string"}, "norm": {"bsonType": "string"}},
                },
            },
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
    },
    c.USER_ITEMS: {
        "bsonType": "object",
        "required": ["_id", "user_id", "item_id", "source", "acquired_at"],
        "properties": {
            "user_id": _UUID,
            "item_id": {"bsonType": "string"},
            "source": {"enum": ["beta", "free", "purchase", "reward"]},
            "acquired_at": _DATE,
        },
    },
    c.FEEDBACK: {
        "bsonType": "object",
        "required": ["_id", "user_id", "message", "created_at"],
        "properties": {
            "_id": _UUID,
            "user_id": _UUID,
            "message": {"bsonType": "string"},
            "created_at": _DATE,
        },
    },
}

INDEXES: dict[str, list[IndexModel]] = {
    c.USERS: [IndexModel([("google_sub", ASCENDING)], unique=True, name="uq_google_sub")],
    c.USER_SESSIONS: [
        IndexModel([("user_id", ASCENDING)], name="ix_user_id"),
        # MongoDB tự xóa phiên hết hạn (chạy nền khoảng mỗi 60 giây). Code vẫn phải kiểm tra expires_at.
        IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0, name="ttl_expires_at"),
    ],
    c.ENTRIES: [
        # Mỗi người tối đa 1 nhật ký mỗi ngày (F-01); cũng phục vụ dòng thời gian, lịch, pixels.
        IndexModel([("user_id", ASCENDING), ("entry_date", DESCENDING)], unique=True, name="uq_user_date"),
        # Tìm kiếm theo đầu từ khóa (F-05): regex neo đầu "^..." dùng được index này.
        IndexModel(
            [("user_id", ASCENDING), ("keywords.norm", ASCENDING), ("entry_date", DESCENDING)],
            name="ix_user_keyword_date",
        ),
        # DELETE /photos/{id}
        IndexModel([("user_id", ASCENDING), ("photos.id", ASCENDING)], name="ix_user_photo"),
        # Tác vụ dọn bài xóa mềm sau 30 ngày. KHÔNG dùng TTL: phải xóa cả ảnh trong kho trước.
        IndexModel(
            [("deleted_at", ASCENDING)],
            partialFilterExpression={"deleted_at": {"$type": "date"}},
            name="ix_deleted_at",
        ),
    ],
    c.USER_ITEMS: [
        IndexModel([("user_id", ASCENDING), ("item_id", ASCENDING)], unique=True, name="uq_user_item")
    ],
    c.FEEDBACK: [IndexModel([("user_id", ASCENDING)], name="ix_user_id")],
}


async def up(db: AsyncDatabase) -> None:
    existing = set(await db.list_collection_names())
    for name, schema in VALIDATORS.items():
        validator = {"$jsonSchema": schema}
        if name in existing:
            await db.command(
                {"collMod": name, "validator": validator, "validationLevel": "strict"},
            )
        else:
            await db.create_collection(
                name, validator=validator, validationLevel="strict", validationAction="error"
            )
    for name, indexes in INDEXES.items():
        await db[name].create_indexes(indexes)
