import unicodedata
from datetime import UTC, datetime, timedelta

import pytest
from limits import parse_many

from app.core.catalog import get_flag_colors, get_icons
from app.core.limits import get_limits, rate_limit
from app.core.rate_limit import limiter
from app.db import collections as c
from app.services.entries import user_today

pytestmark = pytest.mark.anyio

DAY = "2026-10-10"
SUB = get_icons().sub_icons[0]
FLAG = sorted(get_flag_colors().hexes)[0]
LIMITS = get_limits().tier("beta").entry


def _body(**extra):
    return {"score": 4, **extra}


async def _create(client, day=DAY, **extra):
    r = await client.put(f"/entries/{day}", json=_body(**extra))
    assert r.status_code == 200, r.text
    return r.json()


async def test_create_then_read_full_entry(alice):
    created = await _create(
        alice,
        title="Chiều mưa đọc sách",
        content="Mưa từ trưa.\n\nTối gọi cho mẹ.",
        sub_icon=SUB,
        flag_color=FLAG.lower(),
        keywords=["đọc sách", "mưa"],
    )
    assert created["entry_date"] == DAY
    assert created["flag_color"] == FLAG  # lưu chữ hoa như bảng màu
    assert created["keywords"] == ["đọc sách", "mưa"]
    assert created["photos"] == []
    got = (await alice.get(f"/entries/{DAY}")).json()
    assert got == created


async def test_custom_flag_color_is_accepted_even_if_not_in_profile_list(alice):
    # Màu tùy chỉnh từ bảng pha màu (Q6). Không bắt buộc còn trong users.custom_flag_colors:
    # gỡ màu khỏi danh sách thì bài cũ vẫn tự lưu được.
    assert (await _create(alice, flag_color="#3a7bd5"))["flag_color"] == "#3A7BD5"


async def test_score_only_is_enough(alice):
    created = await _create(alice)
    assert created["title"] is None and created["content"] is None and created["keywords"] == []


async def test_text_is_nfc_and_empty_becomes_null(alice, db):
    nfd = unicodedata.normalize("NFD", "  Hé nở  ")
    created = await _create(alice, title=nfd, content="   ")
    assert created["title"] == unicodedata.normalize("NFC", "Hé nở")
    assert created["content"] is None
    doc = await db[c.ENTRIES].find_one({"user_id": alice.user["_id"]})
    assert doc["title_norm"] == "he no"
    assert doc["keywords"] == []
    assert "icon_set_id" not in doc  # bộ icon lấy từ hồ sơ


