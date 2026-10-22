# Presigned URL với boto3 (MinIO local, R2/Supabase Storage production)

## `app/core/storage.py`

```python
from typing import Annotated

import boto3
from botocore.config import Config
from fastapi import Depends, Request

from app.core.config import settings


def make_s3_client(endpoint_url: str):
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},  # MinIO, Supabase cần path-style; R2 hỗ trợ cả hai kiểu
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=3,
            read_timeout=10,
        ),
    )


class Storage:
    def __init__(self, client, presign_client, bucket: str):
        self.client = client  # gọi kho từ backend
        self.presign = presign_client  # chỉ để ký URL cho trình duyệt
        self.bucket = bucket


def get_s3(request: Request) -> Storage:
    return Storage(request.app.state.s3, request.app.state.s3_presign, settings.s3_bucket)


S3 = Annotated[Storage, Depends(get_s3)]
```

Client boto3 an toàn khi dùng chung giữa các thread, nên tạo một lần trong `lifespan`.

Vì sao cần hai client: chữ ký SigV4 bao gồm host. Nếu API chạy trong Docker và gọi `http://minio:9000`,
URL ký bằng host đó sẽ không mở được từ trình duyệt. Thay host trong chuỗi sau khi ký sẽ làm hỏng chữ ký.
Local không chạy API trong Docker thì hai URL có thể giống nhau.

## Tạo URL upload (`services/photo_service.py`)

```python
from uuid import UUID, uuid4

import anyio
from botocore.exceptions import ClientError

EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
UPLOAD_EXPIRES = 300  # 5 phút đủ để upload một ảnh đã nén
VIEW_EXPIRES = 3600  # đặc tả: link xem ảnh khoảng 1 giờ


def photo_key(user_id: UUID, day: date, photo_id: UUID, ext: str, thumb: bool = False) -> str:
    suffix = "_thumb" if thumb else ""
    return f"{user_id}/{day:%Y/%m/%d}/{photo_id}{suffix}.{ext}"


def create_upload_urls(s3: Storage, user_id: UUID, day: date, content_type: str) -> dict:
    # Giới hạn số ảnh/ngày, dung lượng, content_type hợp lệ: kiểm tra trước (api-conventions, core/limits.py).
    photo_id = uuid4()
    ext = EXT[content_type]

    def sign(key: str) -> str:
        return s3.presign.generate_presigned_url(
            "put_object",
            Params={"Bucket": s3.bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=UPLOAD_EXPIRES,
            HttpMethod="PUT",
        )

    return {
        "photo_id": photo_id,
        "upload_url": sign(photo_key(user_id, day, photo_id, ext)),
        "thumb_upload_url": sign(photo_key(user_id, day, photo_id, ext, thumb=True)),
        "headers": {"Content-Type": content_type},  # frontend phải gửi đúng header này khi PUT
        "expires_in": UPLOAD_EXPIRES,
    }
```

`generate_presigned_url` chỉ tính chữ ký trong bộ nhớ, không gọi mạng, nên gọi trực tiếp trong `async def` được.

Frontend upload:

```ts
await fetch(upload_url, { method: "PUT", headers: { "Content-Type": ct }, body: blob });
// Không gửi credentials, không thêm header khác (header lạ không có trong chữ ký → 403).
```

### Vì sao PUT mà không phải presigned POST

`generate_presigned_post` có điều kiện `["content-length-range", min, max]` nên kho từ chối file quá lớn
ngay khi upload, và MinIO cũng như AWS S3 đều hỗ trợ. Nhưng Cloudflare R2 (một lựa chọn trong đặc tả)
không hỗ trợ upload bằng form POST (tài liệu R2 "Presigned URLs", cập nhật 2026-08-22). Dùng PUT để code chạy được trên mọi kho; giới hạn dung lượng được
bảo đảm ở bước xác nhận bên dưới. Nếu chốt dùng kho có hỗ trợ POST, có thể chuyển sang POST để chặn sớm.

## Xác nhận ảnh

