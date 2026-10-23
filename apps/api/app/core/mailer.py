"""Gửi email qua SMTP (Gmail App Password khi chạy thật, Mailpit khi chạy local).

- `smtplib` chặn luồng nên chạy qua `anyio.to_thread`.
- `EmailMessage` tự từ chối header có xuống dòng (chặn chèn header qua tên/email người dùng).
- Không ghi nội dung thư hay địa chỉ người nhận vào log; lỗi chỉ ghi loại exception.
"""

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr

import anyio

from app.core.config import settings

logger = logging.getLogger("dailydiary.mail")


@dataclass(frozen=True)
class Mail:
    to: str
    subject: str
    body: str
    reply_to: tuple[str, str] | None = None  # (tên hiển thị, email)


def mail_enabled() -> bool:
    return bool(settings.smtp_host and settings.feedback_to_email)


def _send_sync(mail: Mail) -> None:
    msg = EmailMessage()
    msg["From"] = formataddr(("Jotly", settings.mail_from or settings.smtp_user or "jotly@localhost"))
    msg["To"] = mail.to
    msg["Subject"] = mail.subject
    if mail.reply_to:
        msg["Reply-To"] = formataddr(mail.reply_to)
    msg.set_content(mail.body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_starttls:
            smtp.starttls(context=ssl.create_default_context())
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


async def send_mail(mail: Mail) -> bool:
    """Trả True nếu gửi được. Không ném lỗi: người gọi (tác vụ nền) chỉ cần biết để đánh dấu."""
    try:
        await anyio.to_thread.run_sync(_send_sync, mail)
        return True
    except Exception as exc:  # mất mạng, sai mật khẩu, máy chủ từ chối...: chỉ ghi loại lỗi
        logger.warning("gửi email thất bại: %s", type(exc).__name__)
        return False
