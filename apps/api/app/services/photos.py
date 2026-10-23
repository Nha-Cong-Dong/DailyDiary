"""Ảnh của một ngày (F-01, phần ảnh): presigned URL, xác nhận, sắp xếp, xóa.

- Trình duyệt nén ảnh (WebP 1920 px, ảnh thu nhỏ 320 px) rồi PUT thẳng lên kho; backend không xử lý ảnh.
- Key do backend dựng từ phiên: `{user_id}/{YYYY/MM/DD}/{photo_id}[_thumb].{ext}`. Client chỉ gửi `photo_id`.
- Xác nhận: object tồn tại, dung lượng trong giới hạn, magic bytes đúng định dạng; sai thì xóa object.
- Mảng `photos` của nhật ký đổi bằng lệnh có điều kiện "mảng vẫn như lúc đọc" (khóa lạc quan): hai lần
  xác nhận cùng lúc không vượt quá `per_day_max`, không trùng vị trí. `size_bytes` = ảnh chính + ảnh thu nhỏ.
- Thêm/xóa/sắp xếp ảnh không đổi `updated_at` của nhật ký: tự động lưu chữ ở tab đang mở không bị 409.
"""

from collections.abc import Callable
from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from pymongo.asynchronous.database import AsyncDatabase

from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.storage import UPLOAD_EXPIRES, Storage
from app.db import collections as c
from app.schemas.entries import EntryOut
from app.schemas.photos import PhotoConfirmIn, PhotoUploadOut
from app.schemas.users import User
from app.services.entries import ACTIVE, entry_out, find_active

EXT = {"image/webp": "webp", "image/jpeg": "jpg"}
MAGIC: dict[str, Callable[[bytes], bool]] = {
    "image/jpeg": lambda b: b[:3] == b"\xff\xd8\xff",
    "image/webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
}
_RETRIES = 5


def photo_key(user_id: UUID, day: date, photo_id: UUID, ext: str, thumb: bool = False) -> str:
    return f"{user_id}/{day:%Y/%m/%d}/{photo_id}{'_thumb' if thumb else ''}.{ext}"


def _not_found() -> ApiError:
    return ApiError(404, "ENTRY_NOT_FOUND", "Ngày này chưa có nhật ký")


def _limit_error(max_photos: int) -> ApiError:
    return ApiError(422, "ENTRY_LIMIT_PHOTOS", f"Mỗi ngày tối đa {max_photos} ảnh")


def _quota_error() -> ApiError:
    return ApiError(422, "STORAGE_QUOTA", "Đã hết dung lượng lưu ảnh")


async def used_bytes(db: AsyncDatabase, user_id: UUID) -> int:
    """Dung lượng ảnh đang chiếm, gồm cả trang đã xóa mềm (ảnh còn trong kho tới khi dọn)."""
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {"$match": {"user_id": user_id}},
                {"$unwind": "$photos"},
                {"$group": {"_id": None, "total": {"$sum": "$photos.size_bytes"}}},
            ]
        )
    ).to_list()
    return rows[0]["total"] if rows else 0


async def create_upload(
    db: AsyncDatabase, storage: Storage, user: User, day: date, content_type: str
) -> PhotoUploadOut:
    """Kiểm tra trước (trang tồn tại, còn chỗ, còn dung lượng) rồi ký hai URL PUT."""
    limits = get_limits().tier(user.account_tier)
    entry = await find_active(db, user.id, day, {"photos.id": 1})
    if entry is None:
        raise _not_found()
    if len(entry.get("photos", [])) >= limits.photos.per_day_max:
        raise _limit_error(limits.photos.per_day_max)
    if await used_bytes(db, user.id) >= limits.storage.quota_bytes:
        raise _quota_error()
    photo_id = uuid4()
    ext = EXT[content_type]
    return PhotoUploadOut(
        photo_id=photo_id,
        upload_url=storage.upload_url(photo_key(user.id, day, photo_id, ext), content_type),
        thumb_upload_url=storage.upload_url(photo_key(user.id, day, photo_id, ext, thumb=True), content_type),
        headers={"Content-Type": content_type},
        expires_in=UPLOAD_EXPIRES,
    )


async def _verified_size(storage: Storage, key: str, content_type: str, max_bytes: int) -> int | None:
    size = await storage.size(key)
    if size is None or not 0 < size <= max_bytes:
        return None
    return size if MAGIC[content_type](await storage.first_bytes(key)) else None


async def _swap_photos(db: AsyncDatabase, doc: dict, photos: list[dict]) -> dict | None:
    """Ghi mảng ảnh mới nếu mảng trong DB vẫn đúng như lúc đọc; None nếu vừa có thao tác khác chen vào."""
    result = await db[c.ENTRIES].update_one(
        {"_id": doc["_id"], "user_id": doc["user_id"], **ACTIVE, "photos": doc.get("photos", [])},
        {"$set": {"photos": photos}},
    )
    return {**doc, "photos": photos} if result.modified_count else None


