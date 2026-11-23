"""Schema cho bạn bè và sổ chung (ADR 0007, F-11).

- `author_id` không bao giờ trả về cho client: người xem biết ai viết qua `author.display_name`.
- `journal_id`/`storage_key` là id nội bộ — không lộ ra ngoài, trừ khi chính endpoint đó cần.
"""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.catalog import get_icons, normalize_hex
from app.core.text import clean_text


class FriendCodeOut(BaseModel):
    """GET /me/friend-code: mã bạn của tôi. Mã này không bao giờ vào log."""

    friend_code: str


class FriendRequestIn(BaseModel):
    """POST /friends/requests: gửi yêu cầu kết bạn bằng mã bạn của người kia."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=4, max_length=16)


class FriendOut(BaseModel):
    """Một người bạn trong danh sách bạn bè."""

    id: UUID
    display_name: str
    avatar_url: str | None
    # Cuốn sổ chung đang active với người này (nếu có).
    journal_id: UUID | None
    journal_status: str | None
    # Đang có lời mời mở sổ chung giữa hai người chưa (để hiện trạng thái "đang mời").
    journal_invite_pending: bool = False
    # Lần người bạn này hoạt động trong app gần nhất (điểm theo dõi hoạt động).
    last_active: datetime | None = None


class FriendListOut(BaseModel):
    """GET /friends."""

    friends: list[FriendOut]
    # Trần theo cấp tài khoản, để frontend hiện "x/y bạn".
    friends_max: int
    journals_max: int
    friends_count: int
    journals_count: int


class JournalInviteOut(BaseModel):
    """Một lời mời mở sổ chung (đến hoặc đi)."""

    id: UUID
    # "incoming" = người kia mời tôi; "outgoing" = tôi mời người kia.
    direction: str
    display_name: str
    avatar_url: str | None
    status: str
    created_at: datetime
    expires_at: datetime


class JournalInviteListOut(BaseModel):
    """GET /journals/invites."""

    incoming: list[JournalInviteOut]
    outgoing: list[JournalInviteOut]


class FriendRequestOut(BaseModel):
    """Một yêu cầu kết bạn (đến hoặc đi)."""

    id: UUID
    # "incoming" = người kia gửi cho tôi; "outgoing" = tôi gửi cho người kia.
    direction: str
    display_name: str
    avatar_url: str | None
    status: str
    created_at: datetime
    expires_at: datetime


class FriendRequestListOut(BaseModel):
    """GET /friends/requests."""

    incoming: list[FriendRequestOut]
    outgoing: list[FriendRequestOut]


class JournalModeIn(BaseModel):
    """POST /journals/{journal_id}/mode: đổi chế độ cùng viết / luân phiên."""

    model_config = ConfigDict(extra="forbid")

    mode: Literal["together", "alternating"]


class JournalOut(BaseModel):
    """Một cuốn sổ chung (M1: 1–1)."""

    id: UUID
    status: str
    mode: str
    # Cuốn thứ mấy của cặp (1, 2): để phân biệt sổ cũ đã lưu trữ với sổ mới.
    generation: int = 1
    # Thành viên khác (không phải tôi) — tên và avatar để hiện.
    partner_display_name: str
    partner_avatar_url: str | None
    # Lần người bạn hoạt động trong app gần nhất (để hiện "lần hoạt động" trên thẻ sổ).
    partner_last_active: datetime | None = None
    created_at: datetime
    ended_at: datetime | None
    # Chuỗi ấm (ngày có ít nhất một mục của một trong hai) và badge đồng bộ (cả hai cùng có mục).
    warm_streak: int
    synced_days: int
    longest_warm_streak: int
    # Mục của tôi trong sổ (nếu hôm nay đã ghi).
    my_today_entry: bool
    # Luân phiên (M2): hôm nay đến lượt tôi viết không (False = đến lượt bạn).
    my_turn: bool


class JournalListOut(BaseModel):
    """GET /journals."""

    journals: list[JournalOut]
    journals_max: int
    journals_count: int


class JournalMemberOut(BaseModel):
    """Thành viên của sổ (không lộ id nội bộ nếu không cần)."""

    display_name: str
    avatar_url: str | None
    role: str


class JournalDetailOut(JournalOut):
    """GET /journals/{id}: thêm thành viên và mốc chuỗi dài nhất."""

    members: list[JournalMemberOut]


class SharedEntryWrite(BaseModel):
    """PUT /journals/{id}/entries/{date}: viết mục chung của tôi.

    Giới hạn độ dài/số ảnh kiểm ở service theo `shared/limits.json` (nhóm `shared` của cấp tài khoản).
    `updated_at` là bản client đang sửa (đã biết); khác bản đang lưu → 409.
    """

    model_config = ConfigDict(extra="forbid")

    score: int = Field(ge=1, le=5, strict=True)
    title: str | None = None
    content: str | None = None
    sub_icon: str | None = None
    flag_color: str | None = None
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
        return None if v is None else normalize_hex(v)


class SharedEntryPhotoOut(BaseModel):
    """Ảnh của một mục chung. Link ký có hạn ~1 giờ."""

    id: UUID
    position: int
    width: int
    height: int
    url: str | None = None
    thumb_url: str | None = None


class SharedEntryOut(BaseModel):
    """Một mục chung. `author` là tên + avatar của người viết."""

    entry_date: date
    score: int
    title: str | None
    content: str | None
    sub_icon: str | None
    flag_color: str | None
    photos: list[SharedEntryPhotoOut]
    author_display_name: str
    author_avatar_url: str | None
    # Mục này có phải do tôi viết không (để frontend đánh dấu).
    mine: bool
    created_at: datetime
    updated_at: datetime


class SharedEntryPageOut(BaseModel):
    """GET /journals/{id}/entries: một trang mục chung, mới nhất trước."""

    entries: list[SharedEntryOut]
    next_cursor: str | None = None


class SharedPhotoUploadIn(BaseModel):
    """POST /journals/{id}/photos/upload-url."""

    model_config = ConfigDict(extra="forbid")

    content_type: str


class SharedPhotoConfirmIn(BaseModel):
    """POST /journals/{id}/photos: xác nhận ảnh đã tải lên kho."""

    model_config = ConfigDict(extra="forbid")

    photo_id: UUID
    content_type: str
    width: int = Field(ge=1, strict=True)
    height: int = Field(ge=1, strict=True)


class SharedPhotoOrderIn(BaseModel):
    """PATCH /journals/{id}/photos/order: đủ id ảnh của mục chung, theo thứ tự mới."""

    model_config = ConfigDict(extra="forbid")

    photo_ids: list[UUID]


class SharedPhotoUploadOut(BaseModel):
    """Hai presigned PUT cho ảnh chung (ảnh chính + ảnh thu nhỏ)."""

    photo_id: UUID
    upload_url: str
    thumb_upload_url: str
    headers: dict[str, str]
    expires_in: int
