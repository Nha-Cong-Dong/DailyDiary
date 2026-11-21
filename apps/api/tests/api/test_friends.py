from uuid import UUID, uuid4

import pytest

from app.db import collections as c

pytestmark = pytest.mark.anyio

BAD_CODE = "KHÔNG PHẢI MÃ"


async def _codes(alice, bob, db):
    """Mã bạn của hai người (sinh lần đầu nếu chưa có)."""
    a = (await alice.get("/me/friend-code")).json()["friend_code"]
    b = (await bob.get("/me/friend-code")).json()["friend_code"]
    return a, b


async def _send_request(alice, bob, db):
    """Alice gửi yêu cầu cho Bob; trả id yêu cầu."""
    _, bob_code = await _codes(alice, bob, db)
    r = await alice.post("/friends/requests", json={"code": bob_code})
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def _make_journal(alice, bob, db):
    """Hai người bạn + một cuốn sổ chung active (gói toàn bộ luồng mới:
    kết bạn → chấp nhận (thành bạn, chưa có sổ) → mời mở sổ → chấp nhận (tạo sổ))."""
    req_id = await _send_request(alice, bob, db)
    r = await bob.post(f"/friends/requests/{req_id}/accept")
    assert r.status_code == 204, r.text
    # Thành bạn nhưng chưa có sổ chung.
    assert await db[c.SHARED_JOURNALS].count_documents({}) == 0
    invite = (await alice.post(f"/friends/{bob.user['_id']}/journal-invite")).json()["id"]
    r = await bob.post(f"/journals/invites/{invite}/accept")
    assert r.status_code == 204, r.text
    journal = await db[c.SHARED_JOURNALS].find_one({"members.user_id": alice.user["_id"]})
    assert journal is not None
    return journal


async def test_get_and_rotate_friend_code(alice, db):
    r = await alice.get("/me/friend-code")
    assert r.status_code == 200
    first = r.json()["friend_code"]
    # Mã 10 ký tự, không chứa ký tự dễ nhầm (0, 1, I, L, O).
    assert len(first) == 10 and all(ch not in "01ILO" for ch in first)
    assert (await alice.get("/me/friend-code")).json()["friend_code"] == first  # không xoay tự động

    r = await alice.post("/me/friend-code/rotate")
    assert r.status_code == 200
    rotated = r.json()["friend_code"]
    assert rotated != first and len(rotated) == 10
    stored = await db[c.USERS].find_one({"_id": alice.user["_id"]}, {"friend_code": 1})
    assert stored["friend_code"] == rotated


async def test_code_only_generated_once_not_logged(alice, db):
    # Mã sinh một lần; gọi nhiều lần không đổi.
    await alice.get("/me/friend-code")
    stored = await db[c.USERS].find_one({"_id": alice.user["_id"]}, {"friend_code": 1})
    for _ in range(3):
        assert (await alice.get("/me/friend-code")).json()["friend_code"] == stored["friend_code"]


async def test_accept_frienship_does_not_create_journal(alice, bob, db):
    """Chấp nhận yêu cầu kết bạn chỉ thành bạn — KHÔNG tự sinh sổ chung."""
    req_id = await _send_request(alice, bob, db)
    assert (await bob.post(f"/friends/requests/{req_id}/accept")).status_code == 204
    doc = await db[c.FRIENDSHIPS].find_one({"_id": UUID(req_id)})
    assert doc["status"] == "accepted" and doc["journal_id"] is None
    assert await db[c.SHARED_JOURNALS].count_documents({}) == 0
    assert (await alice.get("/friends")).json()["friends_count"] == 1


async def test_journal_invite_creates_journal_when_both_accept(alice, bob, db):
    """Mời mở sổ + chấp nhận → tạo đúng một cuốn sổ cho cặp."""
    req_id = await _send_request(alice, bob, db)
    assert (await bob.post(f"/friends/requests/{req_id}/accept")).status_code == 204

    invite = await alice.post(f"/friends/{bob.user['_id']}/journal-invite")
    assert invite.status_code == 200, invite.text
    invite_id = invite.json()["id"]
    assert invite.json()["direction"] == "outgoing"
    # Bob (người được mời) thấy ở hướng "incoming".
    invites = (await bob.get("/journals/invites")).json()
    assert [i["id"] for i in invites["incoming"]] == [invite_id]

    assert (await bob.post(f"/journals/invites/{invite_id}/accept")).status_code == 204
    journal = await db[c.SHARED_JOURNALS].find_one({"members.user_id": alice.user["_id"]})
    assert journal is not None
    assert {m["user_id"] for m in journal["members"]} == {alice.user["_id"], bob.user["_id"]}
    # Quan hệ bạn được gắn journal_id (để danh sách bạn hiện "Mở sổ chung").
    assert (await db[c.FRIENDSHIPS].find_one({"_id": UUID(req_id)}))["journal_id"] == journal["_id"]


