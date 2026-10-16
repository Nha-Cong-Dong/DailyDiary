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
        "icon_set_id": "default",
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
