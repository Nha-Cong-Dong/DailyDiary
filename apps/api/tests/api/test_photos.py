from uuid import uuid4

import pytest

from app.core.limits import get_limits
from app.db import collections as c
from app.services import photos as photo_service
from tests.fakes import JPEG, PNG, WEBP

pytestmark = pytest.mark.anyio

DAY = "2026-10-10"
LIMITS = get_limits().tier("beta")


async def _entry(client, day=DAY):
    r = await client.put(f"/entries/{day}", json={"score": 4})
    assert r.status_code == 200, r.text
    return r.json()


def _key(url: str) -> str:
    """Key trong URL giả của FakeStorage: https://s3.test/<bucket>/<key>?..."""
    return url.split("/test-bucket/", 1)[1].split("?", 1)[0]


async def _upload(client, s3, day=DAY, body=WEBP, thumb=WEBP, content_type="image/webp", **confirm):
    r = await client.post(f"/entries/{day}/photos/upload-url", json={"content_type": content_type})
    assert r.status_code == 200, r.text
    up = r.json()
    s3.put(_key(up["upload_url"]), body)
    s3.put(_key(up["thumb_upload_url"]), thumb)
    payload = {
        "photo_id": up["photo_id"],
        "content_type": content_type,
        "width": 1600,
        "height": 1200,
        **confirm,
    }
    return up, await client.post(f"/entries/{day}/photos", json=payload)


async def test_upload_confirm_then_read_with_signed_urls(alice, s3):
    await _entry(alice)
    up, r = await _upload(alice, s3)
    assert r.status_code == 200, r.text
    assert up["headers"] == {"Content-Type": "image/webp"}
    main, thumb = _key(up["upload_url"]), _key(up["thumb_upload_url"])
    user_id = str(alice.user["_id"])
    assert main == f"{user_id}/2026/10/10/{up['photo_id']}.webp"
    assert thumb == f"{user_id}/2026/10/10/{up['photo_id']}_thumb.webp"

    photo = (await alice.get(f"/entries/{DAY}")).json()["photos"][0]
    assert photo["id"] == up["photo_id"] and photo["position"] == 0
    assert (photo["width"], photo["height"]) == (1600, 1200)
    assert photo["url"].endswith(f"{main}?signed") and photo["thumb_url"].endswith(f"{thumb}?signed")


async def test_jpeg_fallback_is_accepted(alice, s3):
    await _entry(alice)
    up, r = await _upload(alice, s3, body=JPEG, thumb=JPEG, content_type="image/jpeg")
    assert r.status_code == 200
    assert _key(up["upload_url"]).endswith(".jpg")


async def test_photo_does_not_bump_entry_updated_at(alice, s3):
    entry = await _entry(alice)
    await _upload(alice, s3)
    assert (await alice.get(f"/entries/{DAY}")).json()["updated_at"] == entry["updated_at"]


async def test_confirm_twice_is_idempotent(alice, s3):
    await _entry(alice)
    up, _ = await _upload(alice, s3)
    payload = {"photo_id": up["photo_id"], "content_type": "image/webp", "width": 10, "height": 10}
    r = await alice.post(f"/entries/{DAY}/photos", json=payload)
    assert r.status_code == 200 and len(r.json()["photos"]) == 1


async def test_eleventh_photo_is_rejected(alice, s3, db):
    await _entry(alice)
    for _ in range(LIMITS.photos.per_day_max):
        _, r = await _upload(alice, s3)
        assert r.status_code == 200
    r = await alice.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "ENTRY_LIMIT_PHOTOS"
    doc = await db[c.ENTRIES].find_one({"user_id": alice.user["_id"]})
    assert [p["position"] for p in doc["photos"]] == list(range(LIMITS.photos.per_day_max))


async def test_eleventh_confirm_is_rejected_and_object_deleted(alice, s3):
    """Xin URL lúc còn chỗ nhưng xác nhận khi đã đủ (vd. hai tab): ảnh thừa bị từ chối và xóa khỏi kho."""
    await _entry(alice)
    for _ in range(LIMITS.photos.per_day_max - 1):
        await _upload(alice, s3)
    r = await alice.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    late = r.json()
    _, r = await _upload(alice, s3)  # ảnh thứ 10 chen vào trước
    assert r.status_code == 200
    s3.put(_key(late["upload_url"]), WEBP)
    s3.put(_key(late["thumb_upload_url"]), WEBP)
    payload = {"photo_id": late["photo_id"], "content_type": "image/webp", "width": 10, "height": 10}
    r = await alice.post(f"/entries/{DAY}/photos", json=payload)
    assert r.status_code == 422 and r.json()["error"]["code"] == "ENTRY_LIMIT_PHOTOS"
    assert _key(late["upload_url"]) not in s3.objects


