"""Sổ chung (ADR 0007, F-11): mục chung, chuỗi ấm, badge đồng bộ, quyền riêng tư, ảnh chung."""

from datetime import UTC, date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest

from app.db import collections as c
from app.services.entries import user_today
from tests.fakes import WEBP

pytestmark = pytest.mark.anyio

DAY = "2026-10-10"
YESTERDAY = "2026-10-09"


def _key(url: str) -> str:
    """Key trong URL giả của FakeStorage: https://s3.test/<bucket>/<key>?..."""
    return url.split("/test-bucket/", 1)[1].split("?", 1)[0]


async def _journal(alice, bob, db):
    """Hai người bạn + một cuốn sổ chung active (kết bạn → mời mở sổ → hai bên chấp nhận)."""
    code = (await bob.get("/me/friend-code")).json()["friend_code"]
    r = await alice.post("/friends/requests", json={"code": code})
    assert r.status_code == 200, r.text
    r = await bob.post(f"/friends/requests/{r.json()['id']}/accept")
    assert r.status_code == 204, r.text
    invite_id = (await alice.post(f"/friends/{bob.user['_id']}/journal-invite")).json()["id"]
    r = await bob.post(f"/journals/invites/{invite_id}/accept")
    assert r.status_code == 204, r.text
    journal = await db[c.SHARED_JOURNALS].find_one({"members.user_id": alice.user["_id"]})
    assert journal is not None
    return journal["_id"]


async def _write(client, journal_id, day=DAY, **body):
    payload = {"score": 4, **body}
    r = await client.put(f"/journals/{journal_id}/entries/{day}", json=payload)
    return r


async def _backdate(db, journal_id, day: str, user_id, *, same_day: bool = True):
    """Đặt `created_at` của mục trong một ngày: ghi đúng ngày (mặc định) hoặc ghi bù (viết muộn).

    `created_at` quyết định mục đó có nối vào chuỗi ấm hay không, nên test chuỗi phải kiểm soát
    nó (giống test_calendar.py cho nhật ký cá nhân).
    """
    tz = ZoneInfo("Asia/Ho_Chi_Minh")
    base = date.fromisoformat(day) + timedelta(days=0 if same_day else 3)
    created = datetime.combine(base, datetime.min.time(), tz).replace(hour=21).astimezone(UTC)
    await db[c.SHARED_ENTRIES].update_one(
        {"journal_id": journal_id, "author_id": user_id, "entry_date": day},
        {"$set": {"created_at": created}},
    )


async def test_write_and_read_own_entry(alice, bob, db):
    jid = await _journal(alice, bob, db)
    r = await _write(alice, jid, title="Chung", content="Nội dung")
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["entry_date"] == DAY and out["score"] == 4
    assert out["title"] == "Chung" and out["content"] == "Nội dung"
    assert out["mine"] is True
    assert out["author_display_name"] == "alice"
    # Không lộ id nội bộ (author_id, storage_key, journal_id).
    assert "author_id" not in out and "journal_id" not in out and "storage_key" not in out


async def test_partner_sees_my_entry_but_not_my_personal_journal(alice, bob, db):
    jid = await _journal(alice, bob, db)
    await _write(alice, jid, title="Chung")
    await _write(bob, jid, title="Của Bob")

    data = (await bob.get(f"/journals/{jid}/entries")).json()
    assert {e["title"] for e in data["entries"]} == {"Chung", "Của Bob"}
    by_title = {e["title"]: e for e in data["entries"]}
    assert by_title["Chung"]["mine"] is False  # mục của Alice
    assert by_title["Của Bob"]["mine"] is True  # mục của Bob
    assert by_title["Chung"]["author_display_name"] == "alice"


async def test_journal_entries_newest_first(alice, bob, db):
    jid = await _journal(alice, bob, db)
    for day in ("2026-10-01", "2026-10-05", "2026-10-09"):
        assert (await _write(alice, jid, day=day)).status_code == 200
    days = [e["entry_date"] for e in (await alice.get(f"/journals/{jid}/entries")).json()["entries"]]
    assert days == sorted(days, reverse=True)


