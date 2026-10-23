from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pymongo.errors import DuplicateKeyError, WriteError

from app.db import collections as c
from app.db.migrate import MIGRATIONS, run_migrations

pytestmark = pytest.mark.anyio


def _entry(user_id, day="2026-10-16", **extra):
    now = datetime.now(UTC)
    doc = {
        "_id": uuid4(),
        "user_id": user_id,
        "entry_date": day,
        "score": 4,
        "icon_set_id": "sprout",
        "keywords": [],
        "photos": [],
        "created_at": now,
        "updated_at": now,
    }
    doc.update(extra)
    return doc


async def test_all_collections_exist(db):
    names = set(await db.list_collection_names())
    assert set(c.ALL) <= names


async def test_migrations_are_recorded_and_rerun_is_noop(db):
    applied = {d["_id"] async for d in db[c.MIGRATIONS].find()}
    assert applied == {m.ID for m in MIGRATIONS}
    assert await run_migrations(db) == []


async def test_initial_migration_is_idempotent(db):
    from app.db.migrations import m0001_initial

    await m0001_initial.up(db)  # chạy lại lần nữa không lỗi
    indexes = await db[c.ENTRIES].index_information()
    assert {"uq_user_date", "ix_user_keyword_date", "ix_user_photo", "ix_deleted_at"} <= set(indexes)


async def test_one_entry_per_user_per_day(db):
    user = uuid4()
    await db[c.ENTRIES].insert_one(_entry(user))
    with pytest.raises(DuplicateKeyError):
        await db[c.ENTRIES].insert_one(_entry(user))
    await db[c.ENTRIES].insert_one(_entry(uuid4()))  # người khác cùng ngày: hợp lệ


@pytest.mark.parametrize(
    "bad",
    [
        {"score": 6},
        {"score": 0},
        {"entry_date": "16/10/2026"},
        {"flag_color": "red"},
        {"user_id": "khong-phai-uuid"},
    ],
)
async def test_validator_rejects_invalid_entries(db, bad):
    doc = _entry(uuid4())
    doc.update(bad)
    with pytest.raises(WriteError):
        await db[c.ENTRIES].insert_one(doc)


async def test_uuid_and_datetime_roundtrip(db):
    user = uuid4()
    doc = _entry(user)
    await db[c.ENTRIES].insert_one(doc)
    got = await db[c.ENTRIES].find_one({"user_id": user})
    assert got["user_id"] == user
    assert got["created_at"].tzinfo is not None
    # BSON datetime lưu tới mili giây: khớp Date của JavaScript khi so sánh updated_at
    assert got["updated_at"].microsecond % 1000 == 0


async def test_sessions_expire_via_ttl_index(db):
    info = await db[c.USER_SESSIONS].index_information()
    assert info["ttl_expires_at"]["expireAfterSeconds"] == 0


async def test_m0002_backfills_icon_set_and_onboarded_and_is_idempotent(db):
    from app.db.migrations import m0002_user_icon_set_onboarded as m2

    joined = datetime(2025, 9, 1, tzinfo=UTC)
    old = {
        "_id": uuid4(),
        "google_sub": "sub-old",
        "email": "old@example.com",
        "display_name": "Old",
        "timezone": "Asia/Ho_Chi_Minh",
        "account_tier": "beta",
        "joined_at": joined,
    }
    await db[c.USERS].insert_one(old)
    await m2.up(db)
    await m2.up(db)  # chạy lại không đổi gì
    got = await db[c.USERS].find_one({"_id": old["_id"]})
    assert got["icon_set_id"] == "sprout"
    assert got["onboarded_at"] == joined

    with pytest.raises(WriteError):
        await db[c.USERS].insert_one({**old, "_id": uuid4(), "google_sub": "sub-x", "icon_set_id": 5})


async def test_m0003_share_links_indexes_validator_and_idempotent(db):
    from app.db.migrations import m0003_share_links as m3

    await m3.up(db)  # chạy lại không lỗi
    info = await db[c.SHARE_LINKS].index_information()
    assert info["uq_user_date"]["unique"] and info["uq_token"]["unique"]

    now = datetime.now(UTC)
    user = uuid4()
    link = {
        "_id": uuid4(),
        "user_id": user,
        "entry_date": "2026-10-18",
        "token": "a" * 22,
        **{name: True for name in m3.SHOW_FIELDS},
        "photo_ids": [],
        "created_at": now,
        "updated_at": now,
    }
    await db[c.SHARE_LINKS].insert_one(link)
    with pytest.raises(DuplicateKeyError):  # một link mỗi ngày
        await db[c.SHARE_LINKS].insert_one({**link, "_id": uuid4(), "token": "b" * 22})
    with pytest.raises(DuplicateKeyError):  # token không trùng
        await db[c.SHARE_LINKS].insert_one({**link, "_id": uuid4(), "entry_date": "2026-10-17"})
    with pytest.raises(WriteError):
        await db[c.SHARE_LINKS].insert_one({**link, "_id": uuid4(), "token": "short", "user_id": uuid4()})
    with pytest.raises(WriteError):
        await db[c.SHARE_LINKS].insert_one(
            {**link, "_id": uuid4(), "token": "c" * 22, "user_id": uuid4(), "show_title": "yes"}
        )


async def test_m0004_entries_no_longer_require_icon_set_and_accept_norm_fields(db):
    from app.db.migrations import m0004_entries_icon_set_norm as m4

    await m4.up(db)  # chạy lại không lỗi
    doc = _entry(uuid4())
    doc.pop("icon_set_id", None)
    doc.update(title_norm="chieu mua", content_norm=None)
    await db[c.ENTRIES].insert_one(doc)
    bad = _entry(uuid4())
    bad["title_norm"] = 123
    with pytest.raises(WriteError):
        await db[c.ENTRIES].insert_one(bad)


async def test_m0005_backfills_custom_flag_colors_and_validator(db):
    from app.db.migrations import m0005_user_custom_flag_colors as m5

    old = {
        "_id": uuid4(),
        "google_sub": "sub-flags",
        "email": "flags@example.com",
        "display_name": "Flags",
        "timezone": "Asia/Ho_Chi_Minh",
        "account_tier": "beta",
        "joined_at": datetime.now(UTC),
    }
    await db[c.USERS].insert_one(old)
    await m5.up(db)
    await m5.up(db)  # chạy lại không đổi gì
    assert (await db[c.USERS].find_one({"_id": old["_id"]}))["custom_flag_colors"] == []
    for bad in (["red"], ["#3a7bd5"], "#3A7BD5"):  # sai dạng, chữ thường, không phải mảng
        with pytest.raises(WriteError):
            await db[c.USERS].insert_one(
                {**old, "_id": uuid4(), "google_sub": f"sub-{bad}", "custom_flag_colors": bad}
            )


async def test_m0006_avatar_key_validator(db):
    from app.db.migrations import m0006_user_avatar_key as m6

    await m6.up(db)  # chạy lại không lỗi
    user = {
        "_id": uuid4(),
        "google_sub": "sub-avatar",
        "email": "avatar@example.com",
        "display_name": "Avatar",
        "timezone": "Asia/Ho_Chi_Minh",
        "account_tier": "beta",
        "joined_at": datetime.now(UTC),
        "avatar_key": None,
    }
    await db[c.USERS].insert_one(user)
    with pytest.raises(WriteError):
        await db[c.USERS].insert_one({**user, "_id": uuid4(), "google_sub": "sub-avatar-2", "avatar_key": 5})
