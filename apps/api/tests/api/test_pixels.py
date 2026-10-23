import json
from datetime import UTC, date, datetime, timedelta

import pytest

from tests.api.test_calendar import VN, _entry, _today

pytestmark = pytest.mark.anyio


async def _year(client, year: int) -> dict:
    r = await client.get(f"/pixels/{year}")
    assert r.status_code == 200, r.text
    return r.json()


async def test_leap_year_has_366_days_and_index_maps_dates(alice, db, monkeypatch):
    _today(monkeypatch, "2024-12-31")
    await _entry(db, alice.user, "2024-01-01", score=2)
    await _entry(db, alice.user, "2024-02-29", score=5, flag_color="#E3A4A8")
    await _entry(db, alice.user, "2024-12-31", score=3)
    body = await _year(alice, 2024)
    scores = body["scores"]
    assert len(scores) == 366
    assert scores[0] == "2" and scores[59] == "5" and scores[365] == "3"  # 29/2 là ngày thứ 60
    assert scores.count("0") == 363
    assert body["flags"] == {"59": "#E3A4A8"}
    assert len((await _year(alice, 2026))["scores"]) == 365


async def test_years_lists_only_years_with_live_entries(alice, bob, db, monkeypatch):
    _today(monkeypatch, "2026-10-23")
    await _entry(db, alice.user, "2025-03-01")
    await _entry(db, alice.user, "2026-10-01")
    await _entry(db, alice.user, "2024-05-05", deleted_at=datetime.now(UTC))  # chỉ có bài đã xóa
    await _entry(db, bob.user, "2023-01-01")  # năm của người khác
    assert (await _year(alice, 2026))["years"] == [2025, 2026]
    assert (await _year(alice, 2024))["scores"].count("0") == 366  # năm không có dữ liệu vẫn trả lưới trống


async def test_payload_is_small_even_for_a_full_year(alice, db, monkeypatch):
    """Trường hợp nặng nhất: ghi đủ 366 ngày, ngày nào cũng có cờ, một nửa là ghi bù."""
    _today(monkeypatch, "2024-12-31")
    first = date(2024, 1, 1)
    for i in range(366):
        day = first + timedelta(days=i)
        created = datetime.combine(day + timedelta(days=i % 2), datetime.min.time(), VN).replace(hour=21)
        await _entry(db, alice.user, day.isoformat(), score=i % 5 + 1, flag_color="#A3C392", created=created)
    r = await alice.get("/pixels/2024")
    assert len(r.content) < 10 * 1024, len(r.content)
    body = r.json()
    assert "0" not in body["scores"] and len(body["flags"]) == 366 and len(body["backfilled"]) == 183
    assert "title" not in r.text and "content" not in r.text


async def test_streaks_skip_backfilled_days(alice, db, monkeypatch):
    for day in ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"]:
        await _entry(db, alice.user, day)
    await _entry(db, alice.user, "2026-03-05", created=datetime(2026, 3, 7, 9, tzinfo=VN))  # ghi bù
    await _entry(db, alice.user, "2026-03-06")
    _today(monkeypatch, "2026-03-06")
    body = await _year(alice, 2026)
    assert body["backfilled"] == [63]  # 5/3/2026 là ngày thứ 64
    assert body["stats"] == {"longest_streak": 4, "current_streak": 1}


async def test_pixels_are_per_user(alice, bob, db, monkeypatch):
    _today(monkeypatch, "2026-10-23")
    await _entry(db, alice.user, "2026-10-01", flag_color="#E3A4A8")
    body = await _year(bob, 2026)
    assert body["scores"].count("0") == 365 and body["flags"] == {} and body["years"] == []
    assert json.dumps(body).count("#E3A4A8") == 0


@pytest.mark.parametrize("path", ["/pixels/1999", "/pixels/2101", "/pixels/abc"])
async def test_invalid_year_is_rejected(alice, path):
    assert (await alice.get(path)).status_code == 422


async def test_pixels_require_login(anon):
    assert (await anon.get("/pixels/2026")).status_code == 401
