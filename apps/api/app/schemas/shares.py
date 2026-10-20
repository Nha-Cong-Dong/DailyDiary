from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.limits import get_limits


class ShareParts(BaseModel):
    """Các phần người nhận được xem. Ngày viết luôn hiện nên không có cờ."""

    show_name: bool
    show_score: bool
    show_sub_icon: bool
    show_flag: bool
    show_title: bool
    show_content: bool
    show_keywords: bool
    # Ảnh được chọn (id trong entries.photos). Rỗng = không chia sẻ ảnh.
    photo_ids: list[UUID]


class ShareUpdate(ShareParts):
    """PUT /entries/{date}/share: bật link (lần đầu tạo token) hoặc đổi phần hiển thị."""

    model_config = ConfigDict(extra="forbid")

    @field_validator("photo_ids")
    @classmethod
    def _photo_ids(cls, v: list[UUID]) -> list[UUID]:
        if len(set(v)) != len(v):
            raise ValueError("ảnh bị trùng")
        if len(v) > get_limits().tier().photos.per_day_max:
            raise ValueError("quá số ảnh cho phép")
        return v

    def has_content(self) -> bool:
        # Tên người viết không tính: chỉ có tên và ngày thì không có gì để xem.
        return any(
            (
                self.show_score,
                self.show_sub_icon,
                self.show_flag,
                self.show_title,
                self.show_content,
                self.show_keywords,
                self.photo_ids,
            )
        )


class ShareOut(ShareParts):
    """Link của một ngày, chỉ chủ trang thấy."""

    entry_date: str
    token: str
    url: str
    created_at: datetime
    updated_at: datetime


class SharedEntryOut(ShareOut):
    """Một dòng ở màn "Trang đang chia sẻ": link kèm tóm tắt trang (của chính chủ)."""

    title: str | None
    score: int
    sub_icon: str | None
    flag_color: str | None
    photo_count: int
    # Chỉ cho biết trang có phần đó hay không, không trả nội dung.
    has_content: bool
    keyword_count: int


class PublicShareOut(BaseModel):
    """GET /public/shares/{token}. Chỉ có các trường chủ trang đã chọn; trường không chọn vắng mặt trong JSON.

    Không có id nội bộ, email hay user_id.
    """

    entry_date: str
    author_name: str | None = None
    icon_set_id: str | None = None  # đi cùng score để vẽ icon chính
    score: int | None = None
    sub_icon: str | None = None
    flag_color: str | None = None
    title: str | None = None
    content: str | None = None
    keywords: list[str] | None = None
    # Số ảnh được chia sẻ còn tồn tại.
    # TODO(Bước 7): thêm `photos` [{thumb_url, url}] là link ký có hạn (~1 giờ).
    photo_count: int | None = None
