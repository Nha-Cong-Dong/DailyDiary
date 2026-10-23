"""Xóa toàn bộ dữ liệu và xóa tài khoản (F-07, Bước 12).

Xóa toàn bộ dữ liệu: mọi trang (cả trang trong thùng rác), link chia sẻ, ảnh nhật ký trong kho. Giữ tài khoản,
phiên đăng nhập, hồ sơ, cài đặt, ảnh đại diện và góp ý.

Xóa tài khoản, theo thứ tự để chạy lại được nếu đứt giữa chừng:
1. trong request: đặt `users.deleted_at` (khóa đăng nhập ngay), xóa mọi phiên, trang, link chia sẻ,
   `user_items`;
   góp ý giữ nội dung nhưng thay `user_id` bằng mã ngẫu nhiên (ẩn danh, chốt 23/10/2026);
2. trong nền (`purge_account`): xóa mọi object `{user_id}/` trong kho, rồi mới xóa hẳn document `users`.
Còn `deleted_at` mà chưa dọn xong (server tắt giữa chừng) → `app/jobs/purge_accounts.py` làm nốt.
Dọn xong, đăng nhập lại bằng cùng Google tạo tài khoản mới, trống (chốt 23/10/2026).

Không ghi log nội dung; chỉ ghi số lượng đã xóa.
"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from pymongo import UpdateOne
from pymongo.asynchronous.database import AsyncDatabase

from app.core.errors import ApiError
from app.core.storage import Storage
from app.db import collections as c
from app.schemas.account import DataSummaryOut, WipeOut
from app.schemas.users import User
from app.services.entries import ACTIVE

logger = logging.getLogger("dailydiary.account")


def user_prefix(user_id: UUID) -> str:
    return f"{user_id}/"


def avatar_prefix(user_id: UUID) -> str:
    return f"{user_id}/avatar/"


async def data_summary(db: AsyncDatabase, user_id: UUID) -> DataSummaryOut:
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {"$match": {"user_id": user_id, **ACTIVE}},
                {
                    "$group": {
                        "_id": None,
                        "pages": {"$sum": 1},
                        "photos": {"$sum": {"$size": {"$ifNull": ["$photos", []]}}},
                    }
                },
            ]
        )
    ).to_list()
    shares = await db[c.SHARE_LINKS].count_documents({"user_id": user_id})
    pages, photos = (rows[0]["pages"], rows[0]["photos"]) if rows else (0, 0)
    return DataSummaryOut(pages=pages, photos=photos, share_links=shares)


async def wipe_journal(db: AsyncDatabase, user: User) -> WipeOut:
    summary = await data_summary(db, user.id)
    await db[c.ENTRIES].delete_many({"user_id": user.id})  # cả trang đang trong thùng rác 30 ngày
    await db[c.SHARE_LINKS].delete_many({"user_id": user.id})
    return WipeOut(pages=summary.pages, photos=summary.photos, share_links=summary.share_links)


async def purge_journal_photos(storage: Storage | None, user_id: UUID) -> None:
    """Tác vụ nền sau khi xóa toàn bộ dữ liệu: mọi ảnh nhật ký (kể cả ảnh tải lên mà chưa xác nhận),
    trừ ảnh đại diện."""
    if storage is None:
        return
    removed = await storage.delete_prefix(user_prefix(user_id), keep=avatar_prefix(user_id))
    logger.info("đã dọn %d object ảnh nhật ký", removed)


async def _anonymize_feedback(db: AsyncDatabase, user_id: UUID) -> None:
    """Giữ nội dung góp ý, cắt mọi liên hệ với người gửi: mỗi góp ý một mã ngẫu nhiên mới."""
    ids = [d["_id"] async for d in db[c.FEEDBACK].find({"user_id": user_id}, {"_id": 1})]
    if ids:
        await db[c.FEEDBACK].bulk_write(
            [
                UpdateOne({"_id": i, "user_id": user_id}, {"$set": {"user_id": uuid4(), "anonymized": True}})
                for i in ids
            ]
        )


async def _delete_user_data(db: AsyncDatabase, user_id: UUID) -> None:
    """Phần trong DB, chạy lại được: phiên, trang, link chia sẻ, user_items; góp ý ẩn danh."""
    await db[c.USER_SESSIONS].delete_many({"user_id": user_id})
    await db[c.ENTRIES].delete_many({"user_id": user_id})
    await db[c.SHARE_LINKS].delete_many({"user_id": user_id})
    await db[c.USER_ITEMS].delete_many({"user_id": user_id})
    await _anonymize_feedback(db, user_id)


async def delete_account(db: AsyncDatabase, user: User, confirm_email: str) -> None:
    if confirm_email.strip().lower() != user.email.strip().lower():
        raise ApiError(422, "CONFIRM_MISMATCH", "Email xác nhận không khớp với tài khoản")
    await db[c.USERS].update_one(
        {"_id": user.id, "deleted_at": None}, {"$set": {"deleted_at": datetime.now(UTC)}}
    )
    await _delete_user_data(db, user.id)


async def purge_account(db: AsyncDatabase, storage: Storage | None, user_id: UUID) -> bool:
    """Làm nốt việc xóa một tài khoản đã đặt `deleted_at`. Trả True nếu đã xóa hẳn document users.

    Kho ảnh chưa cấu hình (chạy không có kho) thì bỏ qua phần kho. Lỗi kho → giữ document users để lần sau
    làm lại.
    """
    user = await db[c.USERS].find_one({"_id": user_id}, {"deleted_at": 1})
    if user is None or user.get("deleted_at") is None:
        return False
    await _delete_user_data(db, user_id)  # phòng khi request đứt sau bước đặt deleted_at
    if storage is not None:
        try:
            removed = await storage.delete_prefix(user_prefix(user_id))
        except Exception as exc:  # mất kết nối kho: để tác vụ dọn chạy lại sau
            logger.warning("dọn kho ảnh của tài khoản đã xóa thất bại: %s", type(exc).__name__)
            return False
        logger.info("đã dọn %d object của tài khoản đã xóa", removed)
    await db[c.USERS].delete_one({"_id": user_id, "deleted_at": {"$ne": None}})
    return True


async def purge_pending(db: AsyncDatabase, storage: Storage | None) -> int:
    """Mọi tài khoản còn `deleted_at` (chưa dọn xong). Dùng cho app/jobs/purge_accounts.py."""
    done = 0
    async for doc in db[c.USERS].find({"deleted_at": {"$ne": None}}, {"_id": 1}):
        done += await purge_account(db, storage, doc["_id"])
    return done
