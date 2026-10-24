"""Tác vụ vận hành (Bước 13): dọn thùng rác sau hạn khôi phục.

Trang xóa mềm giữ `restore_days` ngày (shared/limits.json, theo cấp tài khoản của chủ trang; chủ trang không
còn thì dùng cấp mặc định). Quá hạn thì xóa hẳn, mỗi trang theo thứ tự:
1. object ảnh trong kho (`storage_key`, `thumb_key` của từng ảnh) bằng `Storage.delete`;
2. link chia sẻ cùng `user_id` + `entry_date`;
3. document nhật ký, với điều kiện `deleted_at` vẫn như lúc đọc (trang vừa được khôi phục thì giữ nguyên).
Trang có ảnh mà kho chưa cấu hình hoặc lỗi kho → giữ document để lần sau làm lại (không để ảnh mồ côi).
Chạy lại không hỏng gì: trang đã xóa không còn được tìm thấy, xóa object/link không có cũng không lỗi.

Không ghi log nội dung; chỉ số lượng. `deletion_log` ghi một dòng loại "trash" cho mỗi lần chạy có xóa,
không có user_id.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from pymongo.asynchronous.database import AsyncDatabase

from app.core.limits import get_limits
from app.core.storage import Storage
from app.db import collections as c
from app.services.account import log_deletion

logger = logging.getLogger("dailydiary.maintenance")


@dataclass
class TrashPurge:
    pages: int = 0
    photos: int = 0
    share_links: int = 0
    skipped: int = 0  # trang quá hạn nhưng chưa xóa được (kho ảnh thiếu/lỗi), lần sau làm lại


async def _restore_days(db: AsyncDatabase, cache: dict[UUID, int], user_id: UUID) -> int:
    if user_id not in cache:
        limits = get_limits()
        user = await db[c.USERS].find_one({"_id": user_id}, {"account_tier": 1})
        tier = limits.tiers.get((user or {}).get("account_tier") or "") or limits.tier()
        cache[user_id] = tier.entry.restore_days
    return cache[user_id]


async def purge_trash(
    db: AsyncDatabase, storage: Storage | None, *, now: datetime | None = None
) -> TrashPurge:
    now = now or datetime.now(UTC)
    result = TrashPurge()
    # Lọc thô bằng hạn ngắn nhất trong mọi cấp (dùng được index ix_deleted_at), rồi xét hạn đúng theo
    # cấp của chủ trang.
    shortest = min(t.entry.restore_days for t in get_limits().tiers.values())
    projection = {
        "user_id": 1,
        "entry_date": 1,
        "deleted_at": 1,
        "photos.storage_key": 1,
        "photos.thumb_key": 1,
    }
    days_by_user: dict[UUID, int] = {}
    cursor = db[c.ENTRIES].find(
        {"deleted_at": {"$type": "date", "$lt": now - timedelta(days=shortest)}}, projection
    )
    async for doc in cursor:
        user_id, day, deleted_at = doc["user_id"], doc["entry_date"], doc["deleted_at"]
        if deleted_at >= now - timedelta(days=await _restore_days(db, days_by_user, user_id)):
            continue  # còn hạn khôi phục theo cấp của chủ trang
        photos = doc.get("photos") or []
        keys = [k for p in photos for k in (p.get("storage_key"), p.get("thumb_key")) if k]
        if keys:
            if storage is None:
                result.skipped += 1
                continue
            try:
                await storage.delete(*keys)
            except Exception as exc:  # mất kết nối kho: giữ trang để lần sau làm lại
                logger.warning("dọn ảnh của trang quá hạn thất bại: %s", type(exc).__name__)
                result.skipped += 1
                continue
        links = await db[c.SHARE_LINKS].delete_many({"user_id": user_id, "entry_date": day})
        deleted = await db[c.ENTRIES].delete_one({"_id": doc["_id"], "deleted_at": deleted_at})
        result.share_links += links.deleted_count
        if deleted.deleted_count:
            result.pages += 1
            result.photos += len(photos)
    if result.pages or result.share_links:
        await log_deletion(
            db, "trash", pages=result.pages, photos=result.photos, share_links=result.share_links
        )
    logger.info(
        "dọn thùng rác: %d trang, %d ảnh, %d link; %d trang để lần sau",
        result.pages,
        result.photos,
        result.share_links,
        result.skipped,
    )
    return result
