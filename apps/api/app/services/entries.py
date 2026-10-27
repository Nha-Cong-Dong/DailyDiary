"""Nhật ký một ngày (F-01): đọc, tạo/cập nhật, xóa mềm, khôi phục.

- Mọi truy vấn lọc theo user_id của phiên; bộ lọc và lệnh cập nhật dựng từ trường đã kiểm tra kiểu.
- `entry_date` là ngày địa phương theo `users.timezone`; không cho ghi ngày sau "hôm nay" của người dùng.
- Xung đột: client gửi lại `updated_at` đã biết; khác bản đang lưu → 409 (F-06 dựng hộp thoại chọn bản).
- Xóa mềm giữ document `restore_days` ngày (shared/limits.json); tác vụ dọn ở Bước 13 xóa hẳn,
  kèm ảnh và link chia sẻ.
"""

from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.errors import ApiError
from app.core.limits import EntryLimits, get_limits
from app.core.storage import Storage
from app.core.text import keyword_norm
from app.db import collections as c
from app.schemas.entries import (
    EntryDeletedOut,
    EntryMonthOut,
    EntryOut,
    EntryPhotoOut,
    EntrySummaryOut,
    EntryWrite,
    TrashItemOut,
)
from app.schemas.users import User

ACTIVE = {"deleted_at": None}  # khớp cả document chưa có trường deleted_at


def user_today(timezone: str, now: datetime | None = None) -> date:
    """ "Hôm nay" theo múi giờ hồ sơ (date-timezone-rules), không theo giờ máy chủ."""
    return (now or datetime.now(UTC)).astimezone(ZoneInfo(timezone)).date()


def _now() -> datetime:
    # BSON date lưu tới mili giây; cắt sẵn để giá trị trả về khớp đúng giá trị client gửi lại khi so xung đột.
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


def _not_found() -> ApiError:
    return ApiError(404, "ENTRY_NOT_FOUND", "Ngày này chưa có nhật ký")


def _conflict() -> ApiError:
    return ApiError(409, "ENTRY_CONFLICT", "Trang này vừa được sửa ở nơi khác")