Client gửi `photo_id`, `content_type`, `width`, `height`. Backend **tự dựng lại key** từ `user.id`, ngày
và `photo_id`, không nhận key từ client, nên không ai trỏ được tới file của người khác.

```python
MAGIC = {
    "image/jpeg": lambda b: b[:3] == b"\xff\xd8\xff",
    "image/png": lambda b: b[:8] == b"\x89PNG\r\n\x1a\n",
    "image/webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
}


async def _head(s3: Storage, key: str) -> dict | None:
    try:
        return await anyio.to_thread.run_sync(lambda: s3.client.head_object(Bucket=s3.bucket, Key=key))
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
            return None
        raise


async def _first_bytes(s3: Storage, key: str) -> bytes:
    def read() -> bytes:
        obj = s3.client.get_object(Bucket=s3.bucket, Key=key, Range="bytes=0-15")
        return obj["Body"].read()

    return await anyio.to_thread.run_sync(read)


async def _delete(s3: Storage, *keys: str) -> None:
    await anyio.to_thread.run_sync(
        lambda: s3.client.delete_objects(Bucket=s3.bucket, Delete={"Objects": [{"Key": k} for k in keys]})
    )


async def verify_uploaded(s3: Storage, key: str, content_type: str, max_bytes: int) -> int | None:
    """Trả size_bytes nếu hợp lệ; None nếu thiếu/sai (đã xóa file sai)."""
    head = await _head(s3, key)
    if head is None:
        return None
    size = head["ContentLength"]
    ok = 0 < size <= max_bytes and MAGIC[content_type](await _first_bytes(s3, key))
    if not ok:
        await _delete(s3, key)
        return None
    return size
```

Sau khi kiểm tra cả ảnh chính và ảnh thu nhỏ, thêm ảnh vào mảng `photos` của nhật ký bằng lệnh có điều kiện
giới hạn số ảnh (xem `mongodb.md` mục 5). Nếu lệnh không thêm được (đủ ảnh, bài không tồn tại), xóa hai object vừa
upload để không còn file mồ côi tính vào dung lượng của người dùng.

Mọi lệnh boto3 có I/O mạng (`head_object`, `get_object`, `delete_object(s)`, `list_objects_v2`) đều
chặn thread, nên phải bọc bằng `anyio.to_thread.run_sync`. Nếu gọi thẳng trong `async def`, mọi request
khác phải chờ.

## Link xem ảnh

```python
def view_url(s3: Storage, key: str) -> str:
    return s3.presign.generate_presigned_url(
        "get_object", Params={"Bucket": s3.bucket, "Key": key}, ExpiresIn=VIEW_EXPIRES
    )
```

Chỉ ký cho key lấy từ mảng `photos` của nhật ký đã lọc theo `user_id`; không ký key do client gửi lên.

## Xóa tài khoản

Xóa theo tiền tố `"{user_id}/"`: dùng `list_objects_v2` có phân trang để liệt kê, rồi `delete_objects`
từng lô tối đa 1000 key. Việc này chạy lâu, nên làm trong background job chứ không làm trong request.

## Cấu hình kho

- **MinIO local (docker compose)**: tạo bucket private (`mc mb local/dailydiary-photos`). MinIO mặc định
  cho phép CORS mọi origin; muốn giới hạn thì đặt `MINIO_API_CORS_ALLOW_ORIGIN=http://localhost:5173`.
- **R2 / Supabase**: bật CORS trên bucket cho origin của frontend, phương thức `PUT` (và `GET` nếu hiển
  thị ảnh trực tiếp), header `Content-Type`. Thiếu CORS, trình duyệt chặn upload và chỉ báo lỗi CORS.
- R2: `s3_region="auto"`, endpoint `https://<account_id>.r2.cloudflarestorage.com`.

## Test

Override `get_s3` bằng một object giả có `presign.generate_presigned_url` trả chuỗi cố định, và
`client.head_object` / `get_object` trả dữ liệu dựng sẵn. Cũng có thể dùng MinIO thật trong compose
cho một nhóm test tích hợp đánh dấu riêng.
