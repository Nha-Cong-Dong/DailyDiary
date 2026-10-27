import unicodedata
from datetime import datetime
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.core.catalog import get_flag_colors, get_icons, normalize_hex
from app.core.storage import Storage
from app.schemas.photos import AvatarUploadIn

AccountTier = Literal["beta", "free", "premium"]


def valid_timezone(value: str) -> str:
    """Múi giờ IANA có thật (vd Asia/Ho_Chi_Minh, kể cả tên cũ Asia/Saigon mà Chromium trả về)."""
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError) as exc:  # ValueError: chuỗi như "../x"
        raise ValueError("múi giờ không hợp lệ") from exc
    return value


class User(BaseModel):
    """Người dùng hiện tại (đọc từ DB, dùng trong backend)."""

    model_config = ConfigDict(frozen=True)

    id: UUID
    email: str
    display_name: str
    avatar_url: str | None  # ảnh Google
    timezone: str
    icon_set_id: str
    account_tier: AccountTier
    joined_at: datetime
    onboarded_at: datetime | None
    custom_flag_colors: tuple[str, ...] = ()
    avatar_key: str | None = None  # ảnh tự tải lên (kho ảnh); có thì thay ảnh Google

    @classmethod
    def from_doc(cls, doc: dict) -> "User":
        return cls(
            id=doc["_id"],
            email=doc["email"],
            display_name=doc["display_name"],
            avatar_url=doc.get("avatar_url"),
            timezone=doc["timezone"],
            icon_set_id=doc.get("icon_set_id") or get_icons().default_icon_set,
            account_tier=doc["account_tier"],
            joined_at=doc["joined_at"],
            onboarded_at=doc.get("onboarded_at"),
            custom_flag_colors=tuple(doc.get("custom_flag_colors") or ()),
            avatar_key=doc.get("avatar_key"),
        )


class MeOut(BaseModel):
    """GET/PATCH /me. Không trả google_sub hay id nội bộ."""

    email: str
    display_name: str
    avatar_url: str | None
    timezone: str
    icon_set_id: str
    account_tier: AccountTier
    joined_at: datetime
    onboarded: bool
    # Màu cờ người dùng tự thêm (#RRGGBB), xếp theo thứ tự thêm; 8 màu có sẵn ở shared/flag_colors.json.
    custom_flag_colors: list[str]

    @classmethod
    def from_user(cls, user: User, storage: Storage | None = None) -> "MeOut":
        # Ảnh tự tải lên: link ký có hạn ~1 giờ. Chưa cấu hình kho thì không có ảnh
        # (không lùi về ảnh Google cũ).
        if user.avatar_key:
            avatar = storage.view_url(user.avatar_key) if storage else None
        else:
            avatar = user.avatar_url
        return cls(
            email=user.email,
            display_name=user.display_name,
            avatar_url=avatar,
            timezone=user.timezone,
            icon_set_id=user.icon_set_id,
            account_tier=user.account_tier,
            joined_at=user.joined_at,
            onboarded=user.onboarded_at is not None,
            custom_flag_colors=list(user.custom_flag_colors),
        )


class MeUpdate(BaseModel):
    """PATCH /me: chỉ các trường dưới đây, trường khác bị từ chối.

    Độ dài tên kiểm ở service, theo limits.json của cấp tài khoản.
    """

    model_config = ConfigDict(extra="forbid")

    display_name: str | None = None
    timezone: str | None = None
    icon_set_id: str | None = None
    # Chỉ cho gỡ ảnh (null); không bao giờ nhận URL tùy ý từ client.
    avatar_url: None = None
    # Dùng ảnh vừa tải lên qua POST /me/avatar/upload-url (đã cắt vuông, nén trên trình duyệt).
    avatar_upload: AvatarUploadIn | None = None
    # Hoàn tất 3 bước lần đầu (chỉ đặt được, không gỡ).
    onboarded: Literal[True] | None = None
    # Thay cả danh sách màu cờ tùy chỉnh (thêm/gỡ). Số màu tối đa kiểm ở service, theo limits.json.
    custom_flag_colors: list[str] | None = None

    @field_validator("display_name")
    @classmethod
    def _name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = " ".join(unicodedata.normalize("NFC", v).split())
        if not v:
            raise ValueError("tên không được để trống")
        return v

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: str | None) -> str | None:
        return None if v is None else valid_timezone(v)

    @field_validator("icon_set_id")
    @classmethod
    def _icon_set(cls, v: str | None) -> str | None:
        if v is not None and v not in get_icons().icon_set_ids:
            raise ValueError("bộ icon không tồn tại")
        return v

    @model_validator(mode="after")
    def _one_avatar_change(self) -> "MeUpdate":
        if self.avatar_upload is not None and "avatar_url" in self.model_fields_set:
            raise ValueError("chỉ được đổi hoặc gỡ ảnh đại diện, không cả hai")
        return self

    @field_validator("custom_flag_colors")
    @classmethod
    def _custom_flags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        hexes = [normalize_hex(h) for h in v]
        if len(set(hexes)) != len(hexes):
            raise ValueError("màu cờ bị trùng")
        if set(hexes) & get_flag_colors().hexes:
            raise ValueError("màu này đã có trong bảng màu")
        return hexes


class DevLoginIn(BaseModel):
    """POST /auth/dev-login (chỉ local/test)."""

    model_config = ConfigDict(extra="forbid")

    email: str = "dev@example.com"
    display_name: str | None = None
