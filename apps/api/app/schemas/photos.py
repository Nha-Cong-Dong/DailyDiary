from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Trình duyệt nén mọi ảnh (kể cả HEIC) về WebP; trình duyệt không mã hóa được WebP (Safari cũ) thì gửi JPEG.
# Kho không bao giờ nhận ảnh gốc hay HEIC.
UploadType = Literal["image/webp", "image/jpeg"]


class PhotoUploadIn(BaseModel):
    """POST /entries/{date}/photos/upload-url."""

    model_config = ConfigDict(extra="forbid")

    content_type: UploadType


class PhotoUploadOut(BaseModel):
    """Hai presigned PUT (ảnh chính + ảnh thu nhỏ). PUT phải gửi đúng `headers`, không kèm cookie."""

    photo_id: UUID
    upload_url: str
    thumb_upload_url: str
    headers: dict[str, str]
    expires_in: int


class PhotoConfirmIn(BaseModel):
    """POST /entries/{date}/photos: xác nhận đã tải xong. Backend tự dựng key từ phiên + ngày + photo_id."""

    model_config = ConfigDict(extra="forbid")

    photo_id: UUID
    content_type: UploadType
    # Cạnh tối đa kiểm ở service theo limits.json (photos.main_max_edge_px).
    width: int = Field(ge=1, strict=True)
    height: int = Field(ge=1, strict=True)


class PhotoOrderIn(BaseModel):
    """PATCH /entries/{date}/photos/order: đủ mọi ảnh của trang, theo thứ tự mới."""

    model_config = ConfigDict(extra="forbid")

    photo_ids: list[UUID]


class AvatarUploadOut(BaseModel):
    """POST /me/avatar/upload-url. Tải xong thì gửi PATCH /me {avatar_upload: {...}} để dùng ảnh."""

    upload_id: UUID
    upload_url: str
    headers: dict[str, str]
    expires_in: int


class AvatarUploadIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    upload_id: UUID
    content_type: UploadType
