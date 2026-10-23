from datetime import UTC, date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest

from app.db import collections as c
from app.services import calendar as calendar_service

pytestmark = pytest.mark.anyio

VN = ZoneInfo("Asia/Ho_Chi_Minh")


async def _entry(db, user, day: str, *, score=4, created: datetime | None = None, **extra):
    """Ghi thẳng vào DB để đặt được `created_at` (ghi đúng ngày hay ghi bù)."""
    tz = ZoneInfo(user["timezone"])
    if created is None:  # mặc định: viết lúc 21:00 chính ngày đó (giờ địa phương) = ghi đúng ngày
        created = datetime.combine(date.fromisoformat(day), datetime.min.time(), tz).replace(hour=21)
    created = created.astimezone(UTC)
    await db[c.ENTRIES].insert_one(
        {
            "_id": uuid4(),
            "user_id": user["_id"],
            "entry_date": day,
            "score": score,
            "title": "Bí mật",
            "content": "Nội dung riêng tư",
            "keywords": [{"keyword": "riêng", "norm": "rieng"}],
            "photos": [],
            "created_at": created,
            "updated_at": created,
            "deleted_at": None,
            **extra,
        }
    )


def _today(monkeypatch, local: str, tz: ZoneInfo = VN, hour: int = 12):
    """Đặt "bây giờ" là `local` (giờ địa phương) cho cách tính chuỗi hiện tại."""
    now = datetime.combine(date.fromisoformat(local), datetime.min.time(), tz).replace(hour=hour)
    monkeypatch.setattr(calendar_service, "utcnow", lambda: now.astimezone(UTC))


async def _month(client, ym: str) -> dict:
    y, m = ym.split("-")
    r = await client.get(f"/calendar/{int(y)}/{int(m)}")
    assert r.status_code == 200, r.text
    return r.json()


async def test_payload_has_no_title_content_or_keywords(alice, db, monkeypatch):
    _today(monkeypatch, "2026-10-23")
    await _entry(db, alice.user, "2026-10-05", score=5, sub_icon="🌸", flag_color="#E3A4A8")
    await db[c.ENTRIES].update_one(
        {"user_id": alice.user["_id"]},
        {"$set": {"photos": [{"id": 1}, {"id": 2}]}},
        bypass_document_validation=True,
    )
    r = await alice.get("/calendar/2026/10")
    text = r.text
    assert "Bí mật" not in text and "riêng" not in text and "title" not in text and "content" not in text
    (day,) = r.json()["days"]
    assert day == {
        "entry_date": "2026-10-05",
        "score": 5,
        "sub_icon": "🌸",
        "flag_color": "#E3A4A8",
        "photo_count": 2,
        "backfilled": False,
    }


async def test_stats(alice, db, monkeypatch):
    _today(monkeypatch, "2026-10-23")
    for day, score in [("2026-10-01", 2), ("2026-10-02", 4), ("2026-10-03", 4), ("2026-10-10", 5)]:
        await _entry(db, alice.user, day, score=score)
    await _entry(db, alice.user, "2026-10-11", score=1, deleted_at=datetime.now(UTC))  # xóa mềm: bỏ qua
    await _entry(db, alice.user, "2026-09-30", score=1)  # tháng khác
    stats = (await _month(alice, "2026-10"))["stats"]
    assert stats["recorded"] == 4
    assert stats["average"] == 3.75
    assert stats["distribution"] == [0, 1, 0, 2, 1]
    assert stats["longest_streak"] == 3


async def test_current_streak_crosses_month_boundary(alice, db, monkeypatch):
    for day in ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]:
        await _entry(db, alice.user, day)
    _today(monkeypatch, "2026-10-02")
    october = (await _month(alice, "2026-10"))["stats"]
    assert october["current_streak"] == 5
    assert october["longest_streak"] == 2  # dài nhất tính trong tháng đang xem
    september = (await _month(alice, "2026-09"))["stats"]
    assert september["current_streak"] == 5 and september["longest_streak"] == 3


async def test_today_not_written_keeps_streak_until_day_ends(alice, db, monkeypatch):
    for day in ["2026-09-30", "2026-10-01", "2026-10-02"]:
        await _entry(db, alice.user, day)
    _today(monkeypatch, "2026-10-03")  # hôm nay chưa ghi: chuỗi còn, tính tới hôm qua
    assert (await _month(alice, "2026-10"))["stats"]["current_streak"] == 3
    _today(monkeypatch, "2026-10-04")  # bỏ trống hôm qua: đứt
    assert (await _month(alice, "2026-10"))["stats"]["current_streak"] == 0