async def test_update_with_known_updated_at(alice):
    created = await _create(alice, title="Bản đầu")
    r = await alice.put(
        f"/entries/{DAY}", json=_body(score=5, title="Bản sửa", updated_at=created["updated_at"])
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["score"] == 5 and updated["title"] == "Bản sửa"
    assert updated["created_at"] == created["created_at"]
    assert updated["updated_at"] >= created["updated_at"]


async def test_stale_updated_at_is_conflict(alice):
    created = await _create(alice)
    await alice.put(f"/entries/{DAY}", json=_body(score=2, updated_at=created["updated_at"]))
    r = await alice.put(f"/entries/{DAY}", json=_body(score=3, updated_at=created["updated_at"]))
    assert r.status_code == 409 and r.json()["error"]["code"] == "ENTRY_CONFLICT"


async def test_creating_twice_without_updated_at_is_conflict(alice):
    await _create(alice)
    r = await alice.put(f"/entries/{DAY}", json=_body(score=1))
    assert r.status_code == 409


async def test_update_missing_entry_is_404(alice):
    r = await alice.put(f"/entries/{DAY}", json=_body(updated_at=datetime.now(UTC).isoformat()))
    assert r.status_code == 404 and r.json()["error"]["code"] == "ENTRY_NOT_FOUND"


async def test_read_missing_entry_is_404(alice):
    r = await alice.get(f"/entries/{DAY}")
    assert r.status_code == 404 and r.json()["error"]["code"] == "ENTRY_NOT_FOUND"


async def test_today_allowed_tomorrow_rejected(alice):
    today = user_today(alice.user["timezone"])
    assert (await alice.put(f"/entries/{today.isoformat()}", json=_body())).status_code == 200
    tomorrow = (today + timedelta(days=1)).isoformat()
    r = await alice.put(f"/entries/{tomorrow}", json=_body())
    assert r.status_code == 422 and r.json()["error"]["code"] == "ENTRY_FUTURE_DATE"


async def test_future_is_judged_in_users_timezone(make_client):
    """Ngày "hôm nay" của Việt Nam có thể là ngày mai với người ở Los Angeles."""
    la = await make_client("la@example.com", timezone="America/Los_Angeles")
    day = user_today("Asia/Ho_Chi_Minh")
    expected = 422 if day > user_today("America/Los_Angeles") else 200
    assert (await la.put(f"/entries/{day.isoformat()}", json=_body())).status_code == expected


@pytest.mark.parametrize(
    "body",
    [
        {"score": 0},
        {"score": 6},
        {"score": "4"},
        {},
        {"score": 3, "sub_icon": "🦖🦖"},
        {"score": 3, "flag_color": "red"},
        {"score": 3, "flag_color": "#12345G"},
        {"score": 3, "flag_color": "#1234567"},
        {"score": 3, "keywords": ["mưa", "Mua"]},
        {"score": 3, "keywords": ["  "]},
        {"score": 3, "user_id": "x"},
        {"score": 3, "title": {"$ne": None}},
    ],
)
async def test_invalid_body_is_rejected(alice, body):
    r = await alice.put(f"/entries/{DAY}", json=body)
    assert r.status_code == 422


@pytest.mark.parametrize(
    ("extra", "code"),
    [
        ({"title": "a" * (LIMITS.title_max + 1)}, "ENTRY_LIMIT_TITLE"),
        ({"content": "a" * (LIMITS.content_max + 1)}, "ENTRY_LIMIT_CONTENT"),
        ({"keywords": [f"k{i}" for i in range(LIMITS.keywords_max + 1)]}, "ENTRY_LIMIT_KEYWORDS"),
        ({"keywords": ["a" * (LIMITS.keyword_len_max + 1)]}, "ENTRY_LIMIT_KEYWORD"),
    ],
)
async def test_limits_come_from_shared_limits(alice, extra, code):
    r = await alice.put(f"/entries/{DAY}", json=_body(**extra))
    assert r.status_code == 422 and r.json()["error"]["code"] == code


async def test_invalid_date_is_rejected(alice):
    assert (await alice.get("/entries/2026-02-30")).status_code == 422
    assert (await alice.put("/entries/18-10-2026", json=_body())).status_code == 422


async def test_soft_delete_hides_and_restore_brings_back(alice):
    created = await _create(alice, title="Giữ lại")
    r = await alice.delete(f"/entries/{DAY}")
    assert r.status_code == 200
    deleted = r.json()
    assert deleted["entry_date"] == DAY
    until = datetime.fromisoformat(deleted["restore_until"]) - datetime.fromisoformat(deleted["deleted_at"])
    assert until == timedelta(days=LIMITS.restore_days)
    assert (await alice.get(f"/entries/{DAY}")).status_code == 404
    assert (await alice.delete(f"/entries/{DAY}")).status_code == 404

    r = await alice.post(f"/entries/{DAY}/restore")
    assert r.status_code == 200
    assert r.json()["title"] == "Giữ lại"
    assert r.json()["created_at"] == created["created_at"]
    assert (await alice.get(f"/entries/{DAY}")).status_code == 200


async def test_restore_after_retention_window_is_404(alice, db):
    await _create(alice)
    await alice.delete(f"/entries/{DAY}")
    old = datetime.now(UTC) - timedelta(days=LIMITS.restore_days, minutes=1)
    await db[c.ENTRIES].update_one({"user_id": alice.user["_id"]}, {"$set": {"deleted_at": old}})
    assert (await alice.post(f"/entries/{DAY}/restore")).status_code == 404


async def test_restore_active_entry_is_404(alice):
    await _create(alice)
    assert (await alice.post(f"/entries/{DAY}/restore")).status_code == 404


async def test_writing_over_a_deleted_day_starts_a_new_page(alice):
    await _create(alice, title="Cũ")
    await alice.delete(f"/entries/{DAY}")
    created = await _create(alice, score=2, title="Mới")
    assert created["title"] == "Mới" and created["score"] == 2
    assert (await alice.post(f"/entries/{DAY}/restore")).status_code == 404


async def test_deleting_entry_closes_its_share_link(alice, anon):
    await _create(alice, title="Chia sẻ")
    parts = {
        "show_name": False,
        "show_score": True,
        "show_sub_icon": False,
        "show_flag": False,
        "show_title": True,
        "show_content": False,
        "show_keywords": False,
        "photo_ids": [],
    }
    token = (await alice.put(f"/entries/{DAY}/share", json=parts)).json()["token"]
    assert (await anon.get(f"/public/shares/{token}")).status_code == 200
    await alice.delete(f"/entries/{DAY}")
    assert (await anon.get(f"/public/shares/{token}")).status_code == 404


async def test_bob_cannot_read_change_delete_or_restore_alice_entry(alice, bob, db):
    created = await _create(alice, title="Của Alice")
    assert (await bob.get(f"/entries/{DAY}")).status_code == 404
    r = await bob.put(f"/entries/{DAY}", json=_body(score=1, updated_at=created["updated_at"]))
    assert r.status_code == 404
    assert (await bob.delete(f"/entries/{DAY}")).status_code == 404
    await alice.delete(f"/entries/{DAY}")
    assert (await bob.post(f"/entries/{DAY}/restore")).status_code == 404
    # Bob ghi cùng ngày tạo trang riêng của Bob, không đụng tới trang của Alice.
    assert (await bob.put(f"/entries/{DAY}", json=_body(score=2))).status_code == 200
    alice_doc = await db[c.ENTRIES].find_one({"user_id": alice.user["_id"]})
    assert alice_doc["title"] == "Của Alice" and alice_doc["deleted_at"] is not None


async def test_writes_without_csrf_are_forbidden(alice):
    del alice.headers["X-CSRF-Token"]
    assert (await alice.put(f"/entries/{DAY}", json=_body())).status_code == 403
    assert (await alice.delete(f"/entries/{DAY}")).status_code == 403
    assert (await alice.post(f"/entries/{DAY}/restore")).status_code == 403


async def test_endpoints_require_login(anon):
    assert (await anon.get(f"/entries/{DAY}")).status_code == 401
    assert (await anon.put(f"/entries/{DAY}", json=_body())).status_code == 401


async def test_delete_is_rate_limited(alice):
    allowed = parse_many(rate_limit("write"))[0].amount
    limiter.enabled = True
    limiter.reset()
    try:
        for _ in range(allowed):
            await alice.delete(f"/entries/{DAY}")
        r = await alice.delete(f"/entries/{DAY}")
        assert r.status_code == 429
    finally:
        limiter.reset()


async def test_new_page_over_deleted_day_does_not_reopen_old_share_link(alice, anon):
    """Xóa trang đang chia sẻ rồi viết trang mới cùng ngày: link cũ không được hiện trang mới."""
    await _create(alice, title="Trang cũ")
    parts = {
        "show_name": False,
        "show_score": True,
        "show_sub_icon": False,
        "show_flag": False,
        "show_title": True,
        "show_content": False,
        "show_keywords": False,
        "photo_ids": [],
    }
    token = (await alice.put(f"/entries/{DAY}/share", json=parts)).json()["token"]
    await alice.delete(f"/entries/{DAY}")
    await _create(alice, title="Trang mới, riêng tư")
    assert (await anon.get(f"/public/shares/{token}")).status_code == 404
    assert (await alice.get(f"/entries/{DAY}/share")).json() is None


# --- Dòng thời gian theo tháng (Bước 8, GET /entries?month=YYYY-MM) ---


async def test_month_lists_only_that_month_newest_first(alice):
    for day in ("2026-08-31", "2026-09-01", "2026-09-15", "2026-09-30", "2026-10-01"):
        await _create(alice, day=day)
    r = await alice.get("/entries", params={"month": "2026-09"})
    assert r.status_code == 200
    body = r.json()
    assert body["month"] == "2026-09"
    assert [e["entry_date"] for e in body["entries"]] == ["2026-09-30", "2026-09-15", "2026-09-01"]


async def test_month_summary_fields_and_excerpt(alice, db):
    long = "Mưa " * 200  # 800 ký tự
    await _create(
        alice,
        day="2026-09-05",
        title="Chiều mưa",
        content=long,
        keywords=["mưa", "đọc sách"],
        flag_color=FLAG,
    )
    await db[c.ENTRIES].update_one(
        {"user_id": alice.user["_id"], "entry_date": "2026-09-05"},
        {"$set": {"photos": [{"id": i} for i in range(3)]}},  # chỉ để đếm, không qua validator ảnh đầy đủ
        bypass_document_validation=True,
    )
    await _create(alice, day="2026-09-06")
    entries = (await alice.get("/entries", params={"month": "2026-09"})).json()["entries"]
    only_score, full = entries
    assert (
        full["title"] == "Chiều mưa"
        and full["keywords"] == ["mưa", "đọc sách"]
        and full["flag_color"] == FLAG
    )
    assert full["photo_count"] == 3
    assert len(full["excerpt"]) == 300 and long.startswith(full["excerpt"])
    assert "content" not in full  # không trả nội dung đầy đủ
    assert only_score["excerpt"] is None and only_score["photo_count"] == 0 and only_score["title"] is None


async def test_month_skips_soft_deleted(alice):
    await _create(alice, day="2026-09-10")
    await _create(alice, day="2026-09-11")
    assert (await alice.delete("/entries/2026-09-10")).status_code == 200
    entries = (await alice.get("/entries", params={"month": "2026-09"})).json()["entries"]
    assert [e["entry_date"] for e in entries] == ["2026-09-11"]


async def test_months_cover_every_entry_exactly_once(alice):
    """Đi qua từng tháng: không trùng, không sót trang nào (kể cả ngày đầu/cuối tháng, năm nhuận)."""
    days = ["2024-02-29", "2024-03-01", "2025-12-31", "2026-01-01", "2026-02-28", "2026-03-31", "2026-04-30"]
    for day in days:
        await _create(alice, day=day)
    seen: list[str] = []
    for year in (2024, 2025, 2026):
        for m in range(1, 13):
            r = await alice.get("/entries", params={"month": f"{year}-{m:02d}"})
            seen += [e["entry_date"] for e in r.json()["entries"]]
    assert sorted(seen) == sorted(days)


async def test_month_is_per_user(alice, bob):
    await _create(alice, day="2026-09-10", title="Của Alice")
    assert (await bob.get("/entries", params={"month": "2026-09"})).json()["entries"] == []
    # Không có cách nào xin tháng của người khác: không nhận user_id từ request.
    r = await bob.get("/entries", params={"month": "2026-09", "user_id": str(alice.user["_id"])})
    assert r.json()["entries"] == []


@pytest.mark.parametrize("month", ["2026-13", "2026-1", "2026-00", "abc", "2026-09-01", ""])
async def test_month_rejects_bad_format(alice, month):
    assert (await alice.get("/entries", params={"month": month})).status_code == 422


async def test_month_requires_month_and_login(alice, anon):
    assert (await alice.get("/entries")).status_code == 422
    assert (await anon.get("/entries", params={"month": "2026-09"})).status_code == 401
