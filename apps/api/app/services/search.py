"""Tìm kiếm (F-05, Bước 11) và "Từ khóa hay dùng".

- Khớp chuỗi con trên tiêu đề, nội dung, từ khóa. `q` không dấu → so trên `title_norm`, `content_norm`,
  `keywords.norm` (đã bỏ dấu, chữ thường); `q` có dấu → so đúng dấu, không phân biệt hoa thường.
- `q` luôn qua `re.escape`; bộ lọc luôn có `user_id` của phiên (index uq_user_date dẫn đầu bằng user_id).
- `q` là nội dung nhật ký: không ghi log (core/logging.py không ghi query string), không đưa vào lỗi trả về.
"""

import re
from datetime import date, timedelta
from typing import Literal

from pymongo.asynchronous.database import AsyncDatabase

from app.core.text import fold, has_diacritics, keyword_norm, nfc
from app.db import collections as c
from app.schemas.search import SearchHitOut, SearchOut
from app.schemas.users import User
from app.services.entries import ACTIVE, user_today

Period = Literal["month", "3m", "year", "all"]
EXCERPT_CHARS = 240
TOP_KEYWORDS = 6


def query_filter(q: str) -> dict:
    """Điều kiện khớp `q` (đã kiểm tra không rỗng). Regex không neo (chuỗi con), đã thoát ký tự đặc biệt."""
    q = nfc(q).strip()
    if has_diacritics(q):
        pattern = {"$regex": re.escape(q), "$options": "i"}
        fields = ("title", "content", "keywords.keyword")
    else:
        # *_norm đã là chữ thường và gộp khoảng trắng.
        pattern = {"$regex": re.escape(keyword_norm(q))}
        fields = ("title_norm", "content_norm", "keywords.norm")
    return {"$or": [{f: pattern} for f in fields]}


def period_start(period: Period, today: date) -> date | None:
    """Ngày sớm nhất của khoảng thời gian, theo "hôm nay" của người dùng (giống frontend)."""
    if period == "month":
        return today.replace(day=1)
    if period == "3m":
        return today - timedelta(days=91)
    if period == "year":
        return today.replace(month=1, day=1)
    return None


def excerpt(content: str | None, q: str) -> str | None:
    """Đoạn quanh chỗ khớp đầu tiên; không khớp trong nội dung (khớp tiêu đề/từ khóa) thì lấy đoạn đầu."""
    if not content:
        return None
    q = nfc(q).strip()
    if has_diacritics(q):
        hay, needle = content.lower(), q.lower()
    else:
        hay, needle = fold(content), fold(" ".join(q.split()))
    at = hay.find(needle)
    if at < 0 or len(content) <= EXCERPT_CHARS:
        return content[:EXCERPT_CHARS]
    start = max(0, min(at - EXCERPT_CHARS // 3, len(content) - EXCERPT_CHARS))
    return content[start : start + EXCERPT_CHARS]


async def search(
    db: AsyncDatabase,
    user: User,
    q: str,
    *,
    scores: list[int],
    period: Period,
    has_photo: bool,
    cursor: date | None,
    limit: int,
) -> SearchOut:
    matched_filter = {"user_id": user.id, **ACTIVE, **query_filter(q)}
    matched = await db[c.ENTRIES].count_documents(matched_filter)

    conditions = dict(matched_filter)
    dates: dict = {}
    start = period_start(period, user_today(user.timezone))
    if start:
        dates["$gte"] = start.isoformat()
    if cursor:
        dates["$lt"] = cursor.isoformat()
    if dates:
        conditions["entry_date"] = dates
    if scores:
        conditions["score"] = {"$in": sorted(set(scores))}
    if has_photo:
        conditions["photos.0"] = {"$exists": True}

    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {"$match": conditions},
                {"$sort": {"entry_date": -1}},
                {"$limit": limit + 1},
                {
                    "$project": {
                        "_id": 0,
                        "entry_date": 1,
                        "score": 1,
                        "title": 1,
                        "content": 1,
                        "keywords": "$keywords.keyword",
                        "sub_icon": 1,
                        "flag_color": 1,
                        "photo_count": {"$size": {"$ifNull": ["$photos", []]}},
                    }
                },
            ]
        )
    ).to_list()
    more = len(rows) > limit
    rows = rows[:limit]
    results = [
        SearchHitOut(
            entry_date=date.fromisoformat(r["entry_date"]),
            score=r["score"],
            title=r.get("title"),
            excerpt=excerpt(r.get("content"), q),
            keywords=r.get("keywords") or [],
            sub_icon=r.get("sub_icon"),
            flag_color=r.get("flag_color"),
            photo_count=r["photo_count"],
        )
        for r in rows
    ]
    next_cursor = results[-1].entry_date if more and results else None
    return SearchOut(results=results, matched=matched, next_cursor=next_cursor)


async def top_keywords(db: AsyncDatabase, user: User) -> list[str]:
    """Gộp theo dạng không dấu; nhãn là cách viết của lần dùng gần nhất. Hòa thì xếp theo chữ cái."""
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {"$match": {"user_id": user.id, **ACTIVE}},
                {"$sort": {"entry_date": -1}},
                {"$unwind": "$keywords"},
                {
                    "$group": {
                        "_id": "$keywords.norm",
                        "label": {"$first": "$keywords.keyword"},
                        "n": {"$sum": 1},
                    }
                },
                {"$sort": {"n": -1, "_id": 1}},
                {"$limit": TOP_KEYWORDS},
            ]
        )
    ).to_list()
    return [r["label"] for r in rows]