def entry_out(doc: dict, storage: Storage | None = None) -> EntryOut:
    """Có `storage` thì kèm link xem ảnh (ký cho key lấy từ document đã lọc theo user_id)."""
    return EntryOut(
        entry_date=date.fromisoformat(doc["entry_date"]),
        score=doc["score"],
        title=doc.get("title"),
        content=doc.get("content"),
        sub_icon=doc.get("sub_icon"),
        flag_color=doc.get("flag_color"),
        keywords=[k["keyword"] for k in doc.get("keywords", [])],
        photos=[
            EntryPhotoOut(
                id=p["id"],
                position=p["position"],
                width=p["width"],
                height=p["height"],
                url=storage.view_url(p["storage_key"]) if storage else None,
                thumb_url=storage.view_url(p["thumb_key"]) if storage else None,
            )
            for p in sorted(doc.get("photos", []), key=lambda p: p["position"])
        ],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def find_active(
    db: AsyncDatabase, user_id: UUID, day: date, projection: dict | None = None
) -> dict | None:
    """Nhật ký chưa xóa của một ngày. Dùng chung cho chia sẻ (services/shares.py)."""
    return await db[c.ENTRIES].find_one(
        {"user_id": user_id, "entry_date": day.isoformat(), **ACTIVE}, projection
    )


EXCERPT_CHARS = 300


async def list_month(db: AsyncDatabase, user_id: UUID, month: str) -> EntryMonthOut:
    """Dòng thời gian một tháng (F-02, thiết kế B8): 1 truy vấn theo index (user_id, entry_date).

    `month` đã được router kiểm tra dạng YYYY-MM. Không trả nội dung đầy đủ: cắt đoạn đầu ngay trong MongoDB.
    """
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {
                    "$match": {
                        "user_id": user_id,
                        "entry_date": {"$gte": f"{month}-01", "$lte": f"{month}-31"},
                        **ACTIVE,
                    }
                },
                {"$sort": {"entry_date": -1}},
                {
                    "$project": {
                        "_id": 0,
                        "entry_date": 1,
                        "score": 1,
                        "title": 1,
                        "sub_icon": 1,
                        "flag_color": 1,
                        "keywords": "$keywords.keyword",
                        "excerpt": {"$substrCP": [{"$ifNull": ["$content", ""]}, 0, EXCERPT_CHARS]},
                        "photo_count": {"$size": {"$ifNull": ["$photos", []]}},
                        "created_at": 1,
                        "updated_at": 1,
                    }
                },
            ]
        )
    ).to_list()
    return EntryMonthOut(
        month=month,
        entries=[
            EntrySummaryOut(
                entry_date=date.fromisoformat(r["entry_date"]),
                score=r["score"],
                title=r.get("title"),
                excerpt=r["excerpt"] or None,
                sub_icon=r.get("sub_icon"),
                flag_color=r.get("flag_color"),
                keywords=r.get("keywords") or [],
                photo_count=r["photo_count"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ],
    )


async def get_entry(db: AsyncDatabase, user_id: UUID, day: date, storage: Storage | None = None) -> EntryOut:
    doc = await find_active(db, user_id, day)
    if doc is None:
        raise _not_found()
    return entry_out(doc, storage)


def _check_limits(data: EntryWrite, limits: EntryLimits) -> None:
    if data.title is not None and len(data.title) > limits.title_max:
        raise ApiError(422, "ENTRY_LIMIT_TITLE", f"Tiêu đề tối đa {limits.title_max} ký tự")
    if data.content is not None and len(data.content) > limits.content_max:
        raise ApiError(422, "ENTRY_LIMIT_CONTENT", f"Nội dung tối đa {limits.content_max} ký tự")
    if len(data.keywords) > limits.keywords_max:
        raise ApiError(422, "ENTRY_LIMIT_KEYWORDS", f"Tối đa {limits.keywords_max} từ khóa")
    if any(not limits.keyword_len_min <= len(k) <= limits.keyword_len_max for k in data.keywords):
        raise ApiError(
            422,
            "ENTRY_LIMIT_KEYWORD",
            f"Mỗi từ khóa {limits.keyword_len_min}–{limits.keyword_len_max} ký tự",
        )


def _fields(data: EntryWrite, now: datetime) -> dict:
    """Các trường $set: chỉ lấy từ schema đã kiểm tra kiểu, không bao giờ từ dict request."""
    return {
        "score": data.score,
        "title": data.title,
        "content": data.content,
        "sub_icon": data.sub_icon,
        "flag_color": data.flag_color,
        "keywords": [{"keyword": k, "norm": keyword_norm(k)} for k in data.keywords],
        "title_norm": keyword_norm(data.title) if data.title else None,
        "content_norm": keyword_norm(data.content) if data.content else None,
        "updated_at": now,
        "deleted_at": None,
    }


async def save_entry(
    db: AsyncDatabase, user: User, day: date, data: EntryWrite, storage: Storage | None = None
) -> EntryOut:
    """Tạo (data.updated_at là None) hoặc cập nhật (data.updated_at là bản client đang sửa)."""
    if day > user_today(user.timezone):
        raise ApiError(422, "ENTRY_FUTURE_DATE", "Chưa thể ghi cho ngày chưa tới")
    _check_limits(data, get_limits().tier(user.account_tier).entry)
    now = _now()
    fields = _fields(data, now)
    key = {"user_id": user.id, "entry_date": day.isoformat()}

    if data.updated_at is not None:
        doc = await db[c.ENTRIES].find_one_and_update(
            {**key, **ACTIVE, "updated_at": data.updated_at},
            {"$set": fields},
            return_document=ReturnDocument.AFTER,
        )
        if doc is not None:
            return entry_out(doc, storage)
        if await find_active(db, user.id, day, {"_id": 1}) is not None:
            raise _conflict()
        raise _not_found()

    doc = {"_id": uuid4(), **key, **fields, "photos": [], "created_at": now}
    try:
        await db[c.ENTRIES].insert_one(doc)
        return entry_out(doc)
    except DuplicateKeyError:
        pass
    # Ngày đó đã có document: còn sống → tab/máy khác vừa tạo (409); đã xóa mềm → viết trang mới đè lên.
    # Trang mới bắt đầu không có ảnh; ảnh của bản đã xóa không còn cách nào khôi phục nên xóa khỏi kho luôn.
    old = await db[c.ENTRIES].find_one_and_update(
        {**key, "deleted_at": {"$ne": None}},
        {"$set": {**fields, "photos": [], "created_at": now}},
        return_document=ReturnDocument.BEFORE,
    )
    if old is None:
        raise _conflict()
    revived = {**old, **fields, "photos": [], "created_at": now}
    if storage is not None:
        await storage.delete(*[k for p in old.get("photos", []) for k in (p["storage_key"], p["thumb_key"])])
    # Link chia sẻ của trang đã xóa phải chết hẳn: không để người giữ link cũ đọc được trang mới viết đè.
    await db[c.SHARE_LINKS].delete_many(key)
    return entry_out(revived, storage)


async def delete_entry(db: AsyncDatabase, user: User, day: date) -> EntryDeletedOut:
    """Xóa mềm: trang biến mất khỏi mọi màn và link chia sẻ của nó không mở được nữa."""
    now = _now()
    result = await db[c.ENTRIES].update_one(
        {"user_id": user.id, "entry_date": day.isoformat(), **ACTIVE},
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise _not_found()
    days = get_limits().tier(user.account_tier).entry.restore_days
    return EntryDeletedOut(entry_date=day, deleted_at=now, restore_until=now + timedelta(days=days))


async def restore_entry(db: AsyncDatabase, user: User, day: date, storage: Storage | None = None) -> EntryOut:
    """Khôi phục trang đã xóa mềm còn trong hạn; quá hạn hoặc không có thì 404."""
    now = _now()
    days = get_limits().tier(user.account_tier).entry.restore_days
    doc = await db[c.ENTRIES].find_one_and_update(
        {
            "user_id": user.id,
            "entry_date": day.isoformat(),
            "deleted_at": {"$ne": None, "$gte": now - timedelta(days=days)},
        },
        {"$set": {"deleted_at": None, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise _not_found()
    return entry_out(doc, storage)


async def list_trash(db: AsyncDatabase, user: User) -> list[TrashItemOut]:
    """Trang đã xóa mềm còn trong hạn khôi phục, xóa gần nhất trước (màn Thùng rác trong Hồ sơ)."""
    days = get_limits().tier(user.account_tier).entry.restore_days
    since = datetime.now(UTC) - timedelta(days=days)
    rows = await (
        await db[c.ENTRIES].aggregate(
            [
                {"$match": {"user_id": user.id, "deleted_at": {"$ne": None, "$gte": since}}},
                {"$sort": {"deleted_at": -1}},
                {
                    "$project": {
                        "_id": 0,
                        "entry_date": 1,
                        "score": 1,
                        "title": 1,
                        "deleted_at": 1,
                        "photo_count": {"$size": {"$ifNull": ["$photos", []]}},
                    }
                },
            ]
        )
    ).to_list()
    return [
        TrashItemOut(
            entry_date=date.fromisoformat(r["entry_date"]),
            score=r["score"],
            title=r.get("title"),
            photo_count=r["photo_count"],
            deleted_at=r["deleted_at"],
            restore_until=r["deleted_at"] + timedelta(days=days),
        )
        for r in rows
    ]
