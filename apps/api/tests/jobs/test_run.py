"""Lệnh chạy chung `python -m app.jobs.run`: thiếu cấu hình thoát êm, lỗi trả mã khác 0.

Test đồng bộ (main() tự chạy asyncio.run); không gọi tác vụ đụng tới DB đang chạy.
"""

import pytest

from app.core.config import settings
from app.jobs import run
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
