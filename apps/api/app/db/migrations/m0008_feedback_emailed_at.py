"""feedback: thêm `emailed_at` — lúc đã gửi email góp ý về hộp thư Jotly (Bước 12, F-09).

- date | null, không bắt buộc. null = chưa gửi được (chưa cấu hình SMTP hoặc gửi lỗi) để gửi lại sau.

Chạy lại được: chỉ đặt validator bằng collMod (dựng lại từ m0001).
"""

import copy

from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.db.migrations import m0001_initial

ID = "0008_feedback_emailed_at"


def feedback_validator() -> dict:
    schema = copy.deepcopy(m0001_initial.VALIDATORS[c.FEEDBACK])
    schema["properties"]["emailed_at"] = {"bsonType": ["date", "null"]}
    return schema


async def up(db: AsyncDatabase) -> None:
    await db.command({"collMod": c.FEEDBACK, "validator": {"$jsonSchema": feedback_validator()}})