async def test_one_entry_per_author_per_day(alice, bob, db):
    jid = await _journal(alice, bob, db)
    created = (await _write(alice, jid)).json()
    # Cùng người, cùng ngày: tạo lại không kèm updated_at → xung đột (giật như trang cá nhân).
    assert (await _write(alice, jid, title="Sửa")).status_code == 409
    # Có updated_at đã biết → sửa (không tạo bản thứ hai).
    r = await _write(alice, jid, title="Sửa", updated_at=created["updated_at"])
    assert r.status_code == 200 and r.json()["title"] == "Sửa"
    assert (
        await db[c.SHARED_ENTRIES].count_documents({"journal_id": jid, "author_id": alice.user["_id"]}) == 1
    )
    # Người khác cùng ngày vẫn ghi được (mỗi người một mục).
    assert (await _write(bob, jid)).status_code == 200


async def test_optimistic_conflict_on_stale_updated_at(alice, bob, db):
    jid = await _journal(alice, bob, db)
    created = (await _write(alice, jid)).json()
    stale = created["updated_at"]
    # Sửa một lần → updated_at đổi.
    r = await alice.put(f"/journals/{jid}/entries/{DAY}", json={"score": 5, "updated_at": stale})
    assert r.status_code == 200
    # Máy khác còn giữ bản cũ → 409.
    r = await alice.put(f"/journals/{jid}/entries/{DAY}", json={"score": 3, "updated_at": stale})
    assert r.status_code == 409 and r.json()["error"]["code"] == "ENTRY_CONFLICT"


async def test_future_date_rejected(alice, bob, db):
    jid = await _journal(alice, bob, db)
    tomorrow = (user_today("Asia/Ho_Chi_Minh") + timedelta(days=1)).isoformat()
    r = await _write(alice, jid, day=tomorrow)
    assert r.status_code == 422 and r.json()["error"]["code"] == "ENTRY_FUTURE_DATE"


async def test_content_limits_are_enforced(alice, bob, db):
    jid = await _journal(alice, bob, db)
    limits = 60  # shared.title_max của mọi cấp
    r = await _write(alice, jid, title="x" * (limits + 1))
    assert r.status_code == 422 and r.json()["error"]["code"] == "ENTRY_LIMIT_TITLE"
    r = await _write(alice, jid, content="x" * 501)
    assert r.status_code == 422 and r.json()["error"]["code"] == "ENTRY_LIMIT_CONTENT"


async def test_invalid_payload_is_422(alice, bob, db):
    jid = await _journal(alice, bob, db)
    assert (await alice.put(f"/journals/{jid}/entries/{DAY}", json={"score": 9})).status_code == 422
    assert (await alice.put(f"/journals/{jid}/entries/{DAY}", json={"score": 4, "x": 1})).status_code == 422


async def test_outsider_sees_404_not_403(alice, bob, db, make_client):
    """Không thuộc sổ → 404 (không rò rỉ sự tồn tại)."""
    jid = await _journal(alice, bob, db)
    carol = await make_client("carol@example.com")
    assert (await carol.get(f"/journals/{jid}")).status_code == 404
    assert (await carol.get(f"/journals/{jid}/entries")).status_code == 404
    assert (await carol.put(f"/journals/{jid}/entries/{DAY}", json={"score": 4})).status_code == 404
    assert (await carol.delete(f"/journals/{jid}/entries/{DAY}")).status_code == 404
    assert (await carol.get("/journals")).json()["journals"] == []


async def test_unknown_journal_is_404(alice, db):
    assert (await alice.get(f"/journals/{uuid4()}")).status_code == 404


async def test_delete_is_soft_and_hides_entry(alice, bob, db):
    jid = await _journal(alice, bob, db)
    await _write(alice, jid, title="Sẽ xóa")
    assert (await alice.delete(f"/journals/{jid}/entries/{DAY}")).status_code == 204
    # Không còn trong danh sách nhưng document còn (khôi phục được).
    assert (await alice.get(f"/journals/{jid}/entries")).json()["entries"] == []
    doc = await db[c.SHARED_ENTRIES].find_one({"journal_id": jid, "author_id": alice.user["_id"]})
    assert doc["deleted_at"] is not None
    # Xóa lần hai → 404 (đã bị xóa mềm).
    assert (await alice.delete(f"/journals/{jid}/entries/{DAY}")).status_code == 404


