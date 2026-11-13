"""Ảnh trong sổ chung (ADR 0007, F-11).

- Key: `{user_id}/shared/{photo_id}[_thumb].{ext}` — tiền tố `{user_id}/` giống ảnh nhật ký nên
  tác vụ xóa tài khoản (`delete_prefix`) dọn được, không rò rỉ ảnh mồ côi.
- Mọi thao tác kiểm tra mục chung thuộc sổ mà người gọi là thành viên; `author_id` lấy từ phiên.
- Mục chung nhẹ hơn trang nhật ký: tối đa `shared.photos_per_entry_max` ảnh (2).
"""

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from pymongo.asynchronous.database import AsyncDatabase

from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.storage import UPLOAD_EXPIRES, Storage
from app.db import collections as c
from app.schemas.social import SharedPhotoUploadOut
from app.schemas.users import User
from app.services.photos import EXT, MAGIC
from app.services.shared_journals import ACTIVE, find_entry

_RETRIES = 5


def shared_photo_key(user_id: UUID, photo_id: UUID, ext: str, thumb: bool = False) -> str:
    return f"{user_id}/shared/{photo_id}{'_thumb' if thumb else ''}.{ext}"


def _not_found() -> ApiError:
    return ApiError(404, "ENTRY_NOT_FOUND", "Chưa có mục chung cho ngày này")


def _busy() -> ApiError:
    return ApiError(409, "PHOTOS_BUSY", "Ảnh đang được thay đổi, thử lại sau")


def _limit_error(max_photos: int) -> ApiError:
    return ApiError(422, "ENTRY_LIMIT_PHOTOS", f"Mỗi mục chung tối đa {max_photos} ảnh")


async def _entry_for_write(db: AsyncDatabase, user: User, journal_id: UUID, day: date) -> dict:
    """Mục chung của tôi để gắn ảnh; không có → 404."""
    entry = await find_entry(db, user, journal_id, day)
    if entry is None:
        raise _not_found()
    return entry


async def create_upload(
    db: AsyncDatabase, storage: Storage, user: User, journal_id: UUID, day: date, content_type: str
) -> SharedPhotoUploadOut:
    """Ký hai presigned PUT (ảnh chính + ảnh thu nhỏ) cho mục chung đã có."""
    if content_type not in EXT:
        raise ApiError(422, "PHOTO_INVALID", "Định dạng ảnh không hợp lệ")
    limits = get_limits().tier(user.account_tier)
    entry = await _entry_for_write(db, user, journal_id, day)
    max_photos = limits.shared.photos_per_entry_max
    if len(entry.get("photos", [])) >= max_photos:
        raise _limit_error(max_photos)
    photo_id = uuid4()
    ext = EXT[content_type]
    return SharedPhotoUploadOut(
        photo_id=photo_id,
        upload_url=storage.upload_url(shared_photo_key(user.id, photo_id, ext), content_type),
        thumb_upload_url=storage.upload_url(
            shared_photo_key(user.id, photo_id, ext, thumb=True), content_type
        ),
        headers={"Content-Type": content_type},
        expires_in=UPLOAD_EXPIRES,
    )


async def _verified_size(storage: Storage, key: str, content_type: str, max_bytes: int) -> int | None:
    size = await storage.size(key)
    if size is None or not 0 < size <= max_bytes:
        return None
    return size if MAGIC[content_type](await storage.first_bytes(key)) else None


def _ordered(doc: dict) -> list[dict]:
    return sorted(doc.get("photos", []), key=lambda p: p["position"])


def _renumber(photos: list[dict]) -> list[dict]:
    return [{**p, "position": i} for i, p in enumerate(photos)]


async def _swap(db: AsyncDatabase, doc: dict, photos: list[dict]) -> dict | None:
    """Ghi mảng ảnh mới nếu mảng trong DB vẫn đúng như lúc đọc (khóa lạc quan)."""
    result = await db[c.SHARED_ENTRIES].update_one(
        {"_id": doc["_id"], "author_id": doc["author_id"], **ACTIVE, "photos": doc.get("photos", [])},
        {"$set": {"photos": photos}},
    )
    return {**doc, "photos": photos} if result.modified_count else None


