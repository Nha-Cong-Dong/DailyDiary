"""Xóa toàn bộ dữ liệu và xóa tài khoản (F-07, Bước 12).

Xóa toàn bộ dữ liệu: mọi trang (cả trang trong thùng rác), link chia sẻ, ảnh nhật ký trong kho. Giữ tài khoản,
phiên đăng nhập, hồ sơ, cài đặt, ảnh đại diện và góp ý.

Xóa tài khoản, theo thứ tự để chạy lại được nếu đứt giữa chừng:
1. trong request: đòi phiên mới đăng nhập (REAUTH_WINDOW), đặt `users.deleted_at` (khóa đăng nhập ngay),
   xóa mọi phiên, trang, link chia sẻ, `user_items`; góp ý giữ nội dung nhưng thay `user_id` bằng mã ngẫu
   nhiên (ẩn danh, chốt 23/10/2026); ghi `deletion_log`;
2. trong nền: `purge_account` xóa mọi object `{user_id}/` trong kho rồi mới xóa hẳn document `users`;
   gửi thư báo "Tài khoản đã được xóa" tới chính chủ (không có nội dung nhật ký).
Còn `deleted_at` mà chưa dọn xong (server tắt giữa chừng) → `app/jobs/purge_accounts.py` làm nốt.
Dọn xong, đăng nhập lại bằng cùng Google tạo tài khoản mới, trống (chốt 23/10/2026).

Không ghi log nội dung; chỉ ghi số lượng đã xóa. `deletion_log` không có user_id, email hay nội dung.
"""

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from pymongo import UpdateOne
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.mailer import Mail
from app.core.storage import Storage
from app.db import collections as c
from app.schemas.account import DataSummaryOut, WipeOut
from app.schemas.users import User
from app.services.entries import ACTIVE
from app.services.photos import used_bytes

logger = logging.getLogger("dailydiary.account")

# Xóa tài khoản đòi phiên đăng nhập trong khoảng này: máy đang mở sẵn mà người khác dùng thì phải
# đăng nhập lại.
REAUTH_WINDOW = timedelta(minutes=10)
VN = ZoneInfo("Asia/Ho_Chi_Minh")


def user_prefix(user_id: UUID) -> str:
    return f"{user_id}/"


def avatar_prefix(user_id: UUID) -> str:
    return f"{user_id}/avatar/"


async def _totals(db: AsyncDatabase, match: dict) -> tuple[int, int]:
    """(số trang, số ảnh) khớp `match` (đã có user_id)."""
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {"$match": match},
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
    return (rows[0]["pages"], rows[0]["photos"]) if rows else (0, 0)


async def log_deletion(
    db: AsyncDatabase, kind: str, *, pages: int, photos: int, share_links: int, **extra: int
) -> None:
    """Một dòng `deletion_log`: chỉ loại thao tác, thời điểm, số lượng — không có user_id hay nội dung."""
    doc = {"_id": uuid4(), "kind": kind, "at": datetime.now(UTC), "pages": pages, "photos": photos}
    await db[c.DELETION_LOG].insert_one({**doc, "share_links": share_links, **extra})


async def data_summary(db: AsyncDatabase, user: User) -> DataSummaryOut:
    limits = get_limits().tier(user.account_tier)
    pages, photos = await _totals(db, {"user_id": user.id, **ACTIVE})
    shares = await db[c.SHARE_LINKS].count_documents({"user_id": user.id})
    since = datetime.now(UTC) - timedelta(days=limits.entry.restore_days)
    trash = await db[c.ENTRIES].count_documents(
        {"user_id": user.id, "deleted_at": {"$ne": None, "$gte": since}}
    )
    return DataSummaryOut(
        pages=pages,
        photos=photos,
        share_links=shares,
        trash=trash,
        # Cùng hàm với lúc chặn tải ảnh, để thanh dung lượng và lỗi STORAGE_QUOTA không lệch nhau.
        used_bytes=await used_bytes(db, user.id),
        quota_bytes=limits.storage.quota_bytes,
        warn_ratio=limits.storage.warn_ratio,
    )


async def wipe_journal(db: AsyncDatabase, user: User) -> WipeOut:
    summary = await data_summary(db, user)
    all_pages, all_photos = await _totals(db, {"user_id": user.id})  # gồm cả thùng rác
    await db[c.ENTRIES].delete_many({"user_id": user.id})
    await db[c.SHARE_LINKS].delete_many({"user_id": user.id})
    await log_deletion(db, "journal", pages=all_pages, photos=all_photos, share_links=summary.share_links)
    return WipeOut(pages=summary.pages, photos=summary.photos, share_links=summary.share_links)


