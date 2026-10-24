"""Sao lưu ảnh tăng dần từ kho ảnh chính (`S3_*`) sang kho sao lưu (`BACKUP_S3_*`), dưới tiền tố `photos/`:
`uv run python -m app.jobs.run backup_photos`.

- Chỉ chép key chưa có trong sao lưu hoặc khác dung lượng; đọc rồi ghi theo luồng (hai kho có thể khác nhà
  cung cấp nên không dùng copy_object phía server).
- Object còn trong sao lưu mà đã mất ở kho chính (người dùng xóa ảnh, trang, tài khoản): ghi mốc lần đầu thấy
  mất vào manifest `photos/_missing.json`, xóa khỏi sao lưu khi đã mất quá 7 ngày (đặc tả: dữ liệu đã xóa còn
  trong sao lưu tối đa 7 ngày). Object xuất hiện lại thì bỏ khỏi manifest.
- Lỗi chép một object không dừng cả lượt; đếm vào `failed` để lệnh chạy trả mã lỗi, lần sau chép lại.

Không ghi log key hay nội dung; chỉ số lượng.
"""

import io
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import anyio

from app.jobs.blobstore import BlobStore

logger = logging.getLogger("dailydiary.backup")

PREFIX = "photos/"
MISSING_KEY = f"{PREFIX}_missing.json"
MISSING_GRACE = timedelta(days=7)


@dataclass
class PhotoBackupResult:
    copied: int = 0
    unchanged: int = 0
    failed: int = 0
    missing: int = 0  # đã mất ở kho chính, còn giữ trong sao lưu (chưa quá 7 ngày)
    removed: int = 0  # đã xóa khỏi sao lưu vì mất quá 7 ngày


async def _load_missing(store: BlobStore, exists: bool) -> dict[str, datetime]:
    if not exists:
        return {}
    body = await store.get(MISSING_KEY)
    try:
        data = json.loads((await anyio.to_thread.run_sync(body.read)).decode("utf-8"))
    finally:
        body.close()
    return {k: datetime.fromisoformat(v) for k, v in data.get("missing", {}).items()}


async def _save_missing(store: BlobStore, missing: dict[str, datetime]) -> None:
    data = {"version": 1, "missing": {k: v.isoformat() for k, v in sorted(missing.items())}}
    await store.put(MISSING_KEY, io.BytesIO(json.dumps(data).encode("utf-8")))


async def backup_photos(
    source: BlobStore, backup: BlobStore, *, now: datetime | None = None, grace: timedelta = MISSING_GRACE
) -> PhotoBackupResult:
    now = now or datetime.now(UTC)
    result = PhotoBackupResult()
    src = await source.list("")
    dst = await backup.list(PREFIX)
    manifest_exists = MISSING_KEY in dst
    dst.pop(MISSING_KEY, None)

    for key, size in src.items():
        target = PREFIX + key
        if target == MISSING_KEY:
            continue  # key ảnh luôn bắt đầu bằng user_id/, không bao giờ trùng manifest
        if dst.get(target) == size:
            result.unchanged += 1
            continue
        try:
            body = await source.get(key)
            try:
                await backup.put(target, body)
            finally:
                body.close()
        except Exception as exc:  # lỗi mạng/kho với một object: lần sau chép lại
            logger.warning("chép ảnh sang kho sao lưu thất bại: %s", type(exc).__name__)
            result.failed += 1
            continue
        result.copied += 1

    before = await _load_missing(backup, manifest_exists)
    missing: dict[str, datetime] = {}
    expired: list[str] = []
    for target in dst:
        if target[len(PREFIX) :] in src:
            continue
        first_seen = before.get(target, now)
        if now - first_seen > grace:
            expired.append(target)
        else:
            missing[target] = first_seen
    if expired:
        await backup.delete(*expired)
    if missing != before:
        await _save_missing(backup, missing)
    result.missing, result.removed = len(missing), len(expired)
    logger.info(
        "sao lưu ảnh: chép %d, giữ nguyên %d, lỗi %d; mất ở kho chính %d, xóa khỏi sao lưu %d",
        result.copied,
        result.unchanged,
        result.failed,
        result.missing,
        result.removed,
    )
    return result
