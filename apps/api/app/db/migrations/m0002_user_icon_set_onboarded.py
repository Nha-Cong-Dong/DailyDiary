"""users: thêm bộ icon (áp cho mọi ngày) và mốc hoàn tất 3 bước lần đầu.

- `icon_set_id`: id trong shared/icons.json; người dùng cũ nhận `default_icon_set`.
- `onboarded_at`: date | null. Null thì sau khi đăng nhập, frontend đưa người dùng tới /onboarding.
  Người dùng cũ (có trước migration này) coi như đã qua lần đầu: đặt bằng `joined_at`.

Chạy lại được: chỉ cập nhật document còn thiếu trường; validator đặt bằng collMod.
Hai trường chưa đưa vào `required` (làm ở migration sau khi mọi document đã có).
"""

import copy

from pymongo.asynchronous.database import AsyncDatabase

from app.core.catalog import get_icons
from app.db import collections as c
from app.db.migrations import m0001_initial

ID = "0002_user_icon_set_onboarded"


def users_validator() -> dict:
    schema = copy.deepcopy(m0001_initial.VALIDATORS[c.USERS])
    schema["properties"]["icon_set_id"] = {"bsonType": "string"}
    schema["properties"]["onboarded_at"] = {"bsonType": ["date", "null"]}
    return schema


async def up(db: AsyncDatabase) -> None:
    await db.command({"collMod": c.USERS, "validator": {"$jsonSchema": users_validator()}})
    default_set = get_icons().default_icon_set
    await db[c.USERS].update_many({"icon_set_id": {"$exists": False}}, {"$set": {"icon_set_id": default_set}})
    await db[c.USERS].update_many(
        {"onboarded_at": {"$exists": False}}, [{"$set": {"onboarded_at": "$joined_at"}}]
    )
