import pytest

from app.core.catalog import get_flag_colors
from app.core.limits import get_limits
from app.db import collections as c

pytestmark = pytest.mark.anyio


async def test_me_requires_login(anon):
    assert (await anon.get("/me")).status_code == 401


async def test_me_returns_own_profile_without_internal_ids(alice, bob):
    me = (await alice.get("/me")).json()
    assert me["email"] == "alice@example.com"
    assert me["onboarded"] is True
    assert "google_sub" not in me and "id" not in me and "_id" not in me
    assert (await bob.get("/me")).json()["email"] == "bob@example.com"


async def test_patch_me_updates_fields(alice, db):
    r = await alice.patch(
        "/me",
        json={"display_name": "  An   Nguyễn ", "timezone": "Asia/Saigon", "icon_set_id": "sakura"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["display_name"] == "An Nguyễn"
    assert body["timezone"] == "Asia/Saigon"  # tên cũ Chromium trả về vẫn hợp lệ
    assert body["icon_set_id"] == "sakura"
    saved = await db[c.USERS].find_one({"_id": alice.user["_id"]})
    assert saved["icon_set_id"] == "sakura"


async def test_onboarding_flag_can_only_be_set(make_client):
    client = await make_client("new@example.com", onboarded_at=None)
    assert (await client.get("/me")).json()["onboarded"] is False
    assert (await client.patch("/me", json={"onboarded": True})).json()["onboarded"] is True
    assert (await client.patch("/me", json={"onboarded": False})).status_code == 422


async def test_avatar_can_only_be_removed(make_client):
    client = await make_client("pic@example.com", avatar_url="https://lh3.googleusercontent.com/a")
    assert (await client.patch("/me", json={"avatar_url": "https://evil.example/x.png"})).status_code == 422
    r = await client.patch("/me", json={"avatar_url": None})
    assert r.json()["avatar_url"] is None


@pytest.mark.parametrize(
    "body",
    [
        {"display_name": "   "},
        {"display_name": "a" * 51},
        {"timezone": "Mars/Olympus"},
        {"timezone": "../etc/passwd"},
        {"icon_set_id": "khong-co"},
        {"account_tier": "premium"},  # trường không cho sửa
        {"email": "x@example.com"},
        {"custom_flag_colors": ["red"]},
        {"custom_flag_colors": ["#3A7BD5", "#3a7bd5"]},  # trùng
        {"custom_flag_colors": [sorted(get_flag_colors().hexes)[0]]},  # đã có trong bảng màu
        {"custom_flag_colors": [{"$ne": None}]},
    ],
)
async def test_patch_me_rejects_invalid_input(alice, body):
    r = await alice.patch("/me", json=body)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_bob_cannot_change_alice(alice, bob, db):
    await bob.patch("/me", json={"display_name": "Bob mới"})
    saved = await db[c.USERS].find_one({"_id": alice.user["_id"]})
    assert saved["display_name"] == "alice"
    assert (await alice.get("/me")).json()["display_name"] == "alice"


async def test_custom_flag_colors_add_remove_and_new_user_starts_empty(alice, db):
    assert (await alice.get("/me")).json()["custom_flag_colors"] == []
    r = await alice.patch("/me", json={"custom_flag_colors": [" #3a7bd5", "#112233"]})
    assert r.status_code == 200
    assert r.json()["custom_flag_colors"] == ["#3A7BD5", "#112233"]
    r = await alice.patch("/me", json={"custom_flag_colors": ["#112233"]})  # gỡ một màu
    assert r.json()["custom_flag_colors"] == ["#112233"]
    saved = await db[c.USERS].find_one({"_id": alice.user["_id"]})
    assert saved["custom_flag_colors"] == ["#112233"]


async def test_custom_flag_colors_limit_comes_from_limits_json(alice):
    max_colors = get_limits().tier("beta").profile.custom_flag_colors_max
    many = [f"#0000{i:02X}" for i in range(max_colors + 1)]
    r = await alice.patch("/me", json={"custom_flag_colors": many[:max_colors]})
    assert r.status_code == 200
    r = await alice.patch("/me", json={"custom_flag_colors": many})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "FLAG_COLORS_LIMIT"


async def test_bob_cannot_change_alice_flag_colors(alice, bob):
    await bob.patch("/me", json={"custom_flag_colors": ["#ABCDEF"]})
    assert (await alice.get("/me")).json()["custom_flag_colors"] == []
