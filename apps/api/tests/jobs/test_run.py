"""Lệnh chạy chung `python -m app.jobs.run`: thiếu cấu hình thoát êm, lỗi trả mã khác 0.

Test đồng bộ (main() tự chạy asyncio.run); không gọi tác vụ đụng tới DB đang chạy.
"""

import json
from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from app.jobs import run
from app.jobs.backup_db import BackupResult, backup_key
from app.jobs.backup_photos import LAST_RUN_KEY
from tests.fakes import FakeBlobStore


@pytest.fixture
def no_backup(monkeypatch):
    monkeypatch.setattr(settings, "backup_s3_bucket", None)


@pytest.mark.parametrize("args", [["backup_db"], ["backup_photos"], ["restore_db", "--target", "x_test"]])
def test_backup_jobs_exit_quietly_when_not_configured(no_backup, capsys, args):
    assert run.main(args) == 0
    assert "chưa cấu hình" in capsys.readouterr().out.lower()


def test_backup_photos_without_photo_store_exits_quietly(monkeypatch, capsys):
    monkeypatch.setattr(run, "make_backup_store", FakeBlobStore)
    monkeypatch.setattr(run, "make_photo_store", lambda: None)
    assert run.main(["backup_photos"]) == 0
    assert "chưa cấu hình kho ảnh" in capsys.readouterr().out.lower()


def test_backup_photos_failure_gives_nonzero_exit(monkeypatch, capsys):
    source = FakeBlobStore({"u/a.webp": b"a"})
    source.fail_get.add("u/a.webp")
    monkeypatch.setattr(run, "make_backup_store", FakeBlobStore)
    monkeypatch.setattr(run, "make_photo_store", lambda: source)
    assert run.main(["backup_photos"]) == 1
    assert "lỗi 1" in capsys.readouterr().out


def test_restore_without_backup_fails_with_message(monkeypatch, capsys):
    monkeypatch.setattr(run, "make_backup_store", FakeBlobStore)
    target = settings.mongodb_test_db.removesuffix("_test") + "_cli_empty_test"
    assert run.main(["restore_db", "--target", target]) == 1
    assert "chưa có bản sao lưu" in capsys.readouterr().err


def test_restore_refuses_live_db(monkeypatch, capsys):
    monkeypatch.setattr(run, "make_backup_store", FakeBlobStore)
    assert run.main(["restore_db", "--target", settings.mongodb_db]) == 1
    assert "DB đang chạy" in capsys.readouterr().err


def test_unknown_job_and_missing_target_are_usage_errors():
    with pytest.raises(SystemExit) as exc:
        run.main(["khong_co"])
    assert exc.value.code == 2
    with pytest.raises(SystemExit) as exc:
        run.main(["restore_db"])
    assert exc.value.code == 2
    with pytest.raises(SystemExit) as exc:  # --if-due chỉ có ở hai tác vụ sao lưu
        run.main(["purge_accounts", "--if-due"])
    assert exc.value.code == 2


# --if-due: tính hạn theo bản sao lưu thật trong kho, không theo giờ chạy.


@pytest.fixture
def db_backup_calls(monkeypatch):
    """Thay backup_db bằng bản ghi lại lần gọi (không đụng DB)."""
    calls = []

    async def fake_backup_db(db, store, *, keep):
        calls.append(keep)
        return BackupResult(key="db/x.tar.gz", counts={}, size_bytes=0)

    monkeypatch.setattr(run, "backup_db", fake_backup_db)
    return calls


def store_with_db_backup(age: timedelta) -> FakeBlobStore:
    return FakeBlobStore({backup_key(datetime.now(UTC) - age): b"b"})


@pytest.mark.parametrize(
    ("age", "runs"),
    [
        (timedelta(hours=3), False),
        (timedelta(hours=7, minutes=45), True),  # trong DUE_SLACK: lịch lệch vài phút vẫn chạy đúng lượt
        (timedelta(hours=30), True),
    ],
)
def test_backup_db_if_due_follows_latest_backup(monkeypatch, capsys, db_backup_calls, age, runs):
    monkeypatch.setattr(settings, "backup_db_interval_hours", 8)
    store = store_with_db_backup(age)
    monkeypatch.setattr(run, "make_backup_store", lambda: store)

    assert run.main(["backup_db", "--if-due"]) == 0
    assert bool(db_backup_calls) is runs
    assert ("chưa đến hạn" in capsys.readouterr().out) is not runs


def test_backup_db_if_due_runs_when_no_backup_yet(monkeypatch, db_backup_calls):
    monkeypatch.setattr(run, "make_backup_store", FakeBlobStore)
    assert run.main(["backup_db", "--if-due"]) == 0
    assert db_backup_calls


def test_backup_db_without_flag_always_runs(monkeypatch, db_backup_calls):
    store = store_with_db_backup(timedelta(minutes=5))
    monkeypatch.setattr(run, "make_backup_store", lambda: store)
    assert run.main(["backup_db"]) == 0
    assert db_backup_calls


@pytest.mark.parametrize(("age", "runs"), [(timedelta(hours=5), False), (timedelta(hours=26), True)])
def test_backup_photos_if_due_follows_last_successful_run(monkeypatch, capsys, age, runs):
    monkeypatch.setattr(settings, "backup_photos_interval_hours", 24)
    started = (datetime.now(UTC) - age).isoformat()
    backup = FakeBlobStore({LAST_RUN_KEY: json.dumps({"version": 1, "started_at": started}).encode()})
    source = FakeBlobStore({"u/a.webp": b"a"})
    monkeypatch.setattr(run, "make_backup_store", lambda: backup)
    monkeypatch.setattr(run, "make_photo_store", lambda: source)

    assert run.main(["backup_photos", "--if-due"]) == 0
    out = capsys.readouterr().out
    assert ("photos/u/a.webp" in backup.objects) is runs
    assert ("chưa đến hạn" in out) is not runs
