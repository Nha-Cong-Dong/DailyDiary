"""Chế độ luân phiên (M2, ADR 0007 hiệu đính 21/11/2026): tính năng opt-in, không phải luật bắt buộc.

Lượt tính stateless (không thêm trường DB): ngày 0 = ngày tạo sổ (UTC) thuộc `members[0]`
(bên chấp nhận lời mời — người tạo sổ), sau đó đổi bên theo chẵn/lẻ. `my_turn` trên
`JournalOut` nói người xem *hôm nay* (theo múi giờ họ) có cầm lượt không.
"""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.db import collections as c

pytestmark = pytest.mark.anyio

TZ = "Asia/Ho_Chi_Minh"  # conftest đặt cho mọi user
TODAY = datetime.now(ZoneInfo(TZ)).date()


async def _journal(alice, bob, db):
    """Hai người bạn + một cuốn sổ chung active (mặc định mode together, created_by = bob).

    Thứ tự members: [bob (chấp nhận lời mời), alice] → `members[0]` = bob.
    """
    code = (await bob.get("/me/friend-code")).json()["friend_code"]
    r = await alice.post("/friends/requests", json={"code": code})
    assert r.status_code == 200, r.text
    r = await bob.post(f"/friends/requests/{r.json()['id']}/accept")
    assert r.status_code == 204, r.text
    invite_id = (await alice.post(f"/friends/{bob.user['_id']}/journal-invite")).json()["id"]
    assert (await bob.post(f"/journals/invites/{invite_id}/accept")).status_code == 204
    journal = await db[c.SHARED_JOURNALS].find_one({"members.user_id": alice.user["_id"]})
    assert journal is not None
    return journal["_id"]


async def _set_turn_day0(db, jid):
    """Ghim `created_at` về hôm nay → hôm nay là ngày 0 = lượt bob."""
    await db[c.SHARED_JOURNALS].update_one(
        {"_id": jid}, {"$set": {"created_at": datetime.combine(TODAY, datetime.min.time(), tzinfo=UTC)}}
    )


async def _set_turn_day1(db, jid):
    """Ghim `created_at` về hôm qua → hôm nay là ngày 1 = lượt alice."""
    yesterday = datetime.combine(TODAY - timedelta(days=1), datetime.min.time(), tzinfo=UTC)
    await db[c.SHARED_JOURNALS].update_one({"_id": jid}, {"$set": {"created_at": yesterday}})


async def _alternating(alice, jid: str) -> dict:
    r = await alice.post(f"/journals/{jid}/mode", json={"mode": "alternating"})
    assert r.status_code == 200, r.text
    return r.json()


async def test_default_mode_is_together_and_my_turn_true(alice, bob, db):
    jid = await _journal(alice, bob, db)
    data = (await alice.get(f"/journals/{jid}")).json()
    assert data["mode"] == "together" and data["my_turn"] is True


async def test_day0_turn_is_the_accepter(alice, bob, db):
    """Hôm nay là ngày 0 (lượt bob) → alice thấy my_turn=False, bob thấy True."""
    jid = await _journal(alice, bob, db)
    await _set_turn_day0(db, jid)
    data = await _alternating(alice, jid)
    assert data["my_turn"] is False
    assert (await bob.get(f"/journals/{jid}")).json()["my_turn"] is True


async def test_off_turn_cannot_create_but_can_edit_own(alice, bob, db):
    """Ngày 0 (lượt bob): alice không tạo được (422), bob tạo + sửa được."""
    jid = await _journal(alice, bob, db)
    await _set_turn_day0(db, jid)
    await _alternating(alice, jid)
    r = await alice.put(f"/journals/{jid}/entries/{TODAY}", json={"score": 3})
    assert r.status_code == 422 and r.json()["error"]["code"] == "TURN_NOT_YOURS"
    # Bob đúng lượt: tạo + sửa (sửa theo updated_at không bị guard).
    r = await bob.put(f"/journals/{jid}/entries/{TODAY}", json={"score": 4})
    assert r.status_code == 200, r.text
    payload = {"score": 5, "updated_at": r.json()["updated_at"]}
    assert (await bob.put(f"/journals/{jid}/entries/{TODAY}", json=payload)).status_code == 200


async def test_turn_flips_next_day(alice, bob, db):
    """Đẩy mốc về hôm qua → hôm nay là ngày 1 = lượt alice; bob chặn ngược lại."""
    jid = await _journal(alice, bob, db)
    await _set_turn_day1(db, jid)
    await _alternating(alice, jid)
    assert (await alice.put(f"/journals/{jid}/entries/{TODAY}", json={"score": 4})).status_code == 200
    r = await bob.put(f"/journals/{jid}/entries/{TODAY}", json={"score": 4})
    assert r.status_code == 422 and r.json()["error"]["code"] == "TURN_NOT_YOURS"


async def test_back_to_together_lifts_guard(alice, bob, db):
    """Đổi về cùng viết: guard biến mất, ai cũng ghi được (1 mục/người/ngày như M1)."""
    jid = await _journal(alice, bob, db)
    await _set_turn_day0(db, jid)  # ngày 0 = lượt bob, alice "sai lượt"
    await _alternating(alice, jid)
    assert (await alice.put(f"/journals/{jid}/entries/{TODAY}", json={"score": 4})).status_code == 422
    assert (await alice.post(f"/journals/{jid}/mode", json={"mode": "together"})).status_code == 200
    assert (await alice.put(f"/journals/{jid}/entries/{TODAY}", json={"score": 4})).status_code == 200


async def test_mode_requires_valid_value_and_active_journal(alice, bob, db):
    jid = await _journal(alice, bob, db)
    assert (await alice.post(f"/journals/{jid}/mode", json={"mode": "banana"})).status_code == 422
    # Sổ đã kết thúc → không đổi chế độ.
    assert (await alice.delete(f"/friends/{jid}")).status_code == 204
    r = await alice.post(f"/journals/{jid}/mode", json={"mode": "alternating"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "JOURNAL_ENDED"
