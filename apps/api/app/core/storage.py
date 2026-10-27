"""Kho ảnh tương thích S3 (MinIO local, R2/Supabase Storage production) qua boto3.

- Hai client: `client` gọi kho từ backend (S3_ENDPOINT_URL), `presign` chỉ để ký URL bằng địa chỉ trình duyệt
  mở được (S3_PUBLIC_ENDPOINT_URL). Host nằm trong chữ ký SigV4 nên không thay host sau khi ký được.
- Ký URL chỉ tính trong bộ nhớ; head/get/delete là I/O chặn nên chạy qua `anyio.to_thread`.
- Key luôn do backend dựng, bắt đầu bằng `user_id/`; không bao giờ ký key client gửi lên.
"""

from typing import Annotated

import anyio
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import Depends, Request

from app.core.config import settings
from app.core.errors import ApiError

UPLOAD_EXPIRES = 300  # 5 phút đủ để tải một ảnh đã nén
VIEW_EXPIRES = 3600  # đặc tả: link xem ảnh khoảng 1 giờ


def make_s3_client(endpoint_url: str | None):
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},  # MinIO, Supabase cần path-style; R2 nhận cả hai
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=3,
            read_timeout=10,
        ),
    )


class DeleteFailed(Exception):
    """S3 nhận delete_objects nhưng từ chối một số key (vd. AccessDenied). Chỉ giữ số lượng, không key."""

    def __init__(self, failed: int) -> None:
        super().__init__(f"Không xóa được {failed} object")
        self.failed = failed


def delete_keys(client, bucket: str, keys: tuple[str, ...] | list[str]) -> None:
    """Xóa theo lô (delete_objects nhận tối đa 1000 key mỗi lần, giới hạn của S3). Chạy trong thread.

    Với `Quiet=True`, S3 trả 200 kể cả khi từng key bị từ chối và chỉ liệt kê chúng ở `Errors`; bỏ qua thì
    người gọi tưởng đã xóa xong rồi xóa document, để lại ảnh mồ côi. Key không tồn tại không bị coi là lỗi.
    """
    failed = 0
    for i in range(0, len(keys), 1000):
        batch = keys[i : i + 1000]
        resp = client.delete_objects(
            Bucket=bucket, Delete={"Objects": [{"Key": k} for k in batch], "Quiet": True}
        )
        failed += len(resp.get("Errors") or [])
    if failed:
        raise DeleteFailed(failed)


class Storage:
    def __init__(self, client, presign_client, bucket: str):
        self.client = client
        self.presign = presign_client
        self.bucket = bucket

    def upload_url(self, key: str, content_type: str) -> str:
        """Presigned PUT. Trình duyệt phải gửi đúng header Content-Type đã ký, không kèm cookie."""
        return self.presign.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=UPLOAD_EXPIRES,
            HttpMethod="PUT",
        )

    def view_url(self, key: str) -> str:
        return self.presign.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=VIEW_EXPIRES
        )

    async def size(self, key: str) -> int | None:
        """Dung lượng object, None nếu chưa có."""

        def head() -> int | None:
            try:
                return self.client.head_object(Bucket=self.bucket, Key=key)["ContentLength"]
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                    return None
                raise

        return await anyio.to_thread.run_sync(head)

    async def first_bytes(self, key: str, n: int = 16) -> bytes:
        def read() -> bytes:
            return self.client.get_object(Bucket=self.bucket, Key=key, Range=f"bytes=0-{n - 1}")[
                "Body"
            ].read()

        return await anyio.to_thread.run_sync(read)

    async def delete(self, *keys: str) -> None:
        if keys:
            await anyio.to_thread.run_sync(delete_keys, self.client, self.bucket, keys)

    async def list_keys(self, prefix: str) -> list[str]:
        """Mọi key bắt đầu bằng `prefix` (đọc hết các trang của list_objects_v2)."""

        def collect() -> list[str]:
            pages = self.client.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=prefix)
            return [obj["Key"] for page in pages for obj in page.get("Contents", [])]

        return await anyio.to_thread.run_sync(collect)

    async def delete_prefix(self, prefix: str, *, keep: str | None = None) -> int:
        """Xóa mọi object theo tiền tố (trừ các key bắt đầu bằng `keep`); trả số object đã xóa."""
        keys = [k for k in await self.list_keys(prefix) if not (keep and k.startswith(keep))]
        await self.delete(*keys)
        return len(keys)


def make_storage() -> Storage | None:
    """Tạo trong lifespan; None khi chưa cấu hình kho (bước 1–6 chạy không cần kho ảnh)."""
    if not (settings.s3_access_key and settings.s3_secret_key):
        return None
    return Storage(
        make_s3_client(settings.s3_endpoint_url),
        make_s3_client(settings.s3_public_endpoint_url or settings.s3_endpoint_url),
        settings.s3_bucket,
    )


def get_storage(request: Request) -> Storage:
    storage = getattr(request.app.state, "storage", None)
    if storage is None:
        raise ApiError(503, "STORAGE_UNAVAILABLE", "Kho ảnh chưa sẵn sàng")
    return storage


def get_optional_storage(request: Request) -> Storage | None:
    """Cho endpoint đọc (nhật ký, /me): thiếu kho thì vẫn trả dữ liệu, chỉ không có link ảnh."""
    return getattr(request.app.state, "storage", None)


S3 = Annotated[Storage, Depends(get_storage)]
OptionalS3 = Annotated[Storage | None, Depends(get_optional_storage)]
