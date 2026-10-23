"""users: thêm `custom_flag_colors` — màu cờ người dùng tự thêm từ bảng pha màu (chốt Q6, 23/10/2026).

- Mảng mã "#RRGGBB" chữ hoa, theo thứ tự thêm; người dùng cũ nhận mảng rỗng.
- Số màu tối đa nằm ở `shared/limits.json` (`profile.custom_flag_colors_max`), không đưa vào validator.
- Chưa đưa vào `required` (làm ở migration sau khi mọi document đã có).

Chạy lại được: validator đặt bằng collMod (dựng lại từ m0002), chỉ điền document còn thiếu trường.
"""

from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.db.migrations import m0002_user_icon_set_onboarded

ID = "0005_user_custom_flag_colors"


def users_validator() -> dict:
    schema = m0002_user_icon_set_onboarded.users_validator()
    schema["properties"]["custom_flag_colors"] = {
        "bsonType": "array",
        "items": {"bsonType": "string", "pattern": "^#[0-9A-F]{6}$"},
    }
    return schema


async def up(db: AsyncDatabase) -> None:
    await db.command({"collMod": c.USERS, "validator": {"$jsonSchema": users_validator()}})
    await db[c.USERS].update_many(
        {"custom_flag_colors": {"$exists": False}}, {"$set": {"custom_flag_colors": []}}
    )
