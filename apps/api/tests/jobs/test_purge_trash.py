from uuid import uuid4

import pytest

from app.core.limits import get_limits
from app.db import collections as c
from app.services import maintenance
from app.services.maintenance import purge_trash
from tests.fakes import WEBP, FakeStorage
from tests.jobs.helpers import add_entry, add_share, add_user

pytestmark = pytest.mark.anyio

DAYS = get_limits().tier().entry.restore_days


def _put_photos(s3: FakeStorage, entry: dict) -> list[str]:
    keys = [k for p in entry["photos"] for k in (p["storage_key"], p["thumb_key"])]
    for key in keys:
        s3.put(key, WEBP)
    return keys


async def _ids(db) -> set:
    return {d["_id"] async for d in db[c.ENTRIES].find({}, {"_id": 1})}


async def test_purges_expired_pages_with_photos_and_links_only(db):
    s3 = FakeStorage()
    alice, bob = await add_user(db), await add_user(db)
    expired = await add_entry(db, alice, "2026-08-01", deleted_days_ago=DAYS + 1, photos=2)
    fresh = await add_entry(db, alice, "2026-08-02", deleted_days_ago=DAYS - 1, photos=1)
    live = await add_entry(db, alice, "2026-08-03", photos=1)
    bob_page = await add_entry(db, bob, "2026-08-01", deleted_days_ago=DAYS - 2, photos=1)
    gone_keys = _put_photos(s3, expired)
    kept_keys = [k for e in (fresh, live, bob_page) for k in _put_photos(s3, e)]
    for uid, day in ((alice, "2026-08-01"), (alice, "2026-08-02"), (bob, "2026-08-01")):
        await add_share(db, uid, day)

    r = await purge_trash(db, s3)

    assert (r.pages, r.photos, r.share_links, r.skipped) == (1, 2, 1, 0)
    assert await _ids(db) == {fresh["_id"], live["_id"], bob_page["_id"]}
    assert not any(k in s3.objects for k in gone_keys)
    assert all(k in s3.objects for k in kept_keys)
    links = {(d["user_id"], d["entry_date"]) async for d in db[c.SHARE_LINKS].find({})}
    assert links == {(alice, "2026-08-02"), (bob, "2026-08-01")}  # link của Bob cùng ngày vẫn còn


async def test_writes_one_deletion_log_without_personal_data_and_rerun_is_noop(db):
    s3 = FakeStorage()
    uid = await add_user(db)
    for day in ("2026-07-01", "2026-07-02"):
        _put_photos(s3, await add_entry(db, uid, day, deleted_days_ago=DAYS + 5, photos=1))
    await add_share(db, uid, "2026-07-01")

    await purge_trash(db, s3)
    logs = await db[c.DELETION_LOG].find({}).to_list()
    assert len(logs) == 1
    log = logs[0]
    assert (log["kind"], log["pages"], log["photos"], log["share_links"]) == ("trash", 2, 2, 1)
    assert set(log) == {"_id", "kind", "at", "pages", "photos", "share_links"}  # không có user_id

    r = await purge_trash(db, s3)  # chạy lại: không còn gì, không ghi log mới
    assert (r.pages, r.photos, r.share_links, r.skipped) == (0, 0, 0, 0)
    assert await db[c.DELETION_LOG].count_documents({}) == 1


async def test_nothing_to_purge_writes_no_log(db):
    uid = await add_user(db)
    await add_entry(db, uid, "2026-08-01", deleted_days_ago=1)
    r = await purge_trash(db, FakeStorage())
    assert r.pages == 0
    assert await db[c.DELETION_LOG].count_documents({}) == 0


async def test_restore_days_follow_owner_tier_and_default_for_missing_owner(db, monkeypatch):
    limits = get_limits()
    premium = limits.tiers["premium"]
    longer = premium.model_copy(
        update={"entry": premium.entry.model_copy(update={"restore_days": DAYS + 30})}
    )
    patched = limits.model_copy(update={"tiers": {**limits.tiers, "premium": longer}})
    monkeypatch.setattr(maintenance, "get_limits", lambda: patched)

    rich = await add_user(db, tier="premium")
    kept = await add_entry(db, rich, "2026-07-01", deleted_days_ago=DAYS + 5)  # còn hạn theo premium
    orphan = await add_entry(db, uuid4(), "2026-07-01", deleted_days_ago=DAYS + 1)  # chủ trang không còn

    r = await purge_trash(db, FakeStorage())
    assert r.pages == 1
    assert await _ids(db) == {kept["_id"]}
    assert orphan["_id"] not in await _ids(db)


async def test_keeps_page_when_storage_missing_or_failing(db, monkeypatch):
    uid = await add_user(db)
    with_photo = await add_entry(db, uid, "2026-07-01", deleted_days_ago=DAYS + 1, photos=1)
    no_photo = await add_entry(db, uid, "2026-07-02", deleted_days_ago=DAYS + 1)
    await add_share(db, uid, "2026-07-01")

    r = await purge_trash(db, None)  # chưa cấu hình kho: trang không ảnh vẫn xóa được
    assert (r.pages, r.skipped) == (1, 1)
    assert await _ids(db) == {with_photo["_id"]}

    s3 = FakeStorage()
    keys = _put_photos(s3, with_photo)

    async def broken(*_keys):
        raise ConnectionError("mất kết nối kho")

    monkeypatch.setattr(s3, "delete", broken)
    r = await purge_trash(db, s3)
    assert (r.pages, r.skipped) == (0, 1)
    assert await _ids(db) == {with_photo["_id"]}
    assert all(k in s3.objects for k in keys)
    assert await db[c.SHARE_LINKS].count_documents({}) == 1  # link chưa bị xóa khi kho lỗi
    assert no_photo["_id"] not in await _ids(db)


async def test_does_not_delete_page_restored_during_purge(db, monkeypatch):
    s3 = FakeStorage()
    uid = await add_user(db)
    entry = await add_entry(db, uid, "2026-07-01", deleted_days_ago=DAYS + 1, photos=1)
    _put_photos(s3, entry)
    real_delete = s3.delete

    async def delete_then_restore(*keys):
        await real_delete(*keys)
        # Người dùng khôi phục đúng lúc tác vụ đang dọn ảnh.
        await db[c.ENTRIES].update_one({"_id": entry["_id"]}, {"$set": {"deleted_at": None}})

    monkeypatch.setattr(s3, "delete", delete_then_restore)
    r = await purge_trash(db, s3)
    assert r.pages == 0
    assert await db[c.ENTRIES].find_one({"_id": entry["_id"]}) is not None
