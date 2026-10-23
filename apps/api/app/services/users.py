"""Người dùng: tạo/cập nhật khi đăng nhập Google, đọc và sửa hồ sơ (/me), ảnh đại diện tự tải lên."""

import unicodedata
from datetime import UTC, datetime
from uuid import UUID, uuid4

from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.catalog import get_icons
from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.storage import UPLOAD_EXPIRES, Storage
from app.db import collections as c
from app.schemas.photos import AvatarUploadIn, AvatarUploadOut
from app.schemas.users import MeUpdate, User
from app.services.photos import EXT, MAGIC


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
            "custom_flag_colors": [],
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


def avatar_key(user_id: UUID, upload_id: UUID, content_type: str) -> str:
    return f"{user_id}/avatar/{upload_id}.{EXT[content_type]}"


def create_avatar_upload(storage: Storage, user: User, content_type: str) -> AvatarUploadOut:
    upload_id = uuid4()
    return AvatarUploadOut(
        upload_id=upload_id,
        upload_url=storage.upload_url(avatar_key(user.id, upload_id, content_type), content_type),
        headers={"Content-Type": content_type},
        expires_in=UPLOAD_EXPIRES,
    )


async def _verified_avatar(storage: Storage, user: User, upload: AvatarUploadIn) -> str:
    """Key ảnh đại diện vừa tải nếu hợp lệ (tồn tại, ≤ avatar_max_bytes, đúng định dạng); sai thì xóa, 422."""
    key = avatar_key(user.id, upload.upload_id, upload.content_type)
    max_bytes = get_limits().tier(user.account_tier).profile.avatar_max_bytes
    size = await storage.size(key)
    if (
        size is not None
        and 0 < size <= max_bytes
        and MAGIC[upload.content_type](await storage.first_bytes(key))
    ):
        return key
    await storage.delete(key)
    raise ApiError(422, "AVATAR_INVALID", "Ảnh đại diện chưa tải lên đủ, quá lớn hoặc sai định dạng")


async def update_me(db: AsyncDatabase, user: User, data: MeUpdate, storage: Storage | None = None) -> User:
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
        fields["avatar_key"] = None
    if data.avatar_upload is not None:
        if storage is None:
            raise ApiError(503, "STORAGE_UNAVAILABLE", "Kho ảnh chưa sẵn sàng")
        fields["avatar_key"] = await _verified_avatar(storage, user, data.avatar_upload)
    if data.custom_flag_colors is not None:
        max_colors = get_limits().tier(user.account_tier).profile.custom_flag_colors_max
        if len(data.custom_flag_colors) > max_colors:
            raise ApiError(422, "FLAG_COLORS_LIMIT", f"Tối đa {max_colors} màu cờ tùy chỉnh")
        fields["custom_flag_colors"] = data.custom_flag_colors
    if data.onboarded and user.onboarded_at is None:
        fields["onboarded_at"] = datetime.now(UTC)
    if not fields:
        return user
    doc = await db[c.USERS].find_one_and_update(
        {"_id": user.id, "deleted_at": None}, {"$set": fields}, return_document=ReturnDocument.AFTER
    )
    if doc is None:
        raise ApiError(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn")
    # Ảnh đại diện cũ (tự tải lên) bị thay hoặc gỡ: xóa khỏi kho.
    if "avatar_key" in fields and user.avatar_key and user.avatar_key != fields["avatar_key"] and storage:
        await storage.delete(user.avatar_key)
    return User.from_doc(doc)


async def get_user(db: AsyncDatabase, user_id: UUID) -> User | None:
    doc = await db[c.USERS].find_one({"_id": user_id, "deleted_at": None})
    return User.from_doc(doc) if doc else None
