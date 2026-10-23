import logging
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest

from app.db import collections as c

pytestmark = pytest.mark.anyio

TODAY = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()


def _day(days_ago: int) -> str:
    return (TODAY - timedelta(days=days_ago)).isoformat()


async def _create(client, day: str, **fields):
    body = {"score": 4, "keywords": [], **fields}
    r = await client.put(f"/entries/{day}", json=body)
    assert r.status_code == 200, r.text


async def _search(client, q: str, **params) -> dict:
    r = await client.get("/search", params={"q": q, **params})
    assert r.status_code == 200, r.text
    return r.json()


def _dates(body: dict) -> list[str]:
    return [h["entry_date"] for h in body["results"]]


async def test_unaccented_query_matches_accented_text(alice):
    await _create(alice, _day(1), title="Đi Đà Lạt với Linh")
    await _create(alice, _day(2), content="Trời mưa cả buổi chiều.")
    await _create(alice, _day(3), keywords=["đọc sách"])
    assert _dates(await _search(alice, "da lat")) == [_day(1)]
    assert _dates(await _search(alice, "DA  LAT")) == [_day(1)]  # hoa thường, khoảng trắng thừa
    assert _dates(await _search(alice, "mua")) == [_day(2)]
    assert _dates(await _search(alice, "doc sa")) == [_day(3)]  # chuỗi con trong từ khóa


async def test_accented_query_matches_exact_accents_any_case(alice):
    await _create(alice, _day(1), title="MƯA ĐẦU THU")
    await _create(alice, _day(2), title="Mua sắm cuối tuần")
    assert _dates(await _search(alice, "mưa")) == [_day(1)]  # "mưa" không khớp "Mua"
    assert _dates(await _search(alice, "Đầu thu")) == [_day(1)]
    assert _dates(await _search(alice, "mua")) == [_day(1), _day(2)]  # không dấu thì khớp cả hai


async def test_substring_inside_words(alice):
    await _create(alice, _day(1), content="Buổi chiều yên tĩnh bên hồ.")
    assert _dates(await _search(alice, "tinh ben")) == [_day(1)]
    assert _dates(await _search(alice, "ĩnh b")) == [_day(1)]


@pytest.mark.parametrize("q", [".*", "(", "a+b", "[x]", "\\", "$where", "^Buổi"])
async def test_regex_characters_are_literal(alice, q):
    await _create(alice, _day(1), title="Một ngày bình thường")
    await _create(alice, _day(2), title="Công thức a+b và [x] (ghi chú)")
    body = await _search(alice, q)
    expected = [_day(2)] if q in ("(", "a+b", "[x]") else []
    assert _dates(body) == expected


async def test_excerpt_is_window_around_match(alice):
    content = "Mở đầu dài. " * 40 + "Hôm nay gặp lại Linh ở Đà Lạt." + " Kết thúc." * 40
    await _create(alice, _day(1), content=content)
    hit = (await _search(alice, "da lat"))["results"][0]
    assert "Đà Lạt" in hit["excerpt"]
    assert len(hit["excerpt"]) <= 240 and hit["excerpt"] != content[:240]
    assert "content" not in hit


async def test_filters_and_matched_count(alice, db):
    await _create(alice, _day(0), score=5, title="mưa hôm nay")
    await _create(alice, _day(40), score=3, title="mưa tháng trước")
    await _create(alice, _day(200), score=1, title="mưa năm ngoái")
    await db[c.ENTRIES].update_one(
        {"user_id": alice.user["_id"], "entry_date": _day(40)},
        {"$set": {"photos": [{"id": 1}]}},
        bypass_document_validation=True,
    )
    body = await _search(alice, "mua", period="month")
    assert body["matched"] == 3  # số trang khớp trước bộ lọc
    assert set(_dates(body)) <= {_day(0), _day(40)} and _day(0) in _dates(body)
    assert _dates(await _search(alice, "mua", period="3m")) == [_day(0), _day(40)]
    by_score = await _search(alice, "mua", score=[1, 5])
    assert _dates(by_score) == [_day(0), _day(200)] and by_score["total"] == 2
    assert _dates(await _search(alice, "mua", has_photo="true")) == [_day(40)]
    year = _dates(await _search(alice, "mua", period="year"))
    assert all(d.startswith(str(TODAY.year)) for d in year)