async def test_journal_invite_rejected_before_friendship(alice, db):
    """Mời mở sổ với người chưa phải bạn → 422 NOT_FRIENDS."""
    r = await alice.post(f"/friends/{uuid4()}/journal-invite")
    assert r.status_code == 422 and r.json()["error"]["code"] == "NOT_FRIENDS"


async def test_journal_invite_only_addressee_accepts(alice, bob, db):
    req_id = await _send_request(alice, bob, db)
    await bob.post(f"/friends/requests/{req_id}/accept")
    invite_id = (await alice.post(f"/friends/{bob.user['_id']}/journal-invite")).json()["id"]
    # Alice (người mời) không chấp nhận được chính lời mời mình gửi.
    assert (await alice.post(f"/journals/invites/{invite_id}/accept")).status_code == 404
    # Bob từ chối → không có sổ.
    assert (await bob.post(f"/journals/invites/{invite_id}/decline")).status_code == 204
    assert await db[c.SHARED_JOURNALS].count_documents({}) == 0


async def test_journal_invite_blocked_when_journal_exists(alice, bob, db):
    await _make_journal(alice, bob, db)
    r = await alice.post(f"/friends/{bob.user['_id']}/journal-invite")
    assert r.status_code == 409 and r.json()["error"]["code"] == "JOURNAL_EXISTS"


async def test_journal_invite_duplicate_pending_rejected(alice, bob, db):
    req_id = await _send_request(alice, bob, db)
    await bob.post(f"/friends/requests/{req_id}/accept")
    assert (await alice.post(f"/friends/{bob.user['_id']}/journal-invite")).status_code == 200
    # Mời lại cùng cặp khi đã có lời mời đang chờ → 409.
    r = await alice.post(f"/friends/{bob.user['_id']}/journal-invite")
    assert r.status_code == 409 and r.json()["error"]["code"] == "INVITE_EXISTS"


async def test_journal_invite_requires_login(anon, make_client):
    carol = await make_client("carol@example.com")
    # Chưa đăng nhập → 401 (chưa đến logic).
    assert (await anon.post(f"/friends/{uuid4()}/journal-invite")).status_code == 401
    # Carol chưa có bạn: gọi với uuid lạ → 422 NOT_FRIENDS (đã xác thực).
    assert (await carol.post(f"/friends/{uuid4()}/journal-invite")).status_code == 422


async def test_send_request_creates_pending_then_accepts(alice, bob, db):
    req_id = await _send_request(alice, bob, db)
    # Alice (người gửi) thấy ở hướng "outgoing".
    out = (await alice.get("/friends/requests")).json()
    assert [r["id"] for r in out["outgoing"]] == [req_id]
    assert out["outgoing"][0]["direction"] == "outgoing"
    assert out["outgoing"][0]["display_name"] == "bob"
    # Bob (người nhận) thấy ở hướng "incoming".
    inc = (await bob.get("/friends/requests")).json()
    assert [r["id"] for r in inc["incoming"]] == [req_id]
    assert inc["incoming"][0]["direction"] == "incoming"

    r = await bob.post(f"/friends/requests/{req_id}/accept")
    assert r.status_code == 204
    # Quan hệ chuyển accepted (chưa có sổ).
    doc = await db[c.FRIENDSHIPS].find_one({"_id": UUID(req_id)})
    assert doc["status"] == "accepted" and doc["journal_id"] is None
    assert (await alice.get("/friends")).json()["friends_count"] == 1


async def test_accept_creates_single_journal_when_both_click(alice, bob, db):
    """Hai người cùng chấp nhận lời mời mở sổ chỉ tạo đúng một cuốn (index unique member_key)."""
    req_id = await _send_request(alice, bob, db)
    assert (await bob.post(f"/friends/requests/{req_id}/accept")).status_code == 204
    invite = await alice.post(f"/friends/{bob.user['_id']}/journal-invite")
    invite_id = invite.json()["id"]
    # Chỉ người được mời (Bob) mới chấp nhận; bấm lần hai không còn pending → 404, chỉ một cuốn.
    assert (await bob.post(f"/journals/invites/{invite_id}/accept")).status_code == 204
    assert (await bob.post(f"/journals/invites/{invite_id}/accept")).status_code == 404
    assert await db[c.SHARED_JOURNALS].count_documents({"members.user_id": alice.user["_id"]}) == 1


