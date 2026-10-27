"""Sao lưu và khôi phục MongoDB bằng Python thuần (không cần `mongodump`):
`uv run python -m app.jobs.run backup_db` / `restore_db`.

Sao lưu:
- Đọc từng collection trong `collections.ALL` và `_migrations` dưới dạng BSON thô (RawBSONDocument: giữ
  nguyên kiểu UUID subtype 4, datetime, không giải mã rồi mã hóa lại), ghi nối tiếp vào `<tên>.bson` trong thư
  mục tạm theo từng lô — không nạp cả DB vào RAM. Thêm `manifest.json` (định dạng, thời điểm, số document).
- Đóng gói `tar.gz`, đẩy lên kho sao lưu tại `db/YYYY/MM/DD/dailydiary-<UTC yyyymmddTHHMMSSZ>.tar.gz`.
- Giữ `BACKUP_KEEP` bản mới nhất dưới `db/`, xóa bản cũ hơn.
- Các collection được đọc lần lượt, không cùng một snapshot (MongoDB standalone): một trang ghi trong lúc sao
  lưu có thể có hoặc không có trong bản — chấp nhận được với sao lưu 8 giờ một lần.

Khôi phục: tải một bản (mặc định bản mới nhất), chạy migration trên DB đích trước (để có validator, index)
rồi insert dữ liệu. Từ chối khôi phục vào DB đang chạy (`MONGODB_DB`) hoặc DB đã có dữ liệu, trừ khi có
`--force` (khi đó xóa document cũ của từng collection trước khi nạp).

Không ghi log nội dung; chỉ tên collection và số lượng.
"""

import json
import logging
import re
import shutil
import tarfile
import tempfile
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO

import anyio
from bson.codec_options import CodecOptions
from bson.raw_bson import RawBSONDocument
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.db import collections as c
from app.db.migrate import run_migrations
from app.jobs.blobstore import BlobStore, get_file, put_file

logger = logging.getLogger("dailydiary.backup")

FORMAT = 1
PREFIX = "db/"
COLLECTIONS = (*c.ALL, c.MIGRATIONS)
KEY_RE = re.compile(r"^db/\d{4}/\d{2}/\d{2}/dailydiary-(\d{8}T\d{6}Z)\.tar\.gz$")
MANIFEST = "manifest.json"
BATCH = 1000
RAW = CodecOptions(document_class=RawBSONDocument)


class BackupError(Exception):
    """Lỗi có thông điệp an toàn để in ra (không chứa dữ liệu người dùng)."""


class RestoreRefused(BackupError):
    pass


@dataclass
class BackupResult:
    key: str
    counts: dict[str, int]
    size_bytes: int
    removed: list[str] = field(default_factory=list)


@dataclass
class RestoreResult:
    key: str
    target: str
    counts: dict[str, int]


def backup_key(now: datetime) -> str:
    now = now.astimezone(UTC)
    return f"{PREFIX}{now:%Y/%m/%d}/dailydiary-{now:%Y%m%dT%H%M%SZ}.tar.gz"


async def list_backups(store: BlobStore) -> list[str]:
    """Key các bản sao lưu DB, mới nhất trước (theo mốc thời gian trong tên)."""
    keys = [k for k in await store.list(PREFIX) if KEY_RE.match(k)]
    return sorted(keys, key=lambda k: KEY_RE.match(k).group(1), reverse=True)  # type: ignore[union-attr]


async def _dump_collection(db: AsyncDatabase, name: str, path: Path) -> int:
    coll = db.get_collection(name, codec_options=RAW)
    count, chunk = 0, []
    async with await anyio.open_file(path, "wb") as f:
        async for doc in coll.find({}, batch_size=BATCH):
            chunk.append(doc.raw)
            count += 1
            if len(chunk) >= BATCH:
                await f.write(b"".join(chunk))
                chunk.clear()
        if chunk:
            await f.write(b"".join(chunk))
    return count


def _pack(src: Path, archive: Path) -> int:
    with tarfile.open(archive, "w:gz") as tar:
        for name in (MANIFEST, *(f"{n}.bson" for n in COLLECTIONS)):
            tar.add(src / name, arcname=name)
    return archive.stat().st_size


async def prune_backups(store: BlobStore, keep: int) -> list[str]:
    """Giữ `keep` bản mới nhất (ít nhất 1), xóa phần còn lại. Trả các key đã xóa."""
    old = (await list_backups(store))[max(keep, 1) :]
    if old:
        await store.delete(*old)
    return old


