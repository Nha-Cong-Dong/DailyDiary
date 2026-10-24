"""Kho ảnh giả cho test: object giữ trong bộ nhớ, URL ký là chuỗi đoán trước được."""

import io

from app.core.storage import Storage

WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


class FakeStorage(Storage):
    def __init__(self) -> None:
        super().__init__(client=None, presign_client=None, bucket="test-bucket")
        self.objects: dict[str, bytes] = {}

    def upload_url(self, key: str, content_type: str) -> str:
        return f"https://s3.test/{self.bucket}/{key}?put&ct={content_type}"

    def view_url(self, key: str) -> str:
        return f"https://s3.test/{self.bucket}/{key}?signed"

    def put(self, key: str, body: bytes) -> None:
        """Giả lập trình duyệt PUT lên presigned URL."""
        self.objects[key] = body

    async def size(self, key: str) -> int | None:
        body = self.objects.get(key)
        return None if body is None else len(body)

    async def first_bytes(self, key: str, n: int = 16) -> bytes:
        return self.objects[key][:n]

    async def delete(self, *keys: str) -> None:
        for key in keys:
            self.objects.pop(key, None)

    async def list_keys(self, prefix: str) -> list[str]:
        return sorted(k for k in self.objects if k.startswith(prefix))


class FakeBlobStore:
    """Kho object giả trong bộ nhớ theo giao diện `app.jobs.blobstore.BlobStore` (kho sao lưu, kho ảnh chính).

    `fail_get`: các key đọc sẽ ném lỗi (giả lập mất kết nối với một object).
    """

    def __init__(self, objects: dict[str, bytes] | None = None) -> None:
        self.objects: dict[str, bytes] = dict(objects or {})
        self.fail_get: set[str] = set()
        self.puts: list[str] = []

    async def put(self, key: str, body) -> None:
        self.objects[key] = body.read()
        self.puts.append(key)

    async def get(self, key: str):
        if key in self.fail_get:
            raise ConnectionError("kho giả: mất kết nối")
        return io.BytesIO(self.objects[key])

    async def list(self, prefix: str) -> dict[str, int]:
        return {k: len(v) for k, v in sorted(self.objects.items()) if k.startswith(prefix)}

    async def delete(self, *keys: str) -> None:
        for key in keys:
            self.objects.pop(key, None)