async def test_already_friends_cannot_rerequest(alice, bob, db):
    await _make_journal(alice, bob, db)
    r = await alice.post("/friends/requests", json={"code": (await _codes(alice, bob, db))[1]})
    assert r.status_code == 409 and r.json()["error"]["code"] == "ALREADY_FRIENDS"


async def test_duplicate_pending_request_rejected(alice, bob, db):
    await _send_request(alice, bob, db)
    r = await alice.post("/friends/requests", json={"code": (await _codes(alice, bob, db))[1]})
    assert r.status_code == 409 and r.json()["error"]["code"] == "REQUEST_EXISTS"


async def test_unknown_code_is_404_without_leaking_reason(alice, db):
    r = await alice.post("/friends/requests", json={"code": BAD_CODE})
    assert r.status_code == 404
    assert r.json() == {"error": {"code": "NOT_FOUND", "message": "Không tìm thấy"}}
    # Mã không hợp lệ (quá ngắn) → lỗi kiểm tra kiểu, không phải 404.
    assert (await alice.post("/friends/requests", json={"code": "AB"})).status_code == 422


async def test_cannot_friend_self(alice, db):
    my_code = (await alice.get("/me/friend-code")).json()["friend_code"]
    r = await alice.post("/friends/requests", json={"code": my_code})
    assert r.status_code == 422 and r.json()["error"]["code"] == "SELF_REQUEST"


async def test_only_addressee_can_accept_or_decline(alice, bob, db):
    req_id = await _send_request(alice, bob, db)
    # Alice (người gửi) không được chấp nhận / từ chối yêu cầu mà mình gửi đi.
    assert (await alice.post(f"/friends/requests/{req_id}/accept")).status_code == 404
    assert (await alice.post(f"/friends/requests/{req_id}/decline")).status_code == 404
    # Bob (người nhận) từ chối → không có sổ.
    assert (await bob.post(f"/friends/requests/{req_id}/decline")).status_code == 204
    assert await db[c.SHARED_JOURNALS].count_documents({}) == 0
    # Từ chối lần hai → 404.
    assert (await bob.post(f"/friends/requests/{req_id}/decline")).status_code == 404


async def test_expired_request_cannot_be_accepted(alice, bob, db, monkeypatch):
    from app.services import friendships as f

    req_id = await _send_request(alice, bob, db)
    # Đẩy thời điểm tạo về quá hạn (mặc định 30 ngày) mà không sửa đồng hồ thật.
    monkeypatch.setattr(f, "get_limits", lambda: _limits_with_expiry(0))
    assert (await bob.post(f"/friends/requests/{req_id}/accept")).status_code == 404


def _limits_with_expiry(days):
    from app.core.limits import get_limits

    limits = get_limits()
    new_tiers = {}
    for name, tier in limits.tiers.items():
        shared = tier.shared.model_copy(update={"request_expires_days": days})
        new_tiers[name] = tier.model_copy(update={"shared": shared})
    return limits.model_copy(update={"tiers": new_tiers})


async def test_end_journal_sets_status_and_marks_relationship_ended(alice, bob, db):
    journal = await _make_journal(alice, bob, db)
    r = await alice.delete(f"/friends/{journal['_id']}")
    assert r.status_code == 204
    assert (await db[c.SHARED_JOURNALS].find_one({"_id": journal["_id"]}))["status"] == "ended"
    # Quan hệ chuyển ended; không xóa mục chung nào (hiệu lực tức thì, không xóa gì).
    assert (await db[c.FRIENDSHIPS].find_one({"journal_id": journal["_id"]}))["status"] == "ended"
    # Kết thúc lần nữa: vẫn 204 (chạy lại được) nhưng sổ đã ended.
    assert (await alice.delete(f"/friends/{journal['_id']}")).status_code == 204


async def test_end_journal_requires_membership(alice, bob, db, make_client):
    journal = await _make_journal(alice, bob, db)
    carol = await make_client("carol@example.com")
    r = await carol.delete(f"/friends/{journal['_id']}")
    assert r.status_code == 404