@pytest.mark.parametrize(
    ("body", "thumb"),
    [
        (PNG, WEBP),  # PNG đổi tên thành WebP
        (b"<html>not an image</html>" * 4, WEBP),
        (WEBP, JPEG),  # ảnh thu nhỏ khác định dạng đã khai
    ],
)
async def test_fake_format_is_rejected_and_deleted(alice, s3, body, thumb):
    await _entry(alice)
    up, r = await _upload(alice, s3, body=body, thumb=thumb)
    assert r.status_code == 422 and r.json()["error"]["code"] == "PHOTO_INVALID"
    assert _key(up["upload_url"]) not in s3.objects and _key(up["thumb_upload_url"]) not in s3.objects
    assert (await alice.get(f"/entries/{DAY}")).json()["photos"] == []


async def test_too_large_file_is_rejected(alice, s3):
    await _entry(alice)
    big = WEBP + b"\x00" * LIMITS.photos.main_max_bytes
    up, r = await _upload(alice, s3, body=big)
    assert r.status_code == 422 and r.json()["error"]["code"] == "PHOTO_INVALID"
    assert _key(up["upload_url"]) not in s3.objects

    _, r = await _upload(alice, s3, thumb=WEBP + b"\x00" * LIMITS.photos.thumb_max_bytes)
    assert r.status_code == 422


async def test_too_wide_photo_is_rejected(alice, s3):
    await _entry(alice)
    _, r = await _upload(alice, s3, width=LIMITS.photos.main_max_edge_px + 1)
    assert r.status_code == 422


async def test_confirm_without_upload_is_rejected(alice):
    await _entry(alice)
    r = await alice.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    payload = {"photo_id": r.json()["photo_id"], "content_type": "image/webp", "width": 10, "height": 10}
    r = await alice.post(f"/entries/{DAY}/photos", json=payload)
    assert r.status_code == 422 and r.json()["error"]["code"] == "PHOTO_INVALID"


@pytest.mark.parametrize(
    "body",
    [
        {"content_type": "image/png"},
        {"content_type": "image/heic"},
        {"content_type": "image/webp", "key": "x/y.webp"},
        {},
    ],
)
async def test_upload_url_rejects_invalid_body(alice, body):
    await _entry(alice)
    assert (await alice.post(f"/entries/{DAY}/photos/upload-url", json=body)).status_code == 422


async def test_upload_needs_existing_entry(alice):
    r = await alice.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    assert r.status_code == 404


def _with_quota(monkeypatch, quota: int) -> None:
    real = photo_service.get_limits()
    tier = real.tier("beta")
    small = tier.model_copy(update={"storage": tier.storage.model_copy(update={"quota_bytes": quota})})
    fake = real.model_copy(update={"tiers": {**real.tiers, "beta": small}})
    monkeypatch.setattr(photo_service, "get_limits", lambda: fake)


async def test_storage_quota(alice, s3, monkeypatch):
    await _entry(alice)
    await _upload(alice, s3)
    used = len(WEBP) * 2
    _with_quota(monkeypatch, used + len(WEBP))  # còn chỗ cho nửa ảnh
    r = await alice.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    assert r.status_code == 200
    _, r = await _upload(alice, s3)
    assert r.status_code == 422 and r.json()["error"]["code"] == "STORAGE_QUOTA"
    _with_quota(monkeypatch, used)
    r = await alice.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "STORAGE_QUOTA"


