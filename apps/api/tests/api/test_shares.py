from datetime import UTC, datetime
from uuid import uuid4

import pytest
from limits import parse_many

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.db import collections as c

pytestmark = pytest.mark.anyio

DAY = "2026-10-18"
ALL_ON = {
    "show_name": True,
    "show_score": True,
    "show_sub_icon": True,
    "show_flag": True,
    "show_title": True,
    "show_content": True,
    "show_keywords": True,
    "photo_ids": [],
}
ONLY_TITLE = {**{k: False for k in ALL_ON if k != "photo_ids"}, "show_title": True, "photo_ids": []}


async def _entry(db, user, day=DAY, **extra):
    now = datetime.now(UTC)
    photo = {
        "id": uuid4(),
        "storage_key": "k",
        "thumb_key": "t",
        "width": 10,
        "height": 10,
        "size_bytes": 100,
        "position": 0,
        "created_at": now,
    }
    doc = {
        "_id": uuid4(),
        "user_id": user["_id"],
        "entry_date": day,
        "score": 4,
        "icon_set_id": "sprout",
        "sub_icon": "😌",
        "flag_color": "#D3A6CE",
        "title": "Chiều mưa đọc sách",
        "content": "Mưa từ trưa nên ở nhà đọc sách.",
        "keywords": [{"keyword": "mưa", "norm": "mua"}],
        "photos": [photo, {**photo, "id": uuid4(), "position": 1}],
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
        **extra,
    }
    await db[c.ENTRIES].insert_one(doc)
    return doc


async def _token(client, body=ALL_ON, day=DAY) -> str:
    r = await client.put(f"/entries/{day}/share", json=body)
    assert r.status_code == 200, r.text
    return r.json()["token"]


async def test_enable_share_then_read_list_and_update_keeps_token(alice, db):
    entry = await _entry(db, alice.user)
    assert (await alice.get(f"/entries/{DAY}/share")).json() is None

    body = {**ALL_ON, "show_keywords": False, "photo_ids": [str(entry["photos"][0]["id"])]}
    r = await alice.put(f"/entries/{DAY}/share", json=body)
    assert r.status_code == 200
    share = r.json()
    assert len(share["token"]) >= 22
    assert share["url"].endswith(f"/s/{share['token']}")
    assert share["show_keywords"] is False and share["photo_ids"] == body["photo_ids"]
    assert (await alice.get(f"/entries/{DAY}/share")).json()["token"] == share["token"]

    again = (await alice.put(f"/entries/{DAY}/share", json=ONLY_TITLE)).json()
    assert again["token"] == share["token"]
    assert again["show_content"] is False

    listed = (await alice.get("/shares")).json()
    assert [s["entry_date"] for s in listed] == [DAY]
    assert listed[0]["title"] == "Chiều mưa đọc sách" and listed[0]["photo_count"] == 2


async def test_turning_off_revokes_and_reenabling_gives_new_token(alice, anon, db):
    await _entry(db, alice.user)
    old = await _token(alice)
    assert (await alice.delete(f"/entries/{DAY}/share")).status_code == 204
    assert (await anon.get(f"/public/shares/{old}")).status_code == 404
    assert (await alice.get(f"/entries/{DAY}/share")).json() is None
    assert (await alice.delete(f"/entries/{DAY}/share")).status_code == 404
    new = await _token(alice)
    assert new != old
    assert (await anon.get(f"/public/shares/{new}")).status_code == 200


async def test_public_page_shows_only_selected_parts(alice, anon, db):
    entry = await _entry(db, alice.user)
    body = {**ONLY_TITLE, "show_score": True, "photo_ids": [str(entry["photos"][1]["id"])]}
    token = await _token(alice, body)

    r = await anon.get(f"/public/shares/{token}")
    assert r.status_code == 200
    data = r.json()
    assert data == {
        "entry_date": DAY,
        "title": "Chiều mưa đọc sách",
        "score": 4,
        "icon_set_id": "sprout",
        "photo_count": 1,
    }
    for header, value in {
        "x-robots-tag": "noindex, nofollow",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
    }.items():
        assert r.headers[header] == value


async def test_public_page_full_never_leaks_internal_ids(alice, anon, db):
    await _entry(db, alice.user)
    token = await _token(alice)
    data = (await anon.get(f"/public/shares/{token}")).json()
    assert data["author_name"] == "alice"
    assert data["content"] and data["keywords"] == ["mưa"] and data["flag_color"] == "#D3A6CE"
    text = str(data)
    assert str(alice.user["_id"]) not in text and "alice@example.com" not in text
    assert "user_id" not in data and "_id" not in data and "token" not in data


async def test_public_reflects_latest_entry_content(alice, anon, db):
    await _entry(db, alice.user)
    token = await _token(alice)
    await db[c.ENTRIES].update_one({"user_id": alice.user["_id"]}, {"$set": {"title": "Tiêu đề mới"}})
    assert (await anon.get(f"/public/shares/{token}")).json()["title"] == "Tiêu đề mới"


