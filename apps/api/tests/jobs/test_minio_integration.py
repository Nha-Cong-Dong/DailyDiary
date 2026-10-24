"""Tích hợp với MinIO thật (docker compose, http://localhost:9000, khóa minioadmin): sao lưu DB +
khôi phục và sao lưu ảnh đi qua S3BlobStore. Tự tạo/xóa bucket tạm; không kết nối được MinIO
(job `api` trên CI) thì skip.
"""

import io
from uuid import uuid4

import boto3
import pytest
from botocore.config import Config

from app.core.config import settings
from app.db import collections as c
from app.jobs.backup_db import backup_db, list_backups, restore_db
from app.jobs.backup_photos import backup_photos
from app.jobs.blobstore import S3BlobStore
from tests.jobs.helpers import add_entry, add_user

pytestmark = pytest.mark.anyio

ENDPOINT = "http://localhost:9000"
RESTORE_DB = settings.mongodb_test_db.removesuffix("_test") + "_minio_restore_test"


def _client():
    return boto3.client(
        "s3",
        endpoint_url=ENDPOINT,
        aws_access_key_id="minioadmin",
        aws_secret_access_key="minioadmin",
        region_name="us-east-1",
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            connect_timeout=1,
            read_timeout=5,
            retries={"max_attempts": 1},
        ),
    )


def _drop_bucket(client, bucket: str) -> None:
    pages = client.get_paginator("list_objects_v2").paginate(Bucket=bucket)
    keys = [{"Key": o["Key"]} for page in pages for o in page.get("Contents", [])]
    if keys:
        client.delete_objects(Bucket=bucket, Delete={"Objects": keys, "Quiet": True})
    client.delete_bucket(Bucket=bucket)


@pytest.fixture(scope="module")
def minio():
    """Kiểm tra kết nối một lần cho cả file (Windows chờ vài giây mỗi lần kết nối bị từ chối)."""
    client = _client()
    try:
        client.list_buckets()
    except Exception as exc:
        pytest.skip(f"không kết nối được MinIO ở {ENDPOINT} ({type(exc).__name__})")
    return client


@pytest.fixture
def buckets(minio):
    client = minio
    names = (f"dd-jobs-src-{uuid4().hex[:12]}", f"dd-jobs-bak-{uuid4().hex[:12]}")
    for name in names:
        client.create_bucket(Bucket=name)
    yield client, S3BlobStore(client, names[0]), S3BlobStore(client, names[1])
    for name in names:
        _drop_bucket(client, name)


async def test_backup_and_restore_db_through_minio(db, mongo, buckets):
    _, _, backup = buckets
    uid = await add_user(db)
    await add_entry(db, uid, "2026-10-01", photos=2)
    await mongo.drop_database(RESTORE_DB)
    try:
        r = await backup_db(db, backup, keep=1)
        assert await list_backups(backup) == [r.key]
        await restore_db(mongo, backup, target=RESTORE_DB)
        for name in c.ALL:
            original = await db[name].find({}).sort("_id", 1).to_list()
            assert await mongo[RESTORE_DB][name].find({}).sort("_id", 1).to_list() == original
    finally:
        await mongo.drop_database(RESTORE_DB)


async def test_backup_photos_through_minio(buckets):
    _, source, backup = buckets
    big = bytes(range(256)) * 40_000  # ~10 MB: upload_fileobj chia multipart
    await source.put("u1/2026/10/01/a.webp", io.BytesIO(big))
    await source.put("u1/2026/10/01/b.webp", io.BytesIO(b"bb"))

    r = await backup_photos(source, backup)
    assert (r.copied, r.failed) == (2, 0)
    assert await backup.list("photos/") == {
        "photos/u1/2026/10/01/a.webp": len(big),
        "photos/u1/2026/10/01/b.webp": 2,
    }
    body = await backup.get("photos/u1/2026/10/01/a.webp")
    try:
        assert body.read() == big
    finally:
        body.close()

    r = await backup_photos(source, backup)
    assert (r.copied, r.unchanged) == (0, 2)