async def purge_journal_photos(storage: Storage | None, user_id: UUID) -> None:
    """Tác vụ nền sau khi xóa toàn bộ dữ liệu: mọi ảnh nhật ký (kể cả ảnh tải lên mà chưa xác nhận),
    trừ ảnh đại diện."""
    if storage is None:
        return
    removed = await storage.delete_prefix(user_prefix(user_id), keep=avatar_prefix(user_id))
    logger.info("đã dọn %d object ảnh nhật ký", removed)


async def _anonymize_feedback(db: AsyncDatabase, user_id: UUID) -> int:
    """Giữ nội dung góp ý, cắt mọi liên hệ với người gửi: mỗi góp ý một mã ngẫu nhiên mới. Trả số góp ý."""
    ids = [d["_id"] async for d in db[c.FEEDBACK].find({"user_id": user_id}, {"_id": 1})]
    if ids:
        await db[c.FEEDBACK].bulk_write(
            [
                UpdateOne({"_id": i, "user_id": user_id}, {"$set": {"user_id": uuid4(), "anonymized": True}})
                for i in ids
            ]
        )
    return len(ids)


async def _delete_user_data(db: AsyncDatabase, user_id: UUID) -> int:
    """Phần trong DB, chạy lại được: phiên, trang, link chia sẻ, user_items; góp ý ẩn danh (trả số góp ý)."""
    await db[c.USER_SESSIONS].delete_many({"user_id": user_id})
    await db[c.ENTRIES].delete_many({"user_id": user_id})
    await db[c.SHARE_LINKS].delete_many({"user_id": user_id})
    await db[c.USER_ITEMS].delete_many({"user_id": user_id})
    return await _anonymize_feedback(db, user_id)


def require_recent_login(session_started: datetime | None) -> None:
    """Thao tác không hoàn tác được: phiên phải đăng nhập trong REAUTH_WINDOW."""
    if session_started is None or datetime.now(UTC) - session_started > REAUTH_WINDOW:
        raise ApiError(403, "REAUTH_REQUIRED", "Đăng nhập lại để xác nhận xóa tài khoản")


def account_deleted_mail(user: User, *, pages: int, photos: int, share_links: int) -> Mail:
    """Thư báo cho chính chủ: không có nội dung nhật ký, chỉ số lượng. Reply-To về hộp thư Jotly (nếu có)."""
    at = datetime.now(UTC).astimezone(VN).strftime("%H:%M, %d/%m/%Y")
    body = "\n".join(
        [
            f"Chào {user.display_name},",
            "",
            f"Tài khoản Jotly gắn với email này đã được xóa lúc {at} (giờ Việt Nam).",
            "",
            f"Đã xóa: {pages} trang nhật ký, {photos} ảnh, {share_links} link chia sẻ, hồ sơ"
            " và mọi phiên đăng nhập.",
            "Góp ý bạn từng gửi (nếu có) được giữ lại nhưng không còn tên hay email của bạn.",
            "Bản sao lưu tự động có thể còn dữ liệu tối đa 7 ngày rồi bị ghi đè;",
            "Jotly không dùng bản sao lưu để khôi phục tài khoản đã xóa.",
            "",
            "Nếu không phải bạn thực hiện, hãy trả lời thư này ngay.",
            "Tài khoản Google của bạn không bị ảnh hưởng;",
            "đăng nhập lại Jotly sẽ bắt đầu một cuốn nhật ký mới.",
            "",
            "— Jotly",
        ]
    )
    reply = ("Jotly", settings.feedback_to_email) if settings.feedback_to_email else None
    return Mail(to=user.email, subject="Tài khoản Jotly của bạn đã được xóa", body=body, reply_to=reply)


async def delete_account(
    db: AsyncDatabase, user: User, confirm_email: str, session_started: datetime | None
) -> Mail | None:
    """Trả thư báo cần gửi trong nền; None khi chưa cấu hình SMTP hoặc là tài khoản đăng nhập thử (không có
    hộp thư thật)."""
    require_recent_login(session_started)
    if confirm_email.strip().lower() != user.email.strip().lower():
        raise ApiError(422, "CONFIRM_MISMATCH", "Email xác nhận không khớp với tài khoản")
    pages, photos = await _totals(db, {"user_id": user.id})
    shares = await db[c.SHARE_LINKS].count_documents({"user_id": user.id})
    doc = await db[c.USERS].find_one_and_update(
        {"_id": user.id, "deleted_at": None}, {"$set": {"deleted_at": datetime.now(UTC)}}, {"google_sub": 1}
    )
    anonymized = await _delete_user_data(db, user.id)
    await log_deletion(
        db, "account", pages=pages, photos=photos, share_links=shares, feedback_anonymized=anonymized
    )
    if not settings.smtp_host or str((doc or {}).get("google_sub", "")).startswith("dev:"):
        return None
    return account_deleted_mail(user, pages=pages, photos=photos, share_links=shares)


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
