"""Lớp truy cập kho object cho tác vụ sao lưu: giao diện nhỏ `BlobStore` (put/get/list/delete).

- `S3BlobStore` bọc một client boto3 + bucket; dùng cho cả kho sao lưu (`BACKUP_S3_*`) lẫn kho ảnh chính
  (`S3_*`, chỉ đọc khi sao lưu ảnh). Test dùng bản giả trong bộ nhớ (`tests/fakes.py`).
- Mọi thao tác là I/O chặn của boto3 nên chạy qua `anyio.to_thread`.
- Đọc/ghi theo luồng: `put` nhận đối tượng file đọc được (boto3 tự chia multipart), `get` trả luồng đọc
  (`StreamingBody`), người gọi đóng sau khi dùng. Hai kho có thể khác nhà cung cấp nên không dùng copy_object.
"""

import shutil
from pathlib import Path
from typing import BinaryIO, Protocol

import anyio
import boto3
from botocore.config import Config

from app.core.config import settings
from app.core.storage import delete_keys, make_s3_client


class BlobStore(Protocol):
    async def put(self, key: str, body: BinaryIO) -> None:
        """Ghi object từ luồng đọc `body` (đọc tới hết)."""
        ...

    async def get(self, key: str) -> BinaryIO:
        """Luồng đọc nội dung object; người gọi phải đóng."""
        ...

    async def list(self, prefix: str) -> dict[str, int]:
        """Mọi object bắt đầu bằng `prefix`: key → dung lượng (byte)."""
        ...

    async def delete(self, *keys: str) -> None: ...


class S3BlobStore:
    def __init__(self, client, bucket: str) -> None:
        self.client = client
        self.bucket = bucket

    async def put(self, key: str, body: BinaryIO) -> None:
        await anyio.to_thread.run_sync(lambda: self.client.upload_fileobj(body, self.bucket, key))

    async def get(self, key: str) -> BinaryIO:
        def open_body() -> BinaryIO:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"]

        return await anyio.to_thread.run_sync(open_body)

    async def list(self, prefix: str) -> dict[str, int]:
        def collect() -> dict[str, int]:
            pages = self.client.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=prefix)
            return {obj["Key"]: obj["Size"] for page in pages for obj in page.get("Contents", [])}

        return await anyio.to_thread.run_sync(collect)

    async def delete(self, *keys: str) -> None:
        if keys:
            await anyio.to_thread.run_sync(delete_keys, self.client, self.bucket, keys)


def make_backup_client():
    """Client boto3 cho kho sao lưu: khóa riêng (`BACKUP_S3_*`), thời gian chờ đọc dài hơn kho ảnh vì file
    sao lưu lớn."""
    return boto3.client(
        "s3",
        endpoint_url=settings.backup_s3_endpoint_url,
        aws_access_key_id=settings.backup_s3_access_key,
        aws_secret_access_key=settings.backup_s3_secret_key,
        region_name=settings.backup_s3_region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            retries={"max_attempts": 5, "mode": "standard"},
            connect_timeout=5,
            read_timeout=60,
        ),
    )


def make_backup_store() -> S3BlobStore | None:
    """None khi chưa đặt BACKUP_S3_BUCKET (tác vụ sao lưu báo "chưa cấu hình" và thoát êm)."""
    if not settings.backup_s3_bucket:
        return None
    return S3BlobStore(make_backup_client(), settings.backup_s3_bucket)


def make_photo_store() -> S3BlobStore | None:
    """Kho ảnh chính, nhìn qua giao diện BlobStore (cần dung lượng từng object và đọc theo luồng)."""
    if not (settings.s3_access_key and settings.s3_secret_key):
        return None
    return S3BlobStore(make_s3_client(settings.s3_endpoint_url), settings.s3_bucket)


async def put_file(store: BlobStore, key: str, path: Path) -> None:
    f = await anyio.to_thread.run_sync(path.open, "rb")
    try:
        await store.put(key, f)
    finally:
        f.close()


async def get_file(store: BlobStore, key: str, path: Path) -> None:
    src = await store.get(key)
    try:
        dst = await anyio.to_thread.run_sync(path.open, "wb")
        try:
            await anyio.to_thread.run_sync(shutil.copyfileobj, src, dst, 1024 * 1024)
        finally:
            dst.close()
    finally:
        src.close()
