from datetime import timedelta
from uuid import UUID

import pytest

from app.db import collections as c
from app.services.entries import user_today

pytestmark = pytest.mark.anyio

TZ = "Asia/Ho_Chi_Minh"


def _day(delta_days: int) -> str:
    """ISO date so sai hôm nay của user (fixture default UTC+7, test chạy cùng múi)."""
    return str(user_today(TZ) + timedelta(days=delta_days))


async def test_create_sealed_then_list_hides_content(alice, db):
    """Ghi thư hẹn tương lai → 201 niêm phong: list không lộ nội dung."""
    r = await alice.post("/letters", json={"content": "xin chào tương lai", "reveal_date": _day(30)})
    assert r.status_code == 201, r.text
    letter = r.json()
    assert letter["status"] == "sealed" and letter["content"] is None

    listing = (await alice.get("/letters")).json()["letters"]
    assert len(listing) == 1
    assert listing[0]["id"] == letter["id"]
    assert listing[0]["status"] == "sealed"
    assert listing[0]["content"] is None


async def test_content_shown_after_reveal_date(alice, db):
    """Sửa reveal_date về quá khứ (bảo diễn mốc thời gian) → nội dung hiện ra."""
    letter_id = (
        await alice.post("/letters", json={"content": "bài học năm nay", "reveal_date": _day(10)})
    ).json()["id"]

    await db[c.LETTERS].update_one({"_id": UUID(letter_id)}, {"$set": {"reveal_date": _day(-1)}})

    listing = (await alice.get("/letters")).json()["letters"]
    assert listing[0]["status"] == "open"
    assert listing[0]["content"] == "bài học năm nay"


async def test_reveal_date_must_be_future(alice, db):
    """Hẹn mở cùng hôm nay hoặc trước đó → 422 LETTER_NOT_FUTURE."""
    for delta in (0, -5):
        r = await alice.post("/letters", json={"content": "abc", "reveal_date": _day(delta)})
        assert r.status_code == 422 and r.json()["error"]["code"] == "LETTER_NOT_FUTURE"


async def test_empty_content_rejected(alice, db):
    r = await alice.post("/letters", json={"content": "   ", "reveal_date": _day(7)})
    assert r.status_code == 422 and r.json()["error"]["code"] == "LETTER_EMPTY"


async def test_content_over_limit_rejected(alice, db):
    from app.core.limits import get_limits

    limit = get_limits().tier("beta").entry.content_max
    r = await alice.post("/letters", json={"content": "x" * (limit + 1), "reveal_date": _day(7)})
    assert r.status_code == 422 and r.json()["error"]["code"] == "LETTER_LIMIT_CONTENT"


async def test_one_letter_per_authored_day(alice, db):
    """Lá thứ hai cùng ngày ghi → 409 LETTER_TODAY (unique index, race-safe)."""
    day = _day(14)
    assert (await alice.post("/letters", json={"content": "a", "reveal_date": day})).status_code == 201
    r = await alice.post("/letters", json={"content": "b", "reveal_date": day})
    assert r.status_code == 409 and r.json()["error"]["code"] == "LETTER_TODAY"


async def test_delete_own_letter(alice, db):
    letter_id = (await alice.post("/letters", json={"content": "gửi mình", "reveal_date": _day(21)})).json()[
        "id"
    ]
    assert await db[c.LETTERS].count_documents({}) == 1

    r = await alice.delete(f"/letters/{letter_id}")
    assert r.status_code == 204
    assert await db[c.LETTERS].count_documents({}) == 0


async def test_cannot_touch_anothers_letter(alice, bob, db):
    """Xóa thư của người khác → 404 LETTER_NOT_FOUND, thư gốc còn nguyên."""
    other_id = (await alice.post("/letters", json={"content": "của alice", "reveal_date": _day(5)})).json()[
        "id"
    ]
    r = await bob.delete(f"/letters/{other_id}")
    assert r.status_code == 404 and r.json()["error"]["code"] == "LETTER_NOT_FOUND"
    assert await db[c.LETTERS].count_documents({"user_id": alice.user["_id"]}) == 1


async def test_delete_missing_letter_404(alice, db):
    r = await alice.delete("/letters/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404 and r.json()["error"]["code"] == "LETTER_NOT_FOUND"


async def test_delete_account_cleans_letters(alice, db):
    """Xóa tài khoản (F-07) dọn luôn thư tương lai (privacy-check)."""
    await alice.post("/letters", json={"content": "bí mật", "reveal_date": _day(90)})
    assert await db[c.LETTERS].count_documents({}) == 1

    r = await alice.request("DELETE", "/me", json={"confirm_email": "ALICE@example.com"})
    assert r.status_code == 204
    assert await db[c.LETTERS].count_documents({}) == 0