async def confirm_upload(
    db: AsyncDatabase,
    storage: Storage,
    user: User,
    journal_id: UUID,
    day: date,
    photo_id: UUID,
    content_type: str,
    width: int,
    height: int,
) -> dict:
    """Xác nhận ảnh đã tải lên kho: kiểm tra tồn tại, định dạng, kích thước rồi gắn vào mục chung."""
    if content_type not in EXT:
        raise ApiError(422, "PHOTO_INVALID", "Định dạng ảnh không hợp lệ")
    limits = get_limits().tier(user.account_tier)
    ext = EXT[content_type]
    main_key = shared_photo_key(user.id, photo_id, ext)
    thumb_key = shared_photo_key(user.id, photo_id, ext, thumb=True)

    # Đã xác nhận rồi (client gửi lại sau khi mất mạng): trả kết quả cũ.
    entry = await _entry_for_write(db, user, journal_id, day)
    if any(p["id"] == photo_id for p in entry.get("photos", [])):
        return entry

    async def reject(error: ApiError) -> ApiError:
        await storage.delete(main_key, thumb_key)
        return error

    edge = limits.photos.main_max_edge_px
    if width > edge or height > edge:
        raise await reject(ApiError(422, "PHOTO_INVALID", f"Ảnh tối đa {edge} px mỗi cạnh"))
    main_size = await _verified_size(storage, main_key, content_type, limits.photos.main_max_bytes)
    thumb_size = await _verified_size(storage, thumb_key, content_type, limits.photos.thumb_max_bytes)
    if main_size is None or thumb_size is None:
        raise await reject(ApiError(422, "PHOTO_INVALID", "Ảnh chưa tải lên đủ hoặc không đúng định dạng"))

    for _ in range(_RETRIES):
        entry = await _entry_for_write(db, user, journal_id, day)
        photos = _ordered(entry)
        max_photos = limits.shared.photos_per_entry_max
        if len(photos) >= max_photos:
            raise await reject(_limit_error(max_photos))
        new = {
            "id": photo_id,
            "storage_key": main_key,
            "thumb_key": thumb_key,
            "width": width,
            "height": height,
            "size_bytes": main_size + thumb_size,
            "position": len(photos),
            "created_at": datetime.now(UTC),
        }
        saved = await _swap(db, entry, _renumber([*photos, new]))
        if saved is not None:
            return saved
    raise _busy()


async def reorder(db: AsyncDatabase, user: User, journal_id: UUID, day: date, photo_ids: list[UUID]) -> dict:
    """Sắp xếp ảnh của mục chung: gửi đủ id ảnh theo thứ tự mới."""
    for _ in range(_RETRIES):
        entry = await _entry_for_write(db, user, journal_id, day)
        by_id = {p["id"]: p for p in entry.get("photos", [])}
        if len(photo_ids) != len(by_id) or set(photo_ids) != set(by_id):
            raise ApiError(422, "PHOTO_ORDER_INVALID", "Danh sách ảnh không khớp với mục chung")
        saved = await _swap(db, entry, _renumber([by_id[i] for i in photo_ids]))
        if saved is not None:
            return saved
    raise _busy()


async def delete_photo(db: AsyncDatabase, storage: Storage, user: User, photo_id: UUID) -> None:
    """Xóa ảnh khỏi mục chung của tôi. Ảnh của người khác → 404."""
    for _ in range(_RETRIES):
        entry = await db[c.SHARED_ENTRIES].find_one({"author_id": user.id, "photos.id": photo_id, **ACTIVE})
        if entry is None:
            raise ApiError(404, "PHOTO_NOT_FOUND", "Không tìm thấy ảnh")
        photos = _ordered(entry)
        gone = next(p for p in photos if p["id"] == photo_id)
        if await _swap(db, entry, _renumber([p for p in photos if p["id"] != photo_id])) is None:
            continue
        await storage.delete(gone["storage_key"], gone["thumb_key"])
        return
    raise _busy()
