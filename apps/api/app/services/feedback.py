"""Góp ý trong app (F-09): lưu vào collection `feedback`, rồi gửi email về hộp thư của chủ sản phẩm.

- Lưu trước, gửi sau (tác vụ nền): email lỗi hay chưa cấu hình SMTP thì góp ý vẫn còn trong DB
  (`emailed_at` = null).
- Thư có tên hiển thị + email tài khoản người gửi, đặt làm Reply-To (chốt 23/10/2026) để trả lời được.
- Nội dung góp ý là chữ người dùng viết: không ghi log, không đưa vào thông báo lỗi.
"""

from datetime import UTC, datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.mailer import Mail, mail_enabled, send_mail
from app.db import collections as c
from app.schemas.feedback import FeedbackIn
from app.schemas.users import User

VN = ZoneInfo("Asia/Ho_Chi_Minh")


async def save_feedback(db: AsyncDatabase, user: User, data: FeedbackIn) -> dict:
    max_len = get_limits().tier(user.account_tier).feedback.message_max
    if len(data.message) > max_len:
        raise ApiError(422, "FEEDBACK_TOO_LONG", f"Góp ý tối đa {max_len} ký tự")
    doc = {
        "_id": uuid4(),
        "user_id": user.id,
        "message": data.message,
        "created_at": datetime.now(UTC),
        "emailed_at": None,
    }
    await db[c.FEEDBACK].insert_one(doc)
    return doc


def feedback_mail(user: User, doc: dict) -> Mail:
    at = doc["created_at"].astimezone(VN).strftime("%H:%M, %d/%m/%Y")
    body = (
        f"Góp ý mới cho Jotly\n"
        f"Từ: {user.display_name} <{user.email}>\n"
        f"Lúc: {at} (giờ Việt Nam)\n"
        f"Mã góp ý: {doc['_id']}\n"
        f"\n{doc['message']}\n"
        f"\n— Bấm Trả lời để gửi thư cho người góp ý.\n"
    )
    return Mail(
        to=settings.feedback_to_email or "",
        subject=f"[Jotly] Góp ý từ {user.display_name}",
        body=body,
        reply_to=(user.display_name, user.email),
    )


async def email_feedback(db: AsyncDatabase, user: User, doc: dict) -> None:
    """Chạy sau khi đã trả lời request. Gửi được thì ghi `emailed_at`."""
    if not mail_enabled():
        return
    if await send_mail(feedback_mail(user, doc)):
        await db[c.FEEDBACK].update_one(
            {"_id": doc["_id"], "user_id": user.id}, {"$set": {"emailed_at": datetime.now(UTC)}}
        )