async def test_cannot_delete_partner_entry(alice, bob, db):
    jid = await _journal(alice, bob, db)
    await _write(bob, jid, title="Của Bob")
    # Alice xóa mục của Bob → không tìm thấy mục của mình ở ngày đó → 404.
    assert (await alice.delete(f"/journals/{jid}/entries/{DAY}")).status_code == 404
    assert (await bob.get(f"/journals/{jid}/entries")).json()["entries"][0]["title"] == "Của Bob"


async def test_ended_journal_hides_partner_entries_but_keeps_own(alice, bob, db):
    jid = await _journal(alice, bob, db)
    await _write(alice, jid, title="Của Alice")
    await _write(bob, jid, title="Của Bob")
    assert (await alice.delete(f"/friends/{jid}")).status_code == 204

    # Bob (người còn lại) chỉ thấy mục của chính mình.
    bob_view = (await bob.get(f"/journals/{jid}/entries")).json()["entries"]
    assert [e["title"] for e in bob_view] == ["Của Bob"]
    # Alice thấy mục của chính mình.
    alice_view = (await alice.get(f"/journals/{jid}/entries")).json()["entries"]
    assert [e["title"] for e in alice_view] == ["Của Alice"]
    # Không viết thêm vào sổ đã kết thúc.
    r = await _write(bob, jid, day=YESTERDAY)
    assert r.status_code == 422 and r.json()["error"]["code"] == "JOURNAL_ENDED"


async def test_journal_detail_lists_members_and_status(alice, bob, db):
    jid = await _journal(alice, bob, db)
    data = (await alice.get(f"/journals/{jid}")).json()
    assert data["status"] == "active"
    assert data["partner_display_name"] == "bob"
    names = {m["display_name"] for m in data["members"]}
    assert names == {"alice", "bob"}


async def test_warm_streak_counts_days_with_any_entry(alice, bob, db):
    jid = await _journal(alice, bob, db)
    # 3 ngày liên tiếp, mỗi ngày một người viết (không cần cả hai), ghi đúng ngày.
    today = user_today("Asia/Ho_Chi_Minh")
    for i in range(3):
        day = (today - timedelta(days=i)).isoformat()
        client = alice if i % 2 == 0 else bob
        assert (await _write(client, jid, day=day)).status_code == 200
        await _backdate(db, jid, day, client.user["_id"])
    data = (await alice.get(f"/journals/{jid}")).json()
    assert data["warm_streak"] == 3
    assert data["longest_warm_streak"] == 3


async def test_synced_days_counts_days_both_wrote(alice, bob, db):
    jid = await _journal(alice, bob, db)
    today = user_today("Asia/Ho_Chi_Minh")
    d0 = (today - timedelta(days=1)).isoformat()
    d1 = (today - timedelta(days=2)).isoformat()
    await _write(alice, jid, day=d0)
    await _write(bob, jid, day=d0)  # cả hai cùng ngày → đồng bộ
    await _write(alice, jid, day=d1)  # chỉ một người
    data = (await alice.get(f"/journals/{jid}")).json()
    assert data["synced_days"] == 1


async def test_streak_breaks_on_gap(alice, bob, db):
    jid = await _journal(alice, bob, db)
    today = user_today("Asia/Ho_Chi_Minh")
    # Hôm nay và hôm kia: có; 3 ngày trước: có; nhưng thiếu "hôm qua" → chuỗi hiện tại đứt.
    for off in (0, 2):
        day = (today - timedelta(days=off)).isoformat()
        await _write(alice, jid, day=day)
        await _backdate(db, jid, day, alice.user["_id"])
    data = (await alice.get(f"/journals/{jid}")).json()
    assert data["warm_streak"] == 1
    assert data["longest_warm_streak"] == 1


