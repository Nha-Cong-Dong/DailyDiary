"""users: thêm `avatar_key` — ảnh đại diện tự tải lên kho ảnh (F-04, Bước 7).

- Key `{user_id}/avatar/{upload_id}.webp|jpg`; có thì thay ảnh Google (`avatar_url`) khi hiển thị.
- string | null, không bắt buộc (người dùng cũ không có trường này = dùng ảnh Google).

Chạy lại được: chỉ đặt validator bằng collMod (dựng lại từ m0005).
"""

from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.db.migrations import m0005_user_custom_flag_colors

ID = "0006_user_avatar_key"


def users_validator() -> dict:
    schema = m0005_user_custom_flag_colors.users_validator()
    schema["properties"]["avatar_key"] = {"bsonType": ["string", "null"]}
    return schema


async def up(db: AsyncDatabase) -> None:
    await db.command({"collMod": c.USERS, "validator": {"$jsonSchema": users_validator()}})
