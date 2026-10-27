"""Dựng dữ liệu thẳng vào DB cho test tác vụ vận hành (không qua API)."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.db import collections as c


async def add_user(db, *, tier: str = "beta") -> UUID:
    uid = uuid4()
    now = datetime.now(UTC)
    await db[c.USERS].insert_one(
        {
            "_id": uid,
            "google_sub": f"sub-{uid}",
            "email": f"{uid}@example.com",
            "display_name": "Người thử",
            "timezone": "Asia/Ho_Chi_Minh",
            "account_tier": tier,
            "joined_at": now,
            "deleted_at": None,
        }
    )
    return uid


def photo_keys(user_id: UUID, day: str, pid: UUID) -> tuple[str, str]:
    base = f"{user_id}/{day.replace('-', '/')}/{pid}"
    return f"{base}.webp", f"{base}_thumb.webp"


async def add_entry(
    db, user_id: UUID, day: str, *, deleted_days_ago: float | None = None, photos: int = 0
) -> dict:
    now = datetime.now(UTC)
    items = []
    for i in range(photos):
        pid = uuid4()
        main, thumb = photo_keys(user_id, day, pid)
        items.append(
            {
                "id": pid,
                "storage_key": main,
                "thumb_key": thumb,
                "width": 640,
                "height": 480,
                "size_bytes": 1234,
                "position": i,
                "created_at": now,
            }
        )
    doc = {
        "_id": uuid4(),
        "user_id": user_id,
        "entry_date": day,
        "title": "Tiêu đề bí mật",
        "content": "Nội dung bí mật",
        "score": 4,
        "icon_set_id": "sprout",
        "keywords": [{"keyword": "Đà Lạt", "norm": "da lat"}],
        "photos": items,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None if deleted_days_ago is None else now - timedelta(days=deleted_days_ago),
    }
    await db[c.ENTRIES].insert_one(doc)
    return doc


async def add_share(db, user_id: UUID, day: str) -> None:
    now = datetime.now(UTC)
    await db[c.SHARE_LINKS].insert_one(
        {
            "_id": uuid4(),
            "user_id": user_id,
            "entry_date": day,
            "token": uuid4().hex,
            "show_name": False,
            "show_score": True,
            "show_sub_icon": False,
            "show_flag": False,
            "show_title": False,
            "show_content": False,
            "show_keywords": False,
            "photo_ids": [],
            "created_at": now,
            "updated_at": now,
        }
    )