async def backup_db(
    db: AsyncDatabase, store: BlobStore, *, keep: int, now: datetime | None = None
) -> BackupResult:
    now = now or datetime.now(UTC)
    key = backup_key(now)
    with tempfile.TemporaryDirectory(prefix="dd-backup-") as tmp:
        work = Path(tmp)
        data = work / "data"
        await anyio.Path(data).mkdir()
        counts = {name: await _dump_collection(db, name, data / f"{name}.bson") for name in COLLECTIONS}
        manifest = {"format": FORMAT, "created_at": now.astimezone(UTC).isoformat(), "collections": counts}
        await anyio.Path(data / MANIFEST).write_text(json.dumps(manifest), encoding="utf-8")
        archive = work / "backup.tar.gz"
        size = await anyio.to_thread.run_sync(_pack, data, archive)
        await put_file(store, key, archive)
    removed = await prune_backups(store, keep)
    logger.info("sao lưu DB: %d document, %d byte; xóa %d bản cũ", sum(counts.values()), size, len(removed))
    return BackupResult(key=key, counts=counts, size_bytes=size, removed=removed)


def _extract(archive: Path, dest: Path) -> dict:
    """Chỉ lấy đúng các file biết trước (không extractall: tránh đường dẫn lạ trong tar)."""
    allowed = {MANIFEST, *(f"{n}.bson" for n in COLLECTIONS)}
    try:
        with tarfile.open(archive, "r:gz") as tar:
            for member in tar:
                if not member.isfile() or member.name not in allowed:
                    continue
                src = tar.extractfile(member)
                if src is None:
                    continue
                with src, (dest / member.name).open("wb") as out:
                    shutil.copyfileobj(src, out, 1024 * 1024)
        manifest = json.loads((dest / MANIFEST).read_text(encoding="utf-8"))
    except (tarfile.TarError, OSError, ValueError) as exc:
        raise BackupError(f"bản sao lưu hỏng hoặc không đọc được ({type(exc).__name__})") from exc
    if manifest.get("format") != FORMAT:
        raise BackupError(f"định dạng sao lưu không hỗ trợ: {manifest.get('format')!r}")
    return manifest


def _read_batch(f: BinaryIO, n: int) -> list[RawBSONDocument]:
    docs: list[RawBSONDocument] = []
    while len(docs) < n:
        head = f.read(4)
        if not head:
            break
        size = int.from_bytes(head, "little") if len(head) == 4 else 0
        rest = f.read(size - 4) if size > 4 else b""
        if size <= 4 or len(rest) != size - 4:
            raise BackupError("file BSON trong bản sao lưu bị cắt cụt")
        docs.append(RawBSONDocument(head + rest, RAW))
    return docs


async def _load_collection(db: AsyncDatabase, name: str, path: Path, *, force: bool) -> int:
    """Nạp `<tên>.bson` vào collection. `_migrations`: chỉ thêm mục DB đích chưa có (migration vừa chạy)."""
    if not await anyio.Path(path).exists():
        return 0
    existing: set = set()
    if name == c.MIGRATIONS:
        existing = {d["_id"] async for d in db[name].find({}, {"_id": 1})}
    elif force:
        await db[name].delete_many({})
    loaded = 0
    f = await anyio.to_thread.run_sync(path.open, "rb")
    try:
        while batch := await anyio.to_thread.run_sync(_read_batch, f, BATCH):
            if existing:
                batch = [d for d in batch if d["_id"] not in existing]
            if batch:
                await db[name].insert_many(batch, ordered=True)
            loaded += len(batch)
    finally:
        f.close()
    return loaded


async def _has_data(db: AsyncDatabase) -> bool:
    for name in c.ALL:
        if await db[name].find_one({}, {"_id": 1}) is not None:
            return True
    return False


async def restore_db(
    client: AsyncMongoClient, store: BlobStore, *, target: str, key: str | None = None, force: bool = False
) -> RestoreResult:
    target = target.strip()
    if not target:
        raise BackupError("thiếu tên DB đích (--target)")
    db = client[target]
    if not force:
        if target == settings.mongodb_db:
            raise RestoreRefused(f"không khôi phục vào DB đang chạy '{target}' (thêm --force nếu chắc chắn)")
        if await _has_data(db):
            raise RestoreRefused(f"DB đích '{target}' đã có dữ liệu (thêm --force để ghi đè)")
    backups = await list_backups(store)
    if key is None:
        if not backups:
            raise BackupError("kho sao lưu chưa có bản sao lưu DB nào")
        key = backups[0]
    elif key not in backups:
        raise BackupError(f"không tìm thấy bản sao lưu '{key}'")
    with tempfile.TemporaryDirectory(prefix="dd-restore-") as tmp:
        work = Path(tmp)
        archive = work / "backup.tar.gz"
        await get_file(store, key, archive)
        data = work / "data"
        await anyio.Path(data).mkdir()
        manifest = await anyio.to_thread.run_sync(_extract, archive, data)
        await run_migrations(db)
        counts = {
            name: await _load_collection(db, name, data / f"{name}.bson", force=force) for name in COLLECTIONS
        }
    expected = manifest.get("collections", {})
    short = [n for n in c.ALL if counts[n] != expected.get(n, 0)]
    if short:
        raise BackupError(f"số document sau khôi phục không khớp manifest: {', '.join(short)}")
    logger.info("khôi phục DB: %d document vào %s", sum(counts.values()), target)
    return RestoreResult(key=key, target=target, counts=counts)
