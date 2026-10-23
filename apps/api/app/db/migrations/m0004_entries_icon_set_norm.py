"""entries: bỏ `icon_set_id` khỏi trường bắt buộc, thêm `title_norm` / `content_norm`.

- Bộ icon lấy từ hồ sơ (`users.icon_set_id`) và vẽ cho mọi ngày (chốt 20/10/2026), nên nhật ký
  không lưu bộ icon riêng nữa. Document cũ còn trường này thì để nguyên (validator vẫn cho phép).
- `title_norm`, `content_norm`: tiêu đề/nội dung chữ thường, không dấu, ghi cùng lúc với nhật ký để
  tìm kiếm F-05 (Bước 11) khớp chuỗi con không dấu. Document cũ được điền ở migration của Bước 11.

Chạy lại được: chỉ đặt validator bằng collMod.
"""

import copy

from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.db.migrations import m0001_initial

ID = "0004_entries_icon_set_norm"

_OPT_STR = {"bsonType": ["string", "null"]}


def entries_validator() -> dict:
    schema = copy.deepcopy(m0001_initial.VALIDATORS[c.ENTRIES])
    schema["required"] = [name for name in schema["required"] if name != "icon_set_id"]
    schema["properties"]["title_norm"] = _OPT_STR
    schema["properties"]["content_norm"] = _OPT_STR
    return schema


async def up(db: AsyncDatabase) -> None:
    await db.command({"collMod": c.ENTRIES, "validator": {"$jsonSchema": entries_validator()}})