@pytest.mark.parametrize("case", ["unknown", "malformed", "soft_deleted", "account_deleted"])
async def test_public_not_found_is_uniform(alice, anon, db, case):
    await _entry(db, alice.user)
    token = await _token(alice)
    if case == "unknown":
        token = "A" * 22
    elif case == "malformed":
        token = "bad*token*" + "a" * 20  # ký tự ngoài base64url
    elif case == "soft_deleted":
        await db[c.ENTRIES].update_one(
            {"user_id": alice.user["_id"]}, {"$set": {"deleted_at": datetime.now(UTC)}}
        )
    else:
        await db[c.USERS].update_one({"_id": alice.user["_id"]}, {"$set": {"deleted_at": datetime.now(UTC)}})
    r = await anon.get(f"/public/shares/{token}")
    assert r.status_code == 404
    assert r.json() == {"error": {"code": "NOT_FOUND", "message": "Không tìm thấy"}}
    assert r.headers["cache-control"] == "no-store"


async def test_soft_deleted_entry_disappears_from_list(alice, db):
    await _entry(db, alice.user)
    await _token(alice)
    await db[c.ENTRIES].update_one(
        {"user_id": alice.user["_id"]}, {"$set": {"deleted_at": datetime.now(UTC)}}
    )
    assert (await alice.get("/shares")).json() == []
    assert (await alice.get(f"/entries/{DAY}/share")).json() is None


async def test_cannot_share_missing_or_deleted_entry(alice, db):
    r = await alice.put(f"/entries/{DAY}/share", json=ALL_ON)
    assert r.status_code == 404 and r.json()["error"]["code"] == "ENTRY_NOT_FOUND"
    await _entry(db, alice.user, deleted_at=datetime.now(UTC))
    assert (await alice.put(f"/entries/{DAY}/share", json=ALL_ON)).status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {**ALL_ON, "show_title": "có"},  # không phải bool
        {k: v for k, v in ALL_ON.items() if k != "show_title"},  # thiếu trường
        {**ALL_ON, "token": "tu-dat-token-cho-minh-12345"},  # trường lạ
        {**ALL_ON, "user_id": str(uuid4())},
        {**ALL_ON, "photo_ids": ["khong-phai-uuid"]},
        {**ALL_ON, "show_title": {"$ne": None}},
    ],
)
async def test_invalid_body_is_rejected(alice, db, body):
    await _entry(db, alice.user)
    r = await alice.put(f"/entries/{DAY}/share", json=body)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_invalid_date_and_foreign_photo_are_rejected(alice, db):
    await _entry(db, alice.user)
    assert (await alice.put("/entries/18-10-2026/share", json=ALL_ON)).status_code == 422
    r = await alice.put(f"/entries/{DAY}/share", json={**ALL_ON, "photo_ids": [str(uuid4())]})
    assert r.status_code == 422


async def test_at_least_one_part_must_be_shared(alice, db):
    await _entry(db, alice.user)
    only_name = {**{k: False for k in ALL_ON if k != "photo_ids"}, "show_name": True, "photo_ids": []}
    r = await alice.put(f"/entries/{DAY}/share", json=only_name)
    assert r.status_code == 422 and r.json()["error"]["code"] == "SHARE_EMPTY"


async def test_bob_cannot_read_change_or_revoke_alice_share(alice, bob, anon, db):
    await _entry(db, alice.user)
    token = await _token(alice)
    assert (await bob.get(f"/entries/{DAY}/share")).json() is None
    assert (await bob.get("/shares")).json() == []
    assert (await bob.delete(f"/entries/{DAY}/share")).status_code == 404
    # Bob không có nhật ký ngày này → không bật được, và không đụng tới link của Alice.
    assert (await bob.put(f"/entries/{DAY}/share", json=ONLY_TITLE)).status_code == 404
    data = (await anon.get(f"/public/shares/{token}")).json()
    assert data["content"]  # vẫn là phần Alice chọn
    assert (await alice.get(f"/entries/{DAY}/share")).json()["token"] == token


async def test_write_without_csrf_is_forbidden(alice, db):
    await _entry(db, alice.user)
    del alice.headers["X-CSRF-Token"]
    r = await alice.put(f"/entries/{DAY}/share", json=ALL_ON)
    assert r.status_code == 403 and r.json()["error"]["code"] == "CSRF_FAILED"
    assert (await alice.delete(f"/entries/{DAY}/share")).status_code == 403


async def test_owner_endpoints_require_login(anon):
    assert (await anon.get(f"/entries/{DAY}/share")).status_code == 401
    assert (await anon.get("/shares")).status_code == 401
    assert (await anon.put(f"/entries/{DAY}/share", json=ALL_ON)).status_code == 401


async def test_public_view_is_rate_limited_by_ip(alice, anon, db):
    await _entry(db, alice.user)
    token = await _token(alice)
    allowed = parse_many(rate_limit("share_view"))[0].amount
    limiter.enabled = True
    limiter.reset()
    try:
        for _ in range(allowed):
            assert (await anon.get(f"/public/shares/{token}")).status_code == 200
        r = await anon.get(f"/public/shares/{token}")
        assert r.status_code == 429
        assert r.json()["error"]["code"] == "RATE_LIMITED"
    finally:
        limiter.reset()


async def test_list_reports_which_parts_exist_without_content(alice, db):
    await _entry(db, alice.user)
    await _entry(db, alice.user, day="2026-10-17", content="  \n ", keywords=[])
    await _token(alice)
    await _token(alice, ONLY_TITLE, day="2026-10-17")
    listed = {s["entry_date"]: s for s in (await alice.get("/shares")).json()}
    assert listed[DAY]["has_content"] is True and listed[DAY]["keyword_count"] == 1
    assert listed["2026-10-17"]["has_content"] is False and listed["2026-10-17"]["keyword_count"] == 0
    assert "content" not in listed[DAY] and "keywords" not in listed[DAY]