async def test_backfilled_entry_does_not_extend_streak(alice, bob, db):
    """Mục viết muộn hẳn cho ngày đã qua không nối chuỗi (giống nhật ký cá nhân)."""
    jid = await _journal(alice, bob, db)
    today = user_today("Asia/Ho_Chi_Minh")
    await _write(alice, jid, day=today.isoformat())
    # Ghi ngày 3 ngày trước nhưng created_at = hôm nay → ghi bù.
    await _write(alice, jid, day=(today - timedelta(days=3)).isoformat())
    doc = await db[c.SHARED_ENTRIES].find_one(
        {"journal_id": jid, "entry_date": (today - timedelta(days=3)).isoformat()}
    )
    doc["created_at"] = datetime.now(UTC)
    await db[c.SHARED_ENTRIES].update_one({"_id": doc["_id"]}, {"$set": {"created_at": doc["created_at"]}})
    data = (await alice.get(f"/journals/{jid}")).json()
    assert data["warm_streak"] == 1  # không nối từ hôm nay về 3 ngày trước


async def test_my_today_entry_flag(alice, bob, db):
    jid = await _journal(alice, bob, db)
    today = user_today("Asia/Ho_Chi_Minh")
    assert (await alice.get(f"/journals/{jid}")).json()["my_today_entry"] is False
    await _write(alice, jid, day=today.isoformat())
    assert (await alice.get(f"/journals/{jid}")).json()["my_today_entry"] is True


async def test_journals_list_only_mine(alice, bob, db, make_client):
    jid = await _journal(alice, bob, db)
    carol = await make_client("carol@example.com")
    assert (await carol.get("/journals")).json()["journals"] == []
    mine = (await alice.get("/journals")).json()
    assert [j["id"] for j in mine["journals"]] == [str(jid)]
    assert mine["journals_count"] == 1
    assert mine["journals_max"] == 10


async def test_pagination_cursor(alice, bob, db, monkeypatch):
    jid = await _journal(alice, bob, db)
    from app.services import shared_journals as sj

    monkeypatch.setattr(sj, "PAGE_SIZE", 2, raising=False)
    for i in range(5):
        day = (date(2026, 9, 1) + timedelta(days=i)).isoformat()
        assert (await _write(alice, jid, day=day)).status_code == 200
    first = (await alice.get(f"/journals/{jid}/entries")).json()
    assert len(first["entries"]) == 2 and first["next_cursor"]
    second = (await alice.get(f"/journals/{jid}/entries?cursor={first['next_cursor']}")).json()
    assert len(second["entries"]) == 2
    # Không trùng giữa hai trang.
    ids1 = {e["entry_date"] for e in first["entries"]}
    ids2 = {e["entry_date"] for e in second["entries"]}
    assert not (ids1 & ids2)
    # Con trỏ sai → 422.
    assert (await alice.get(f"/journals/{jid}/entries?cursor=rach")).status_code == 422


async def test_shared_photo_upload_confirm_and_read(alice, bob, db, s3):
    jid = await _journal(alice, bob, db)
    await _write(alice, jid)
    r = await alice.post(f"/journals/{jid}/photos/upload-url?day={DAY}", json={"content_type": "image/webp"})
    assert r.status_code == 200, r.text
    up = r.json()
    s3.put(_key(up["upload_url"]), WEBP)
    s3.put(_key(up["thumb_upload_url"]), WEBP)
    # Key nằm dưới tiền tố {user_id}/shared/ → tác vụ xóa tài khoản dọn được.
    assert _key(up["upload_url"]).startswith(f"{alice.user['_id']}/shared/")

    r = await alice.post(
        f"/journals/{jid}/photos?day={DAY}",
        json={
            "photo_id": up["photo_id"],
            "content_type": "image/webp",
            "width": 1600,
            "height": 1200,
        },
    )
    assert r.status_code == 200, r.text
    photos = r.json()["photos"]
    assert len(photos) == 1 and photos[0]["id"] == up["photo_id"]
    # Link ký có hạn.
    assert photos[0]["url"] and photos[0]["thumb_url"]