async def test_foreigners_cannot_read_or_mutate_requests(alice, bob, db, make_client):
    req_id = await _send_request(alice, bob, db)
    carol = await make_client("carol@example.com")
    # Carol không thấy yêu cầu của alice/bob.
    assert (await carol.get("/friends/requests")).json() == {"incoming": [], "outgoing": []}
    # Carol không chấp nhận được yêu cầu của người khác.
    assert (await carol.post(f"/friends/requests/{req_id}/accept")).status_code == 404


async def test_friends_list_is_empty_without_relationships(alice, db):
    data = (await alice.get("/friends")).json()
    assert data["friends"] == [] and data["friends_count"] == 0
    # Trần theo cấp (beta = 20/10) được trả về để hiện "x/y".
    assert data["friends_max"] == 20 and data["journals_max"] == 10


async def test_last_active_tracked_and_shown_on_friend_row(alice, bob, db):
    """Mỗi request đã đăng nhập cập nhật users.last_active; danh sách bạn + thẻ sổ hiện nó."""
    assert (await alice.get("/me/friend-code")).status_code == 200  # một request đã đăng nhập
    stored = await db[c.USERS].find_one({"_id": alice.user["_id"]}, {"last_active": 1})
    assert stored["last_active"] is not None

    # Bob (có last_active) vào danh sách bạn của Alice, kèm cờ mời mở sổ.
    req_id = await _send_request(alice, bob, db)
    await bob.post(f"/friends/requests/{req_id}/accept")
    row = (await alice.get("/friends")).json()["friends"][0]
    assert row["id"] == str(bob.user["_id"])
    assert row["last_active"] is not None
    assert row["journal_invite_pending"] is False

    # Mời mở sổ → cờ pending hiện trên cả hai bên.
    invite_id = (await alice.post(f"/friends/{bob.user['_id']}/journal-invite")).json()["id"]
    assert (await alice.get("/friends")).json()["friends"][0]["journal_invite_pending"] is True
    assert (await bob.get("/friends")).json()["friends"][0]["journal_invite_pending"] is True
    assert (await bob.post(f"/journals/invites/{invite_id}/accept")).status_code == 204

    # Thẻ sổ chung hiện last_active của người kia.
    jid = (await alice.get("/journals")).json()["journals"][0]["id"]
    assert (await bob.get(f"/journals/{jid}")).status_code == 200
    card = (await bob.get("/journals")).json()["journals"][0]
    assert card["partner_last_active"] is not None


async def test_write_requires_login(anon):
    assert (await anon.get("/me/friend-code")).status_code == 401
    assert (await anon.get("/friends")).status_code == 401
    assert (await anon.get("/friends/requests")).status_code == 401
    assert (await anon.post("/friends/requests", json={"code": "X"})).status_code == 401
    assert (await anon.post(f"/friends/requests/{uuid4()}/accept")).status_code == 401


async def test_write_without_csrf_is_forbidden(alice, bob, db):
    await _make_journal(alice, bob, db)
    del alice.headers["X-CSRF-Token"]
    assert (await alice.post("/me/friend-code/rotate")).status_code == 403
    assert (await alice.delete(f"/friends/{uuid4()}")).status_code == 403


async def test_send_request_rate_limited_by_ip(db, make_client):
    """Chặn dò mã: nhiều user cùng một IP chạm trần `friend_request_ip` (20/hour) trước khi một
    user chạm trần `friend_request` (10/day). Một user đơn lẻ không thể vượt trần IP vì trần user
    (10) nhỏ hơn trần IP (20) — nên phải chia đều cho nhiều user."""
    from limits import parse_many

    from app.core.limits import rate_limit
    from app.core.rate_limit import limiter

    ip_limit = parse_many(rate_limit("friend_request_ip"))[0].amount
    user_limit = parse_many(rate_limit("friend_request"))[0].amount
    per_user = user_limit - 3  # mỗi user ở mức an toàn, chưa chạm trần user
    n = (ip_limit + 1) // per_user + 1  # đủ user để tổng vượt trần IP
    clients = [await make_client(f"ip{i}@example.com") for i in range(n)]

    limiter.enabled = True
    limiter.reset()
    per_user_sent = [0] * n
    fired = False
    try:
        for i in range(ip_limit + 1):
            idx = i % n
            r = await clients[idx].post("/friends/requests", json={"code": BAD_CODE})
            if r.status_code == 429:
                fired = True
                break
            assert r.status_code == 404
            per_user_sent[idx] += 1
        assert fired
        # 429 đến từ trần IP: mọi user riêng lẻ vẫn dưới trần user (nếu chạm trần user thì đã 429 sớm hơn).
        assert max(per_user_sent) < user_limit
    finally:
        limiter.reset()
