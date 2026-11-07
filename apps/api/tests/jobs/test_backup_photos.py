import json
from datetime import UTC, datetime, timedelta

import pytest

from app.jobs.backup_photos import LAST_RUN_KEY, MISSING_KEY, backup_photos, last_photo_backup
from tests.fakes import FakeBlobStore

pytestmark = pytest.mark.anyio

A = "u1/2026/10/01/a.webp"
B = "u1/2026/10/01/b.webp"
C = "u2/avatar/c.webp"
T0 = datetime(2026, 10, 1, tzinfo=UTC)


def photo_puts(store: FakeBlobStore) -> list[str]:
    """Các lần ghi ảnh (bỏ file mốc lần chạy `state/…`)."""
    return sorted(k for k in store.puts if k != LAST_RUN_KEY)


async def test_copies_only_new_or_changed_objects():
    source = FakeBlobStore({A: b"aaaa", B: b"bb"})
    backup = FakeBlobStore()

    r = await backup_photos(source, backup, now=T0)
    assert (r.copied, r.unchanged, r.failed) == (2, 0, 0)
    assert {k: v for k, v in backup.objects.items() if k != LAST_RUN_KEY} == {
        f"photos/{A}": b"aaaa",
        f"photos/{B}": b"bb",
    }

    source.objects[B] = b"bbbbbb"  # đổi dung lượng
    source.objects[C] = b"c"
    backup.puts.clear()
    r = await backup_photos(source, backup, now=T0)
    assert (r.copied, r.unchanged) == (2, 1)
    assert photo_puts(backup) == [f"photos/{B}", f"photos/{C}"]
    assert backup.objects[f"photos/{B}"] == b"bbbbbb"

    backup.puts.clear()
    r = await backup_photos(source, backup, now=T0)  # chạy lại: không chép gì
    assert (r.copied, r.unchanged, photo_puts(backup)) == (0, 3, [])


async def test_successful_run_records_start_time_outside_photos_prefix():
    source = FakeBlobStore({A: b"aaaa"})
    backup = FakeBlobStore()
    assert await last_photo_backup(backup) is None

    await backup_photos(source, backup, now=T0)
    assert await last_photo_backup(backup) == T0
    assert not LAST_RUN_KEY.startswith("photos/")  # không bị coi là ảnh "mất ở kho chính"

    r = await backup_photos(source, backup, now=T0 + timedelta(days=9))
    assert (r.missing, r.removed) == (0, 0)
    assert await last_photo_backup(backup) == T0 + timedelta(days=9)


async def test_run_with_failures_keeps_previous_start_time():
    source = FakeBlobStore({A: b"aaaa"})
    backup = FakeBlobStore()
    await backup_photos(source, backup, now=T0)

    source.objects[B] = b"bb"
    source.fail_get.add(B)
    r = await backup_photos(source, backup, now=T0 + timedelta(days=1))
    assert r.failed == 1
    assert await last_photo_backup(backup) == T0  # lần lịch kế tiếp vẫn coi là đến hạn, chép lại B


async def test_missing_objects_removed_only_after_seven_days():
    source = FakeBlobStore({A: b"aaaa", B: b"bb"})
    backup = FakeBlobStore()
    await backup_photos(source, backup, now=T0)
    del source.objects[B]  # người dùng xóa ảnh

    r = await backup_photos(source, backup, now=T0 + timedelta(days=1))
    assert (r.missing, r.removed) == (1, 0)
    assert f"photos/{B}" in backup.objects
    manifest = json.loads(backup.objects[MISSING_KEY])
    assert manifest["missing"] == {f"photos/{B}": (T0 + timedelta(days=1)).isoformat()}

    r = await backup_photos(source, backup, now=T0 + timedelta(days=8))  # mất đúng 7 ngày: còn giữ
    assert (r.missing, r.removed) == (1, 0)

    r = await backup_photos(source, backup, now=T0 + timedelta(days=8, minutes=1))
    assert (r.missing, r.removed) == (0, 1)
    assert f"photos/{B}" not in backup.objects
    assert json.loads(backup.objects[MISSING_KEY])["missing"] == {}
    assert f"photos/{A}" in backup.objects


async def test_object_that_reappears_leaves_manifest():
    source = FakeBlobStore({A: b"aaaa"})
    backup = FakeBlobStore()
    await backup_photos(source, backup, now=T0)
    saved = source.objects.pop(A)
    await backup_photos(source, backup, now=T0 + timedelta(days=2))
    source.objects[A] = saved

    r = await backup_photos(source, backup, now=T0 + timedelta(days=20))
    assert (r.missing, r.removed, r.unchanged) == (0, 0, 1)
    assert json.loads(backup.objects[MISSING_KEY])["missing"] == {}
    assert f"photos/{A}" in backup.objects


async def test_failed_copy_is_counted_and_retried_next_run():
    source = FakeBlobStore({A: b"aaaa", B: b"bb"})
    source.fail_get.add(A)
    backup = FakeBlobStore()

    r = await backup_photos(source, backup, now=T0)
    assert (r.copied, r.failed) == (1, 1)
    assert f"photos/{A}" not in backup.objects

    source.fail_get.clear()
    r = await backup_photos(source, backup, now=T0)
    assert (r.copied, r.failed, r.unchanged) == (1, 0, 1)