async def test_pagination_has_no_duplicates_or_gaps(alice):
    for i in range(35):
        await _create(alice, _day(i), title=f"Trang {i} đi bộ")
    first = await _search(alice, "di bo")
    assert len(first["results"]) == 30 and first["next_cursor"] == _day(29) and first["total"] == 35
    second = await _search(alice, "di bo", cursor=first["next_cursor"])
    assert second["next_cursor"] is None and second["total"] == 35
    seen = _dates(first) + _dates(second)
    assert seen == [_day(i) for i in range(35)]  # mới nhất trước, đủ 35, không trùng


async def test_soft_deleted_pages_are_not_found(alice):
    await _create(alice, _day(1), title="Bí mật đã xóa")
    assert (await alice.delete(f"/entries/{_day(1)}")).status_code == 200
    body = await _search(alice, "bi mat")
    assert body == {"results": [], "matched": 0, "total": 0, "next_cursor": None}


async def test_search_is_per_user(alice, bob):
    await _create(alice, _day(1), title="Nhật ký của Alice", keywords=["riêng tư"])
    assert (await _search(bob, "alice"))["matched"] == 0
    assert (await _search(bob, "rieng tu"))["results"] == []
    # Không nhận user_id từ request.
    r = await bob.get("/search", params={"q": "alice", "user_id": str(alice.user["_id"])})
    assert r.json()["matched"] == 0
    assert (await bob.get("/keywords/top")).json() == {"keywords": []}


async def test_query_and_results_are_not_logged_even_at_debug(alice, caplog, monkeypatch):
    await _create(alice, _day(1), title="Bí mật xyzzy")
    caplog.set_level(logging.DEBUG)
    # Như configure_logging() đặt cho app (không dùng caplog.set_level: nó hạ luôn mức của bộ bắt log).
    monkeypatch.setattr(logging.getLogger("pymongo"), "level", logging.WARNING)
    await _search(alice, "xyzzy")
    # Bỏ qua log của httpx: đó là client của test gửi request, không phải backend.
    app_logs = "\n".join(r.getMessage() for r in caplog.records if not r.name.startswith("httpx"))
    assert "xyzzy" not in app_logs and "Bí mật" not in app_logs
    assert "GET /search 200" in app_logs  # vẫn có dòng log request, chỉ không có query string


def test_configure_logging_silences_pymongo_debug():
    from app.core.logging import configure_logging

    configure_logging(logging.DEBUG)
    assert logging.getLogger("pymongo").getEffectiveLevel() >= logging.WARNING


@pytest.mark.parametrize(
    "params",
    [{"q": ""}, {"q": "   "}, {"q": "a" * 101}, {"q": "x", "score": 6}, {"q": "x", "period": "week"}, {}],
)
async def test_invalid_params(alice, params):
    assert (await alice.get("/search", params=params)).status_code == 422


async def test_search_requires_login(anon):
    assert (await anon.get("/search", params={"q": "x"})).status_code == 401
    assert (await anon.get("/keywords/top")).status_code == 401


async def test_top_keywords_group_by_unaccented_form(alice):
    await _create(alice, _day(1), keywords=["Cà phê", "mưa"])
    await _create(alice, _day(2), keywords=["ca phe", "Linh"])
    await _create(alice, _day(3), keywords=["cà phê", "mưa", "đọc sách"])
    keywords = (await alice.get("/keywords/top")).json()["keywords"]
    assert keywords[:2] == ["Cà phê", "mưa"]  # nhãn theo lần dùng gần nhất; 3 lần và 2 lần
    assert set(keywords[2:]) == {"Linh", "đọc sách"}


async def test_m0007_backfills_norm_fields(db):
    from app.db.migrations import m0007_entries_norm_backfill as m7

    now = datetime.now(UTC)
    doc = {
        "_id": uuid4(),
        "user_id": uuid4(),
        "entry_date": date(2026, 1, 5).isoformat(),
        "score": 3,
        "title": "Đà Lạt",
        "content": "Trời   MƯA",
        "keywords": [],
        "photos": [],
        "created_at": now,
        "updated_at": now,
    }
    await db[c.ENTRIES].insert_one(doc)
    await m7.up(db)
    await m7.up(db)  # chạy lại không đổi gì
    got = await db[c.ENTRIES].find_one({"_id": doc["_id"]})
    assert got["title_norm"] == "da lat" and got["content_norm"] == "troi mua"
