"""Chạy migration MongoDB: `uv run python -m app.db.migrate`.

- Chỉ tiến (không có downgrade). Mỗi migration phải chạy lại được nhiều lần mà không hỏng (idempotent).
- Migration đã chạy được ghi vào collection `_migrations`; lần sau bỏ qua.
- Chạy ở bước triển khai, KHÔNG chạy trong lifespan (nhiều worker sẽ chạy cùng lúc).
- Thêm migration mới: tạo `migrations/mNNNN_<mo_ta>.py` có `ID` và `async def up(db)`,
  rồi thêm vào danh sách MIGRATIONS.
"""

import asyncio
import sys
from datetime import UTC, datetime

from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.db import collections as c
from app.db.client import make_client
from app.db.migrations import (
    m0001_initial,
    m0002_user_icon_set_onboarded,
    m0003_share_links,
    m0004_entries_icon_set_norm,
    m0005_user_custom_flag_colors,
    m0006_user_avatar_key,
    m0007_entries_norm_backfill,
    m0008_feedback_emailed_at,
)

MIGRATIONS = [
    m0001_initial,
    m0002_user_icon_set_onboarded,
    m0003_share_links,
    m0004_entries_icon_set_norm,
    m0005_user_custom_flag_colors,
    m0006_user_avatar_key,
    m0007_entries_norm_backfill,
    m0008_feedback_emailed_at,
]


async def run_migrations(db: AsyncDatabase) -> list[str]:
    applied = {doc["_id"] async for doc in db[c.MIGRATIONS].find({}, {"_id": 1})}
    ran: list[str] = []
    for migration in MIGRATIONS:
        if migration.ID in applied:
            continue
        await migration.up(db)
        await db[c.MIGRATIONS].insert_one({"_id": migration.ID, "applied_at": datetime.now(UTC)})
        ran.append(migration.ID)
    return ran


async def _main() -> None:
    client = make_client(settings.mongodb_uri)
    try:
        ran = await run_migrations(client[settings.mongodb_db])
        print(f"[{settings.mongodb_db}] đã chạy: {', '.join(ran)}" if ran else "Không có migration mới.")
    finally:
        await client.close()


if __name__ == "__main__":
    # Console Windows mặc định cp1252, in tiếng Việt sẽ lỗi sau khi migration đã chạy.
    sys.stdout.reconfigure(encoding="utf-8")
    asyncio.run(_main())
