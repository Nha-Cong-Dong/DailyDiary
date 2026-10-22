"""Người dùng: tạo/cập nhật khi đăng nhập Google, đọc và sửa hồ sơ (/me)."""

import unicodedata
from datetime import UTC, datetime
from uuid import UUID, uuid4

from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.catalog import get_icons
from app.core.errors import ApiError
from app.core.limits import get_limits
from app.db import collections as c
from app.schemas.users import MeUpdate, User


class AccountDeleted(Exception):
    """Tài khoản đang chờ xóa (deleted_at khác null): không cho đăng nhập lại."""


def clean_display_name(name: str | None, email: str | None, tier: str | None = None) -> str:
    """Tên lấy từ Google: NFC, gộp khoảng trắng, cắt theo limits; trống thì dùng phần trước @ của email."""
    max_len = get_limits().tier(tier).profile.display_name_max
    text = " ".join(unicodedata.normalize("NFC", name or "").split())
    if not text and email:
        text = email.split("@")[0]
    return (text or "Bạn")[:max_len]


async def upsert_google_user(
    db: AsyncDatabase,
    *,
    google_sub: str,
    email: str,
    display_name: str | None,
    avatar_url: str | None,
    timezone: str,
) -> User:
    now = datetime.now(UTC)
    update = {
        "$set": {"email": email},
        # Chỉ đặt khi tạo mới: người dùng có thể đã tự sửa tên, múi giờ, bộ icon trong /me.
        "$setOnInsert": {
            "_id": uuid4(),
            "display_name": clean_display_name(display_name, email),
            "avatar_url": avatar_url,
            "timezone": timezone,
            "icon_set_id": get_icons().default_icon_set,
            "account_tier": get_limits().default_tier,
            "joined_at": now,
            "onboarded_at": None,
            "deleted_at": None,
        },
    }
    try:
        doc = await db[c.USERS].find_one_and_update(
            {"google_sub": google_sub}, update, upsert=True, return_document=ReturnDocument.AFTER
        )
    except DuplicateKeyError:
        # Hai callback cùng lúc cho một người mới: bên thua chạy lại sẽ khớp document vừa tạo.
        doc = await db[c.USERS].find_one_and_update(
            {"google_sub": google_sub}, update, upsert=True, return_document=ReturnDocument.AFTER
        )
    if doc.get("deleted_at") is not None:
        raise AccountDeleted
    return User.from_doc(doc)


async def update_me(db: AsyncDatabase, user: User, data: MeUpdate) -> User:
    """Chỉ $set các trường đã kiểm tra kiểu trong MeUpdate, không đưa dict từ request vào truy vấn."""
    fields: dict = {}
    if data.display_name is not None:
        max_len = get_limits().tier(user.account_tier).profile.display_name_max
        if len(data.display_name) > max_len:
            raise ApiError(422, "VALIDATION_ERROR", f"Tên tối đa {max_len} ký tự")
        fields["display_name"] = data.display_name
    if data.timezone is not None:
        # Đổi múi giờ chỉ áp dụng cho các ngày sau đó: entry_date đã lưu không bị tính lại.
        fields["timezone"] = data.timezone
    if data.icon_set_id is not None:
        fields["icon_set_id"] = data.icon_set_id
    if "avatar_url" in data.model_fields_set:
        fields["avatar_url"] = None
    if data.onboarded and user.onboarded_at is None:
        fields["onboarded_at"] = datetime.now(UTC)
    if not fields:
        return user
    doc = await db[c.USERS].find_one_and_update(
        {"_id": user.id, "deleted_at": None}, {"$set": fields}, return_document=ReturnDocument.AFTER
    )
    if doc is None:
        raise ApiError(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn")
    return User.from_doc(doc)


async def get_user(db: AsyncDatabase, user_id: UUID) -> User | None:
    doc = await db[c.USERS].find_one({"_id": user_id, "deleted_at": None})
    return User.from_doc(doc) if doc else None