def _renumber(photos: list[dict]) -> list[dict]:
    return [{**p, "position": i} for i, p in enumerate(photos)]


def _ordered(doc: dict) -> list[dict]:
    return sorted(doc.get("photos", []), key=lambda p: p["position"])


def _busy() -> ApiError:
    return ApiError(409, "PHOTOS_BUSY", "Ảnh của trang đang được thay đổi, thử lại sau")


async def confirm_upload(
    db: AsyncDatabase, storage: Storage, user: User, day: date, data: PhotoConfirmIn
) -> EntryOut:
    limits = get_limits().tier(user.account_tier)
    ext = EXT[data.content_type]
    main_key = photo_key(user.id, day, data.photo_id, ext)
    thumb_key = photo_key(user.id, day, data.photo_id, ext, thumb=True)

    # Đã xác nhận rồi (client gửi lại sau khi mất mạng): trả kết quả cũ, không kiểm tra lại.
    entry = await find_active(db, user.id, day)
    if entry is not None and any(p["id"] == data.photo_id for p in entry.get("photos", [])):
        return entry_out(entry, storage)

    async def reject(error: ApiError) -> ApiError:
        await storage.delete(main_key, thumb_key)
        return error

    edge = limits.photos.main_max_edge_px
    if data.width > edge or data.height > edge:
        raise await reject(ApiError(422, "PHOTO_INVALID", f"Ảnh tối đa {edge} px mỗi cạnh"))
    main_size = await _verified_size(storage, main_key, data.content_type, limits.photos.main_max_bytes)
    thumb_size = await _verified_size(storage, thumb_key, data.content_type, limits.photos.thumb_max_bytes)
    if main_size is None or thumb_size is None:
        raise await reject(ApiError(422, "PHOTO_INVALID", "Ảnh chưa tải lên đủ hoặc không đúng định dạng"))
    size = main_size + thumb_size
    if await used_bytes(db, user.id) + size > limits.storage.quota_bytes:
        raise await reject(_quota_error())

    for _ in range(_RETRIES):
        entry = await find_active(db, user.id, day)
        if entry is None:
            raise await reject(_not_found())
        photos = _ordered(entry)
        if len(photos) >= limits.photos.per_day_max:
            raise await reject(_limit_error(limits.photos.per_day_max))
        new = {
            "id": data.photo_id,
            "storage_key": main_key,
            "thumb_key": thumb_key,
            "width": data.width,
            "height": data.height,
            "size_bytes": size,
            "position": len(photos),
            "created_at": datetime.now(UTC),
        }
        saved = await _swap_photos(db, entry, _renumber([*photos, new]))
        if saved is not None:
            return entry_out(saved, storage)
    raise _busy()


async def reorder(
    db: AsyncDatabase, storage: Storage | None, user: User, day: date, photo_ids: list[UUID]
) -> EntryOut:
    for _ in range(_RETRIES):
        entry = await find_active(db, user.id, day)
        if entry is None:
            raise _not_found()
        by_id = {p["id"]: p for p in entry.get("photos", [])}
        if len(photo_ids) != len(by_id) or set(photo_ids) != set(by_id):
            raise ApiError(422, "PHOTO_ORDER_INVALID", "Danh sách ảnh không khớp với trang")
        saved = await _swap_photos(db, entry, _renumber([by_id[i] for i in photo_ids]))
        if saved is not None:
            return entry_out(saved, storage)
    raise _busy()


async def delete_photo(db: AsyncDatabase, storage: Storage, user: User, photo_id: UUID) -> None:
    """Xóa một ảnh của trang chưa xóa; ảnh của người khác hoặc không tồn tại → 404."""
    for _ in range(_RETRIES):
        entry = await db[c.ENTRIES].find_one({"user_id": user.id, "photos.id": photo_id, **ACTIVE})
        if entry is None:
            raise ApiError(404, "PHOTO_NOT_FOUND", "Không tìm thấy ảnh")
        photos = _ordered(entry)
        gone = next(p for p in photos if p["id"] == photo_id)
        if await _swap_photos(db, entry, _renumber([p for p in photos if p["id"] != photo_id])) is None:
            continue
        # Link chia sẻ đang chọn ảnh này thì bỏ ảnh khỏi link.
        await db[c.SHARE_LINKS].update_many(
            {"user_id": user.id, "entry_date": entry["entry_date"]}, {"$pull": {"photo_ids": photo_id}}
        )
        await storage.delete(gone["storage_key"], gone["thumb_key"])
        return
    raise _busy()