async def test_shared_photo_limit_is_two(alice, bob, db, s3):
    """Tối đa 2 ảnh mỗi mục chung (nhẹ hơn trang nhật ký): trần tính trên ảnh đã xác nhận."""
    jid = await _journal(alice, bob, db)
    await _write(alice, jid)
    for _ in range(2):
        r = await alice.post(
            f"/journals/{jid}/photos/upload-url?day={DAY}", json={"content_type": "image/webp"}
        )
        assert r.status_code == 200
        up = r.json()
        s3.put(_key(up["upload_url"]), WEBP)
        s3.put(_key(up["thumb_upload_url"]), WEBP)
        r = await alice.post(
            f"/journals/{jid}/photos?day={DAY}",
            json={
                "photo_id": up["photo_id"],
                "content_type": "image/webp",
                "width": 1600,
                "height": 1200,
            },
        )
        assert r.status_code == 200, r.text
    # Ảnh thứ ba → chặn.
    r = await alice.post(f"/journals/{jid}/photos/upload-url?day={DAY}", json={"content_type": "image/webp"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "ENTRY_LIMIT_PHOTOS"


async def test_shared_photo_requires_entry_first(alice, bob, db, s3):
    jid = await _journal(alice, bob, db)
    r = await alice.post(f"/journals/{jid}/photos/upload-url?day={DAY}", json={"content_type": "image/webp"})
    assert r.status_code == 404 and r.json()["error"]["code"] == "ENTRY_NOT_FOUND"


async def test_delete_shared_photo(alice, bob, db, s3):
    jid = await _journal(alice, bob, db)
    await _write(alice, jid)
    r = await alice.post(f"/journals/{jid}/photos/upload-url?day={DAY}", json={"content_type": "image/webp"})
    up = r.json()
    s3.put(_key(up["upload_url"]), WEBP)
    s3.put(_key(up["thumb_upload_url"]), WEBP)
    await alice.post(
        f"/journals/{jid}/photos?day={DAY}",
        json={
            "photo_id": up["photo_id"],
            "content_type": "image/webp",
            "width": 1600,
            "height": 1200,
        },
    )
    # Xóa ảnh chung qua cùng URL /photos/{id} với ảnh cá nhân.
    assert (await alice.delete(f"/photos/{up['photo_id']}")).status_code == 204
    entries = (await alice.get(f"/journals/{jid}/entries")).json()["entries"]
    assert entries[0]["photos"] == []
    # Ảnh đã xóa khỏi kho.
    assert _key(up["upload_url"]) not in await s3.list_keys(f"{alice.user['_id']}/")


async def test_partner_cannot_delete_my_shared_photo(alice, bob, db, s3):
    jid = await _journal(alice, bob, db)
    await _write(alice, jid)
    r = await alice.post(f"/journals/{jid}/photos/upload-url?day={DAY}", json={"content_type": "image/webp"})
    up = r.json()
    s3.put(_key(up["upload_url"]), WEBP)
    s3.put(_key(up["thumb_upload_url"]), WEBP)
    await alice.post(
        f"/journals/{jid}/photos?day={DAY}",
        json={
            "photo_id": up["photo_id"],
            "content_type": "image/webp",
            "width": 1600,
            "height": 1200,
        },
    )
    # Bob không xóa được ảnh của Alice.
    assert (await bob.delete(f"/photos/{up['photo_id']}")).status_code == 404


async def test_journal_endpoints_need_login(anon):
    assert (await anon.get("/journals")).status_code == 401
    assert (await anon.get(f"/journals/{uuid4()}")).status_code == 401
    assert (await anon.get(f"/journals/{uuid4()}/entries")).status_code == 401
    assert (await anon.put(f"/journals/{uuid4()}/entries/{DAY}", json={"score": 4})).status_code == 401


async def test_write_without_csrf_is_forbidden(alice, bob, db):
    jid = await _journal(alice, bob, db)
    del alice.headers["X-CSRF-Token"]
    assert (await alice.put(f"/journals/{jid}/entries/{DAY}", json={"score": 4})).status_code == 403
