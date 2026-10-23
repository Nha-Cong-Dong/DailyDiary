"""Year in Pixels (F-03, Bước 10): điểm cả năm + danh sách năm có dữ liệu, mỗi thứ một truy vấn theo index."""

from datetime import date
from zoneinfo import ZoneInfo

from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c
from app.schemas.pixels import PixelsOut, PixelsStatsOut
from app.schemas.users import User
from app.services import calendar as calendar_service
from app.services.entries import ACTIVE, user_today


async def years_with_entries(db: AsyncDatabase, user: User) -> list[int]:
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {"$match": {"user_id": user.id, **ACTIVE}},
                {"$group": {"_id": {"$substrCP": ["$entry_date", 0, 4]}}},
                {"$sort": {"_id": 1}},
            ]
        )
    ).to_list()
    return [int(r["_id"]) for r in rows]


async def get_year(db: AsyncDatabase, user: User, year: int) -> PixelsOut:
    tz = ZoneInfo(user.timezone)
    first = date(year, 1, 1)
    length = (date(year + 1, 1, 1) - first).days  # 365 hoặc 366
    rows = (
        await db[c.ENTRIES]
        .find(
            {
                "user_id": user.id,
                "entry_date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"},
                **ACTIVE,
            },
            {"_id": 0, "entry_date": 1, "score": 1, "flag_color": 1, "created_at": 1},
        )
        .sort("entry_date", 1)
        .to_list()
    )
    scores = ["0"] * length
    flags: dict[int, str] = {}
    backfilled: list[int] = []
    on_time: list[date] = []
    for r in rows:
        day = date.fromisoformat(r["entry_date"])
        i = (day - first).days
        scores[i] = str(r["score"])
        if r.get("flag_color"):
            flags[i] = r["flag_color"]
        if calendar_service.is_backfilled(day, r["created_at"], tz):
            backfilled.append(i)
        else:
            on_time.append(day)
    today = user_today(user.timezone, calendar_service.utcnow())
    return PixelsOut(
        year=year,
        years=await years_with_entries(db, user),
        scores="".join(scores),
        flags=flags,
        backfilled=backfilled,
        stats=PixelsStatsOut(
            longest_streak=calendar_service.longest_run(on_time),
            current_streak=await calendar_service.current_streak(db, user.id, today, tz),
        ),
    )
