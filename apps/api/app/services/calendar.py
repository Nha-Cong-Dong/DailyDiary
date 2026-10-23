"""Lịch và thống kê tháng (F-02, Bước 9).

- Một truy vấn theo index (user_id, entry_date) cho tháng; không đọc tiêu đề, nội dung, từ khóa.
- "Ghi bù": `created_at` đổi sang múi giờ hồ sơ rơi vào ngày sau `entry_date`. Trang ghi bù vẫn tô màu
  trong lịch nhưng không được tính vào chuỗi ngày liên tiếp (date-timezone-rules, Project_Specs F-02).
- Chuỗi hiện tại: tính lùi từ "hôm nay" của người dùng (hôm nay chưa ghi thì từ hôm qua), qua cả ranh giới
  tháng; đọc lần lượt các trang mới nhất trước và dừng ở chỗ đứt đầu tiên.
"""

import calendar as cal
from datetime import UTC, date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.schemas.calendar import CalendarDayOut, CalendarOut, CalendarStatsOut
from app.schemas.users import User
from app.services.entries import ACTIVE, user_today


def _utcnow() -> datetime:
    return datetime.now(UTC)  # tách riêng để test đặt "bây giờ"


def is_backfilled(entry_date: date, created_at: datetime, tz: ZoneInfo) -> bool:
    return created_at.astimezone(tz).date() > entry_date


def longest_run(days: list[date]) -> int:
    """Chuỗi ngày liên tiếp dài nhất trong danh sách ngày (đã bỏ trang ghi bù)."""
    best = run = 0
    prev: date | None = None
    for d in sorted(set(days)):
        run = run + 1 if prev is not None and d - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = d
    return best


async def current_streak(db: AsyncDatabase, user_id: UUID, today: date, tz: ZoneInfo) -> int:
    cursor = (
        db[c.ENTRIES]
        .find(
            {"user_id": user_id, "entry_date": {"$lte": today.isoformat()}, **ACTIVE},
            {"_id": 0, "entry_date": 1, "created_at": 1},
        )
        .sort("entry_date", -1)
    )
    expected = today
    count = 0
    async for doc in cursor:
        day = date.fromisoformat(doc["entry_date"])
        if count == 0 and expected == today and day < today:
            expected = today - timedelta(days=1)  # hôm nay chưa ghi: chuỗi vẫn còn, tính từ hôm qua
        if day != expected or is_backfilled(day, doc["created_at"], tz):
            break
        count += 1
        expected -= timedelta(days=1)
    return count


async def get_month(db: AsyncDatabase, user: User, year: int, month: int) -> CalendarOut:
    tz = ZoneInfo(user.timezone)
    first = date(year, month, 1)
    last = date(year, month, cal.monthrange(year, month)[1])
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {
                    "$match": {
                        "user_id": user.id,
                        "entry_date": {"$gte": first.isoformat(), "$lte": last.isoformat()},
                        **ACTIVE,
                    }
                },
                {"$sort": {"entry_date": 1}},
                {
                    "$project": {
                        "_id": 0,
                        "entry_date": 1,
                        "score": 1,
                        "sub_icon": 1,
                        "flag_color": 1,
                        "created_at": 1,
                        "photo_count": {"$size": {"$ifNull": ["$photos", []]}},
                    }
                },
            ]
        )
    ).to_list()

    days = [
        CalendarDayOut(
            entry_date=(d := date.fromisoformat(r["entry_date"])),
            score=r["score"],
            sub_icon=r.get("sub_icon"),
            flag_color=r.get("flag_color"),
            photo_count=r["photo_count"],
            backfilled=is_backfilled(d, r["created_at"], tz),
        )
        for r in rows
    ]
    distribution = [0] * 5
    for d in days:
        distribution[d.score - 1] += 1
    stats = CalendarStatsOut(
        recorded=len(days),
        average=round(sum(d.score for d in days) / len(days), 2) if days else None,
        distribution=distribution,
        photos=sum(d.photo_count for d in days),
        photo_days=sum(1 for d in days if d.photo_count),
        longest_streak=longest_run([d.entry_date for d in days if not d.backfilled]),
        current_streak=await current_streak(db, user.id, user_today(user.timezone, _utcnow()), tz),
    )
    return CalendarOut(month=f"{year}-{month:02d}", days=days, stats=stats)
