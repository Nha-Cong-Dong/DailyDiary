"""Lệnh chạy chung cho tác vụ định kỳ (Bước 13): `uv run python -m app.jobs.run <tên> [tùy chọn]`.

Tên tác vụ:
- `purge_accounts`  làm nốt xóa tài khoản dang dở (đặt lịch mỗi giờ);
- `purge_trash`     dọn trang trong thùng rác quá hạn khôi phục, kèm ảnh và link chia sẻ (mỗi ngày);
- `backup_db`       sao lưu MongoDB lên kho sao lưu, giữ BACKUP_KEEP bản (00:00, 08:00, 16:00 giờ VN);
- `backup_photos`   sao chép tăng dần kho ảnh sang kho sao lưu (mỗi ngày);
- `restore_db`      khôi phục một bản sao lưu: `restore_db --target <db> [--key <key>] [--force]`.

In tóm tắt (chỉ số lượng, không có dữ liệu cá nhân). Mã thoát: 0 xong hoặc chưa cấu hình (bỏ qua êm),
1 lỗi hoặc bị từ chối, 2 sai cú pháp lệnh. Lỗi lạ chỉ in tên loại lỗi: thông điệp lỗi MongoDB có thể chứa
document.
"""

import argparse
import asyncio
import sys

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.storage import make_storage
from app.db.client import make_client
from app.jobs.backup_db import BackupError, backup_db, restore_db
from app.jobs.backup_photos import backup_photos
from app.jobs.blobstore import make_backup_store, make_photo_store
from app.services.account import purge_pending
from app.services.maintenance import purge_trash

NOT_CONFIGURED = "Chưa cấu hình kho sao lưu (BACKUP_S3_BUCKET trống), bỏ qua."


async def _purge_accounts(_: argparse.Namespace) -> int:
    client = make_client(settings.mongodb_uri)
    try:
        done = await purge_pending(client[settings.mongodb_db], make_storage())
    finally:
        await client.close()
    print(f"Đã dọn xong {done} tài khoản.")
    return 0


async def _purge_trash(_: argparse.Namespace) -> int:
    client = make_client(settings.mongodb_uri)
    try:
        r = await purge_trash(client[settings.mongodb_db], make_storage())
    finally:
        await client.close()
    print(f"Dọn thùng rác: {r.pages} trang, {r.photos} ảnh, {r.share_links} link chia sẻ.")
    if r.skipped:
        print(f"{r.skipped} trang có ảnh chưa xóa được (kho ảnh thiếu hoặc lỗi), lần sau làm lại.")
    return 0


async def _backup_db(_: argparse.Namespace) -> int:
    store = make_backup_store()
    if store is None:
        print(NOT_CONFIGURED)
        return 0
    client = make_client(settings.mongodb_uri)
    try:
        r = await backup_db(client[settings.mongodb_db], store, keep=settings.backup_keep)
    finally:
        await client.close()
    counts = ", ".join(f"{name} {n}" for name, n in r.counts.items())
    print(f"Đã sao lưu DB: {r.key} ({r.size_bytes} byte). Số document: {counts}.")
    print(f"Xóa {len(r.removed)} bản cũ, giữ tối đa {settings.backup_keep} bản.")
    return 0


async def _backup_photos(_: argparse.Namespace) -> int:
    backup = make_backup_store()
    if backup is None:
        print(NOT_CONFIGURED)
        return 0
    source = make_photo_store()
    if source is None:
        print("Chưa cấu hình kho ảnh (S3_ACCESS_KEY/S3_SECRET_KEY trống), bỏ qua.")
        return 0
    r = await backup_photos(source, backup)
    print(
        f"Sao lưu ảnh: chép {r.copied}, giữ nguyên {r.unchanged}, lỗi {r.failed}; "
        f"mất ở kho chính {r.missing} (giữ tối đa 7 ngày), xóa khỏi sao lưu {r.removed}."
    )
    return 1 if r.failed else 0


async def _restore_db(args: argparse.Namespace) -> int:
    store = make_backup_store()
    if store is None:
        print(NOT_CONFIGURED)
        return 0
    client = make_client(settings.mongodb_uri)
    try:
        r = await restore_db(client, store, target=args.target, key=args.key, force=args.force)
    finally:
        await client.close()
    counts = ", ".join(f"{name} {n}" for name, n in r.counts.items())
    print(f"Đã khôi phục {r.key} vào DB '{r.target}'. Số document: {counts}.")
    return 0


JOBS = {
    "purge_accounts": _purge_accounts,
    "purge_trash": _purge_trash,
    "backup_db": _backup_db,
    "backup_photos": _backup_photos,
    "restore_db": _restore_db,
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.jobs.run", description="Tác vụ vận hành DailyDiary")
    sub = parser.add_subparsers(dest="job", required=True)
    for name in JOBS:
        p = sub.add_parser(name)
        if name == "restore_db":
            p.add_argument("--target", required=True, help="tên DB đích (nên là DB mới, trống)")
            p.add_argument("--key", help="key bản sao lưu; mặc định bản mới nhất")
            p.add_argument(
                "--force", action="store_true", help="cho phép ghi đè DB đang chạy hoặc DB đã có dữ liệu"
            )
    return parser


def main(argv: list[str] | None = None) -> int:
    # Console Windows mặc định cp1252, in tiếng Việt sẽ lỗi.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    args = build_parser().parse_args(argv)
    configure_logging()
    try:
        return asyncio.run(JOBS[args.job](args))
    except BackupError as exc:
        print(f"Lỗi: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # không in thông điệp: có thể chứa dữ liệu người dùng
        print(f"Lỗi khi chạy {args.job}: {type(exc).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
