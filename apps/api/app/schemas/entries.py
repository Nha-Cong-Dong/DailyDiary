from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.catalog import get_icons, normalize_hex
from app.core.text import clean_text, keyword_norm, nfc


class EntryWrite(BaseModel):
    """PUT /entries/{date}: tạo hoặc cập nhật nhật ký một ngày (F-01).

    Giới hạn độ dài và số từ khóa phụ thuộc cấp tài khoản nên kiểm tra ở service (shared/limits.json).
    """

    model_config = ConfigDict(extra="forbid")

    score: int = Field(ge=1, le=5, strict=True)
    title: str | None = None
    content: str | None = None
    sub_icon: str | None = None
    flag_color: str | None = None
    keywords: list[str] = Field(default_factory=list)
    # `updated_at` client nhận được lần trước (gửi lại nguyên chuỗi). None = tạo mới.
    # Khác bản đang lưu → 409, để không ghi đè bài vừa sửa ở tab/máy khác.
    updated_at: datetime | None = None

    @field_validator("title", "content")
    @classmethod
    def _clean(cls, v: str | None) -> str | None:
        return clean_text(v)

    @field_validator("sub_icon")
    @classmethod
    def _sub_icon(cls, v: str | None) -> str | None:
        v = clean_text(v)
        if v is not None and v not in get_icons().sub_icons:
            raise ValueError("sub icon không có trong danh sách")
        return v

    @field_validator("flag_color")
    @classmethod
    def _flag_color(cls, v: str | None) -> str | None:
        # Không bắt buộc nằm trong users.custom_flag_colors: người dùng gỡ màu khỏi danh sách thì
        # bài cũ mang màu đó vẫn phải tự lưu được.
        return None if v is None else normalize_hex(v)

    @field_validator("keywords")
    @classmethod
    def _keywords(cls, v: list[str]) -> list[str]:
        cleaned = [" ".join(nfc(k).split()) for k in v]
        if any(not k for k in cleaned):
            raise ValueError("từ khóa rỗng")
        norms = [keyword_norm(k) for k in cleaned]
        if len(set(norms)) != len(norms):
            raise ValueError("từ khóa bị trùng")
        return cleaned


class EntryPhotoOut(BaseModel):
    """Ảnh của một ngày. `url`/`thumb_url` là link ký có hạn ~1 giờ (null khi kho ảnh chưa cấu hình)."""

    id: UUID
    position: int
    width: int
    height: int
    url: str | None = None
    thumb_url: str | None = None


class EntryOut(BaseModel):
    entry_date: date
    score: int
    title: str | None
    content: str | None
    sub_icon: str | None
    flag_color: str | None
    keywords: list[str]
    photos: list[EntryPhotoOut]
    created_at: datetime
    updated_at: datetime


class EntryDeletedOut(BaseModel):
    """Kết quả xóa mềm: khôi phục được bằng POST /entries/{date}/restore trước `restore_until`."""

    entry_date: date
    deleted_at: datetime
    restore_until: datetime
