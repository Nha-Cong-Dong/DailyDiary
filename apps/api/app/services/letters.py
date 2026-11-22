"""Thư gửi tương lai (GĐ2 giữ chân): nội dung chỉ mở ra được từ `reveal_date`.

- Tối đa 1 thư cho mỗi ngày ghi (`authored_date`) — chặn bằng unique index `(user_id, authored_date)`,
  race xử lý ở đây bằng `DuplicateKeyError` (ADR 0001 "không transaction, dựa unique index").
- Trạng thái "đến hạn" tính khi đọc theo múi giờ người dùng (`reveal_date <= hôm nay của user`),
  không có job nền. Thư còn niêm phong trả `content=None` (giữ bất ngờ + không lộ nội dung).
"""

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.errors import ApiError
from app.core.limits import get_limits
from app.db import collections as c
from app.schemas.letters import LetterListOut, LetterOut, LetterWrite
from app.schemas.users import User
from app.services.entries import user_today


def _now() -> datetime:
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


def _letter_out(doc: dict, user_today_date: date) -> LetterOut:
    reveal = date.fromisoformat(doc["reveal_date"])
    open_ = reveal <= user_today_date
    return LetterOut(
        id=doc["_id"],
        content=doc.get("content") if open_ else None,
        reveal_date=reveal,
        status="open" if open_ else "sealed",
        created_at=doc["created_at"],
    )


async def list_letters(db: AsyncDatabase, user: User) -> LetterListOut:
    """Tất cả thư của user, sắp theo `reveal_date` (thư sắp mở đứng trước)."""
    today = user_today(user.timezone)
    rows = await db[c.LETTERS].find({"user_id": user.id}).sort("reveal_date", 1).to_list(length=None)
    return LetterListOut(letters=[_letter_out(r, today) for r in rows])


async def create_letter(db: AsyncDatabase, user: User, data: LetterWrite) -> LetterOut:
    """Ghi một lá thư. `reveal_date` phải sau "hôm nay" của user; tối đa 1 thư/1 ngày ghi."""
    limits = get_limits().tier(user.account_tier)
    content = data.clean_content
    if not content:
        raise ApiError(422, "LETTER_EMPTY", "Thư cần nội dung")
    if len(content) > limits.entry.content_max:
        raise ApiError(422, "LETTER_LIMIT_CONTENT", f"Nội dung tối đa {limits.entry.content_max} ký tự")

    today = user_today(user.timezone)
    if data.reveal_date <= today:
        raise ApiError(422, "LETTER_NOT_FUTURE", "Hẹn mở phải là ngày sau hôm nay")

    doc = {
        "_id": uuid4(),
        "user_id": user.id,
        "content": content,
        "reveal_date": data.reveal_date.isoformat(),
        "authored_date": today.isoformat(),
        "created_at": _now(),
    }
    try:
        await db[c.LETTERS].insert_one(doc)
        return _letter_out(doc, today)
    except DuplicateKeyError as err:
        raise ApiError(409, "LETTER_TODAY", "Hôm nay bạn đã gửi thư rồi") from err


async def delete_letter(db: AsyncDatabase, user: User, letter_id: UUID) -> None:
    """Xóa cứng (thư chỉ chữ, không ảnh → không cần dọn storage). Không phải thư của mình → 404."""
    result = await db[c.LETTERS].delete_one({"_id": letter_id, "user_id": user.id})
    if result.deleted_count == 0:
        raise ApiError(404, "LETTER_NOT_FOUND", "Không tìm thấy thư này")