async def test_bob_cannot_confirm_into_alice_storage_or_delete_her_photo(alice, bob, s3):
    await _entry(alice)
    await _entry(bob)
    up, _ = await _upload(alice, s3)
    photo_id = up["photo_id"]

    # Bob gửi photo_id của Alice: key dựng từ phiên của Bob nên không trỏ được tới file của Alice.
    payload = {"photo_id": photo_id, "content_type": "image/webp", "width": 10, "height": 10}
    r = await bob.post(f"/entries/{DAY}/photos", json=payload)
    assert r.status_code == 422
    assert _key(up["upload_url"]) in s3.objects  # file của Alice còn nguyên

    assert (await bob.delete(f"/photos/{photo_id}")).status_code == 404
    order = {"photo_ids": [photo_id]}
    assert (await bob.patch(f"/entries/{DAY}/photos/order", json=order)).status_code == 422
    assert len((await alice.get(f"/entries/{DAY}")).json()["photos"]) == 1
    assert (await bob.get(f"/entries/{DAY}")).json()["photos"] == []


async def test_reorder(alice, s3):
    await _entry(alice)
    ids = [(await _upload(alice, s3))[0]["photo_id"] for _ in range(3)]
    r = await alice.patch(f"/entries/{DAY}/photos/order", json={"photo_ids": ids[::-1]})
    assert r.status_code == 200
    assert [p["id"] for p in r.json()["photos"]] == ids[::-1]
    assert [p["position"] for p in r.json()["photos"]] == [0, 1, 2]

    for bad in (ids[:2], [*ids, ids[0]], [*ids[:2], str(uuid4())]):
        r = await alice.patch(f"/entries/{DAY}/photos/order", json={"photo_ids": bad})
        assert r.status_code == 422 and r.json()["error"]["code"] == "PHOTO_ORDER_INVALID"


async def test_delete_photo_renumbers_removes_objects_and_share_selection(alice, s3, db):
    await _entry(alice)
    ups = [(await _upload(alice, s3))[0] for _ in range(3)]
    ids = [u["photo_id"] for u in ups]
    r = await alice.put(
        f"/entries/{DAY}/share",
        json={
            "show_name": False,
            "show_score": True,
            "show_sub_icon": False,
            "show_flag": False,
            "show_title": False,
            "show_content": False,
            "show_keywords": False,
            "photo_ids": ids[:2],
        },
    )
    assert r.status_code == 200, r.text

    assert (await alice.delete(f"/photos/{ids[0]}")).status_code == 204
    photos = (await alice.get(f"/entries/{DAY}")).json()["photos"]
    assert [p["id"] for p in photos] == ids[1:]
    assert [p["position"] for p in photos] == [0, 1]
    assert _key(ups[0]["upload_url"]) not in s3.objects
    assert _key(ups[0]["thumb_upload_url"]) not in s3.objects
    link = await db[c.SHARE_LINKS].find_one({"user_id": alice.user["_id"]})
    assert [str(i) for i in link["photo_ids"]] == [ids[1]]
    assert (await alice.delete(f"/photos/{ids[0]}")).status_code == 404


async def test_rewriting_soft_deleted_day_deletes_old_photos(alice, s3):
    await _entry(alice)
    up, _ = await _upload(alice, s3)
    assert (await alice.delete(f"/entries/{DAY}")).status_code == 200
    assert (
        await alice.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    ).status_code == 404
    r = await alice.put(f"/entries/{DAY}", json={"score": 2})
    assert r.status_code == 200 and r.json()["photos"] == []
    assert _key(up["upload_url"]) not in s3.objects


async def test_photo_endpoints_require_login(anon):
    assert (
        await anon.post(f"/entries/{DAY}/photos/upload-url", json={"content_type": "image/webp"})
    ).status_code == 401
    assert (await anon.delete(f"/photos/{uuid4()}")).status_code == 401


async def test_public_share_returns_signed_urls_only_for_selected_photos(alice, anon, s3):
    await _entry(alice)
    ups = [(await _upload(alice, s3))[0] for _ in range(2)]
    body = {
        "show_name": False,
        "show_score": True,
        "show_sub_icon": False,
        "show_flag": False,
        "show_title": False,
        "show_content": False,
        "show_keywords": False,
        "photo_ids": [ups[1]["photo_id"]],
    }
    token = (await alice.put(f"/entries/{DAY}/share", json=body)).json()["token"]
    data = (await anon.get(f"/public/shares/{token}")).json()
    assert data["photo_count"] == 1
    (photo,) = data["photos"]
    assert photo["url"].endswith(f"{_key(ups[1]['upload_url'])}?signed")
    assert photo["thumb_url"].endswith(f"{_key(ups[1]['thumb_upload_url'])}?signed")
    assert set(photo) == {"url", "thumb_url", "width", "height"}  # không lộ id hay key
