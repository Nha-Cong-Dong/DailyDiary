import io
import tarfile
from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from app.core.config import settings
from app.db import collections as c
from app.db.migrate import MIGRATIONS
from app.jobs.backup_db import (
    KEY_RE,
    BackupError,
    RestoreRefused,
    backup_db,
    backup_key,
    list_backups,
    restore_db,
)
from app.services.account import log_deletion
from tests.fakes import FakeBlobStore
from tests.jobs.helpers import add_entry, add_share, add_user

pytestmark = pytest.mark.anyio

RESTORE_DB = settings.mongodb_test_db.removesuffix("_test") + "_restore_test"


@pytest.fixture
async def target(mongo):
    """DB đích để thử khôi phục: tên kết thúc bằng _test, xóa trước và sau test."""
    assert RESTORE_DB.endswith("_test")
    await mongo.drop_database(RESTORE_DB)
    yield RESTORE_DB
    await mongo.drop_database(RESTORE_DB)


async def _fill(db) -> None:
    """Đủ mọi collection, có UUID, datetime có múi giờ, chữ tiếng Việt, mảng nhúng."""
    uid = await add_user(db)
    other = await add_user(db, tier="premium")
    await add_entry(db, uid, "2026-10-01", photos=2)
    await add_entry(db, uid, "2026-10-02", deleted_days_ago=3, photos=1)
    await add_entry(db, other, "2026-10-01")
    await add_share(db, uid, "2026-10-01")
    now = datetime.now(UTC)
    await db[c.USER_SESSIONS].insert_one(
        {"_id": b"\x01" * 32, "user_id": uid, "created_at": now, "expires_at": now + timedelta(days=30)}
    )
    await db[c.USER_ITEMS].insert_one(
        {"_id": uuid4(), "user_id": uid, "item_id": "theme-x", "source": "beta", "acquired_at": now}
    )
    await db[c.FEEDBACK].insert_one(
        {"_id": uuid4(), "user_id": other, "message": "Góp ý có dấu", "created_at": now}
    )
    await log_deletion(db, "journal", pages=1, photos=0, share_links=0)


async def _dump(db) -> dict[str, list[dict]]:
    return {name: await db[name].find({}).sort("_id", 1).to_list() for name in c.ALL}


async def test_backup_and_restore_round_trip(db, mongo, target):
    await _fill(db)
    store = FakeBlobStore()
    now = datetime(2026, 10, 24, 1, 2, 3, tzinfo=UTC)

    r = await backup_db(db, store, keep=3, now=now)

    assert r.key == "db/2026/10/24/dailydiary-20261024T010203Z.tar.gz"
    assert list(store.objects) == [r.key]
    assert r.counts[c.ENTRIES] == 3 and r.counts[c.MIGRATIONS] == len(MIGRATIONS)
    with tarfile.open(fileobj=io.BytesIO(store.objects[r.key]), mode="r:gz") as tar:
        names = set(tar.getnames())
    assert names == {"manifest.json", *(f"{n}.bson" for n in (*c.ALL, c.MIGRATIONS))}

    restored = await restore_db(mongo, store, target=target)

    assert restored.key == r.key
    original, copy = await _dump(db), await _dump(mongo[target])
    assert all(original[name] for name in c.ALL)  # dữ liệu mẫu phủ mọi collection
    assert copy == original
    user = copy[c.USERS][0]
    assert isinstance(user["_id"], UUID)
    assert user["joined_at"].tzinfo is not None
    entry = next(e for e in copy[c.ENTRIES] if e["photos"])
    assert isinstance(entry["photos"][0]["id"], UUID)
    # Migration đã chạy trên DB đích: có validator và index.
    applied = {d["_id"] async for d in mongo[target][c.MIGRATIONS].find({})}
    assert applied == {m.ID for m in MIGRATIONS}
    indexes = await mongo[target][c.ENTRIES].index_information()
    assert "uq_user_date" in indexes and "ix_deleted_at" in indexes
    options = await mongo[target][c.DELETION_LOG].options()
    assert "validator" in options


async def test_datetime_with_offset_survives_as_same_instant(db, mongo, target):
    uid = await add_user(db)
    vn = timezone(timedelta(hours=7))
    at = datetime(2026, 10, 24, 7, 0, tzinfo=vn)
    await db[c.FEEDBACK].insert_one({"_id": uuid4(), "user_id": uid, "message": "x", "created_at": at})
    store = FakeBlobStore()
    await backup_db(db, store, keep=1)
    await restore_db(mongo, store, target=target)
    doc = await mongo[target][c.FEEDBACK].find_one({})
    assert doc["created_at"] == at and doc["created_at"].utcoffset() == timedelta(0)


async def test_keeps_only_latest_backups(db):
    store = FakeBlobStore({"db/README.txt": b"khong phai ban sao luu"})
    start = datetime(2026, 10, 20, 17, 0, tzinfo=UTC)
    keys = []
    for i in range(4):
        keys.append((await backup_db(db, store, keep=2, now=start + timedelta(hours=8 * i))).key)

    assert await list_backups(store) == [keys[3], keys[2]]
    assert "db/README.txt" in store.objects  # file lạ dưới db/ không bị đụng
    assert all(KEY_RE.match(k) for k in keys)


def test_backup_key_uses_utc():
    vn = timezone(timedelta(hours=7))
    assert backup_key(datetime(2026, 10, 25, 0, 0, tzinfo=vn)) == (
        "db/2026/10/24/dailydiary-20261024T170000Z.tar.gz"
    )


async def test_restore_refuses_live_db_and_db_with_data(db, mongo, target):
    await _fill(db)
    store = FakeBlobStore()
    await backup_db(db, store, keep=1)

    with pytest.raises(RestoreRefused):
        await restore_db(mongo, store, target=settings.mongodb_db)
    with pytest.raises(RestoreRefused):
        await restore_db(mongo, store, target=settings.mongodb_test_db)  # đang có dữ liệu

    await restore_db(mongo, store, target=target)
    with pytest.raises(RestoreRefused):  # khôi phục lần hai vào cùng DB: đã có dữ liệu
        await restore_db(mongo, store, target=target)


async def test_force_replaces_existing_data(db, mongo, target):
    await _fill(db)
    store = FakeBlobStore()
    await backup_db(db, store, keep=1)
    await restore_db(mongo, store, target=target)
    await add_user(mongo[target])  # dữ liệu mới hơn bản sao lưu

    await restore_db(mongo, store, target=target, force=True)
    assert await _dump(mongo[target]) == await _dump(db)


async def test_restore_needs_existing_backup(mongo, target):
    with pytest.raises(BackupError):
        await restore_db(mongo, FakeBlobStore(), target=target)
    store = FakeBlobStore({"db/2026/10/24/dailydiary-20261024T000000Z.tar.gz": b"hong"})
    with pytest.raises(BackupError):
        await restore_db(mongo, store, target=target, key="db/khong-co.tar.gz")
    with pytest.raises(BackupError):  # file hỏng
        await restore_db(mongo, store, target=target)