async def test_leap_february(alice, db, monkeypatch):
    for day in ["2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01"]:
        await _entry(db, alice.user, day)
    _today(monkeypatch, "2024-03-01")
    feb = await _month(alice, "2024-02")
    assert [d["entry_date"] for d in feb["days"]] == ["2024-02-27", "2024-02-28", "2024-02-29"]
    assert feb["stats"]["longest_streak"] == 3
    assert feb["stats"]["current_streak"] == 4  # 27/2 → 1/3 qua ngày 29
    assert (await alice.get("/calendar/2026/2")).status_code == 200  # tháng 2 không nhuận vẫn hợp lệ


async def test_backfilled_day_is_colored_but_breaks_streak(alice, db, monkeypatch):
    await _entry(db, alice.user, "2026-10-01")
    # Ghi bù ngày 2 vào trưa ngày 3 (giờ Việt Nam).
    await _entry(db, alice.user, "2026-10-02", created=datetime(2026, 10, 3, 12, tzinfo=VN))
    await _entry(db, alice.user, "2026-10-03")
    _today(monkeypatch, "2026-10-03")
    body = await _month(alice, "2026-10")
    assert [d["backfilled"] for d in body["days"]] == [False, True, False]
    assert body["stats"]["recorded"] == 3  # vẫn tính là đã ghi
    assert body["stats"]["longest_streak"] == 1
    assert body["stats"]["current_streak"] == 1


@pytest.mark.parametrize(
    ("created_local", "backfilled"),
    [
        (datetime(2026, 10, 1, 23, 59, tzinfo=VN), False),  # 23:59 cùng ngày
        (datetime(2026, 10, 2, 0, 1, tzinfo=VN), True),  # 00:01 hôm sau (UTC vẫn là ngày 1/10)
        (datetime(2026, 10, 1, 6, 0, tzinfo=VN), False),  # 06:00 sáng (UTC còn là 30/9)
    ],
)
async def test_backfill_uses_user_timezone_not_utc(alice, db, monkeypatch, created_local, backfilled):
    _today(monkeypatch, "2026-10-23")
    await _entry(db, alice.user, "2026-10-01", created=created_local)
    (day,) = (await _month(alice, "2026-10"))["days"]
    assert day["backfilled"] is backfilled


async def test_negative_utc_offset_los_angeles(make_client, db, monkeypatch):
    la = ZoneInfo("America/Los_Angeles")
    user = await make_client("la@example.com", timezone="America/Los_Angeles")
    # 22:00 ngày 1/10 ở Los Angeles = 05:00 ngày 2/10 UTC: vẫn ghi đúng ngày.
    await _entry(db, user.user, "2026-10-01", created=datetime(2026, 10, 1, 22, tzinfo=la))
    await _entry(db, user.user, "2026-10-02", created=datetime(2026, 10, 2, 9, tzinfo=la))
    _today(monkeypatch, "2026-10-02", tz=la, hour=23)  # 23:00 LA = 06:00 3/10 UTC
    body = await _month(user, "2026-10")
    assert [d["backfilled"] for d in body["days"]] == [False, False]
    assert body["stats"]["current_streak"] == 2


async def test_calendar_is_per_user(alice, bob, db, monkeypatch):
    _today(monkeypatch, "2026-10-23")
    await _entry(db, alice.user, "2026-10-05")
    body = await _month(bob, "2026-10")
    assert body["days"] == [] and body["stats"]["recorded"] == 0 and body["stats"]["average"] is None


@pytest.mark.parametrize(
    "path", ["/calendar/2026/13", "/calendar/2026/0", "/calendar/1999/5", "/calendar/x/5"]
)
async def test_invalid_month_is_rejected(alice, path):
    assert (await alice.get(path)).status_code == 422


async def test_calendar_requires_login(anon):
    assert (await anon.get("/calendar/2026/10")).status_code == 401


def test_longest_run_handles_gaps_and_duplicates():
    d = date(2026, 1, 1)
    days = [d, d + timedelta(days=1), d + timedelta(days=1), d + timedelta(days=3)]
    assert calendar_service.longest_run(days) == 2
    assert calendar_service.longest_run([]) == 0
