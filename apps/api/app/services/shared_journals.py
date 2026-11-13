"""Sổ chung (ADR 0007, F-11): đọc/ghi mục chung, chuỗi ấm, badge đồng bộ.

- Mỗi người mỗi ngày tối đa **một mục** trong một cuốn sổ — cùng bất biến "một ngày một trang"
  của `entries`. Unique (journal_id, author_id, entry_date).
- `author_id` luôn lấy từ phiên, không lấy từ body.
- Mọi truy vấn chéo người dùng đi qua quan hệ đã chấp nhận: `journal_id` không chứa `user_id`
  của phiên → **404** (không phải 403, để không rò rỉ sự tồn tại).
- **Chuỗi ấm** (chính): ngày nào sổ chung có ít nhất một mục của một trong hai thành viên.
  **Badge đồng bộ** (thành tích): số ngày cả hai cùng có mục.
- Chuỗi **không** nối qua mục ghi bù: mục viết muộn hẳn cho ngày đã qua vẫn hiện trong sổ nhưng
  không tính vào chuỗi (tái dùng đúng logic `is_backfilled` của `services/calendar.py`).
- `entry_date` là ngày địa phương **của người viết**; chuỗi đếm lùi theo **múi giờ người xem**.
"""

from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.storage import Storage
from app.db import collections as c
from app.schemas.social import (
    JournalDetailOut,
    JournalListOut,
    JournalMemberOut,
    JournalOut,
    SharedEntryOut,
    SharedEntryPageOut,
    SharedEntryPhotoOut,
    SharedEntryWrite,
)
from app.schemas.users import User
from app.services.calendar import is_backfilled
from app.services.entries import user_today

ACTIVE = {"deleted_at": None}  # khớp cả document chưa có trường deleted_at

# Số mục chung mỗi trang. Đọc ở thời điểm gọi (không phải mặc định tham số) để test có thể ghim.
PAGE_SIZE = 20


def _not_found() -> ApiError:
    return ApiError(404, "NOT_FOUND", "Không tìm thấy")


def _conflict() -> ApiError:
    return ApiError(409, "ENTRY_CONFLICT", "Mục này vừa được sửa ở nơi khác")


def _now() -> datetime:
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


async def find_member_journal(
    db: AsyncDatabase, user: User, journal_id: UUID, projection: dict | None = None
) -> dict | None:
    """Cuốn sổ mà `user` là thành viên; None nếu không thuộc (→ 404 ở router)."""
    return await db[c.SHARED_JOURNALS].find_one({"_id": journal_id, "members.user_id": user.id}, projection)


def _partner_id(journal: dict, user_id: UUID) -> UUID | None:
    for m in journal.get("members", []):
        if m["user_id"] != user_id:
            return m["user_id"]
    return None


async def _profiles(db: AsyncDatabase, ids: set[UUID]) -> dict[UUID, dict]:
    if not ids:
        return {}
    fields = {"_id": 1, "display_name": 1, "avatar_url": 1, "avatar_key": 1, "deleted_at": 1}
    return {p["_id"]: p async for p in db[c.USERS].find({"_id": {"$in": sorted(ids)}}, fields)}


def _avatar(doc: dict, storage: Storage | None) -> str | None:
    if doc.get("avatar_key"):
        return storage.view_url(doc["avatar_key"]) if storage else None
    return doc.get("avatar_url")


async def _member_timezones(db: AsyncDatabase, journal: dict) -> dict[UUID, str]:
    """Múi giờ của từng thành viên: mục của ai thì xét "ghi bù" theo múi giờ đó."""
    ids = {m["user_id"] for m in journal.get("members", [])}
    rows = await db[c.USERS].find({"_id": {"$in": sorted(ids)}}, {"_id": 1, "timezone": 1}).to_list()
    return {r["_id"]: r["timezone"] for r in rows}


async def _streaks(
    db: AsyncDatabase, journal: dict, viewer_today: date, viewer_tz: ZoneInfo
) -> tuple[int, int, int]:
    """(chuỗi ấm hiện tại, số ngày đồng bộ, chuỗi ấm dài nhất).

    Một ngày "ấm" khi sổ có ít nhất một mục của một trong hai thành viên. Ngày "đồng bộ" khi
    **cả hai** đều có mục. "Ghi bù" (mục viết muộn hẳn cho ngày đã qua) xét theo **múi giờ của
    người viết**, không nối vào chuỗi liên tiếp — khớp đúng logic `is_backfilled` của
    `services/calendar.py`. "Hôm nay" để đếm lùi lấy theo múi giờ người xem (hai bên ở múi giờ
    khác nhau có thể thấy chuỗi lệch nhau).
    """
    tz_by_member = await _member_timezones(db, journal)
    rows = await (
        await db[c.SHARED_ENTRIES].aggregate(
            [
                {"$match": {"journal_id": journal["_id"], **ACTIVE}},
                {"$project": {"_id": 0, "entry_date": 1, "author_id": 1, "created_at": 1}},
            ]
        )
    ).to_list()

    member_ids = set(tz_by_member)
    warm_days: set[date] = set()
    streak_days: set[date] = set()
    by_day: dict[date, set[UUID]] = {}
    for r in rows:
        day = date.fromisoformat(r["entry_date"])
        by_day.setdefault(day, set()).add(r["author_id"])
        if r["author_id"] not in member_ids:
            continue
        warm_days.add(day)
        # Ghi bù theo múi giờ của người viết: không nối chuỗi liên tiếp.
        if not is_backfilled(day, r["created_at"], ZoneInfo(tz_by_member.get(r["author_id"], "UTC"))):
            streak_days.add(day)

    synced_days = sum(1 for day, authors in by_day.items() if len(authors & member_ids) >= 2)

    # Chuỗi ấm hiện tại: đếm lùi từ "hôm nay" của người xem; hôm nay chưa ghi thì tính từ hôm qua.
    current = 0
    expected = viewer_today
    for day in sorted(streak_days, reverse=True):
        if day > viewer_today:
            continue
        if current == 0 and day < viewer_today:
            expected = viewer_today - timedelta(days=1)
        if day != expected:
            break
        current += 1
        expected -= timedelta(days=1)

    # Chuỗi dài nhất: sắp ngày tăng dần, đếm run (tái dùng ý tưởng của services/calendar.py).
    best = run = 0
    prev: date | None = None
    for day in sorted(streak_days):
        run = run + 1 if prev is not None and day - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = day
    return current, synced_days, best


async def _journal_out(db: AsyncDatabase, journal: dict, user: User, storage: Storage | None) -> JournalOut:
    partner = _partner_id(journal, user.id)
    profiles = await _profiles(db, {partner} if partner else set())
    profile = profiles.get(partner) if partner else None
    today = user_today(user.timezone)
    warm, synced, longest = await _streaks(db, journal, today, ZoneInfo(user.timezone))

    mine_today = await db[c.SHARED_ENTRIES].find_one(
        {
            "journal_id": journal["_id"],
            "author_id": user.id,
            "entry_date": today.isoformat(),
            **ACTIVE,
        },
        {"_id": 1},
    )
    return JournalOut(
        id=journal["_id"],
        status=journal.get("status", "active"),
        mode=journal.get("mode", "together"),
        partner_display_name=(profile or {}).get("display_name", "") if profile else "",
        partner_avatar_url=_avatar(profile or {}, storage),
        created_at=journal["created_at"],
        ended_at=journal.get("ended_at"),
        warm_streak=warm,
        synced_days=synced,
        longest_warm_streak=longest,
        my_today_entry=mine_today is not None,
    )


async def list_journals(db: AsyncDatabase, user: User, storage: Storage | None) -> JournalListOut:
    """Mọi cuốn sổ của tôi (kể cả đã kết thúc), mới nhất trước."""
    limits = get_limits().tier(user.account_tier).shared
    docs = await db[c.SHARED_JOURNALS].find({"members.user_id": user.id}).sort("created_at", -1).to_list()
    journals = [await _journal_out(db, d, user, storage) for d in docs]
    return JournalListOut(journals=journals, journals_max=limits.journals_max, journals_count=len(docs))


async def get_journal(
    db: AsyncDatabase, user: User, journal_id: UUID, storage: Storage | None
) -> JournalDetailOut:
    """Chi tiết một cuốn sổ: thành viên, chuỗi ấm, badge đồng bộ."""
    journal = await find_member_journal(db, user, journal_id)
    if journal is None:
        raise _not_found()
    base = await _journal_out(db, journal, user, storage)
    ids = {m["user_id"] for m in journal.get("members", [])}
    profiles = await _profiles(db, ids)
    members = [
        JournalMemberOut(
            display_name=(profiles.get(m["user_id"]) or {}).get("display_name", ""),
            avatar_url=_avatar(profiles.get(m["user_id"]) or {}, storage),
            role=m.get("role", "member"),
        )
        for m in journal.get("members", [])
    ]
    return JournalDetailOut(**base.model_dump(), members=members)


def shared_entry_out(doc: dict, author: dict | None, mine: bool, storage: Storage | None) -> SharedEntryOut:
    """Một mục chung ra ngoài: có tên/avatar người viết, không có `author_id` hay `storage_key`."""
    return SharedEntryOut(
        entry_date=date.fromisoformat(doc["entry_date"]),
        score=doc["score"],
        title=doc.get("title"),
        content=doc.get("content"),
        sub_icon=doc.get("sub_icon"),
        flag_color=doc.get("flag_color"),
        photos=[
            SharedEntryPhotoOut(
                id=p["id"],
                position=p["position"],
                width=p["width"],
                height=p["height"],
                url=storage.view_url(p["storage_key"]) if storage else None,
                thumb_url=storage.view_url(p["thumb_key"]) if storage else None,
            )
            for p in sorted(doc.get("photos", []), key=lambda p: p["position"])
        ],
        author_display_name=(author or {}).get("display_name", ""),
        author_avatar_url=_avatar(author or {}, storage),
        mine=mine,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def list_entries(
    db: AsyncDatabase,
    user: User,
    journal_id: UUID,
    storage: Storage | None,
    cursor: str | None = None,
    limit: int | None = None,
) -> SharedEntryPageOut:
    """Mục chung của cả hai, mới nhất trước.

    Khi sổ đã kết thúc: người xem chỉ thấy **mục của chính mình** (mục của người đã kết thúc
    không còn hiện — quy tắc riêng tư trong ADR 0007).
    """
    limit = PAGE_SIZE if limit is None else limit
    journal = await find_member_journal(db, user, journal_id)
    if journal is None:
        raise _not_found()

    match: dict = {"journal_id": journal_id, **ACTIVE}
    if journal.get("status") == "ended":
        match["author_id"] = user.id

    query: dict = dict(match)
    if cursor:
        # Con trỏ = "entry_date|author_id" của mục cuối trang trước. author_id là UUID (binData),
        # phải parse lại về UUID để so khớp với thứ tự sort (entry_date desc, author_id desc).
        parts = cursor.split("|")
        if len(parts) != 2:
            raise ApiError(422, "CURSOR_INVALID", "Con trỏ không hợp lệ")
        last_day, last_author = parts
        try:
            last_author = UUID(last_author)
        except ValueError as err:
            raise ApiError(422, "CURSOR_INVALID", "Con trỏ không hợp lệ") from err
        query["$or"] = [
            {"entry_date": {"$lt": last_day}},
            {"entry_date": last_day, "author_id": {"$lt": last_author}},
        ]

    rows = (
        await db[c.SHARED_ENTRIES]
        .find(query)
        .sort([("entry_date", -1), ("author_id", -1)])
        .limit(limit + 1)
        .to_list()
    )

    has_more = len(rows) > limit
    rows = rows[:limit]
    authors = await _profiles(db, {r["author_id"] for r in rows})

    entries = [
        shared_entry_out(r, authors.get(r["author_id"]), r["author_id"] == user.id, storage) for r in rows
    ]
    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        next_cursor = f"{last['entry_date']}|{last['author_id']}"
    return SharedEntryPageOut(entries=entries, next_cursor=next_cursor)


async def save_entry(
    db: AsyncDatabase,
    user: User,
    journal_id: UUID,
    day: date,
    data: SharedEntryWrite,
    storage: Storage | None = None,
) -> SharedEntryOut:
    """Viết mục chung của **tôi** cho một ngày (tạo mới hoặc cập nhật)."""
    journal = await find_member_journal(db, user, journal_id)
    if journal is None:
        raise _not_found()
    if journal.get("status") == "ended":
        raise ApiError(422, "JOURNAL_ENDED", "Sổ chung đã kết thúc, không viết thêm được")

    limits = get_limits().tier(user.account_tier).shared
    # Ngày không được vượt "hôm nay" của người viết.
    if day > user_today(user.timezone):
        raise ApiError(422, "ENTRY_FUTURE_DATE", "Chưa thể ghi cho ngày chưa tới")
    if data.title is not None and len(data.title) > limits.title_max:
        raise ApiError(422, "ENTRY_LIMIT_TITLE", f"Tiêu đề tối đa {limits.title_max} ký tự")
    if data.content is not None and len(data.content) > limits.content_max:
        raise ApiError(422, "ENTRY_LIMIT_CONTENT", f"Nội dung tối đa {limits.content_max} ký tự")

    now = _now()
    fields = {
        "score": data.score,
        "title": data.title,
        "content": data.content,
        "sub_icon": data.sub_icon,
        "flag_color": data.flag_color,
        "updated_at": now,
        "deleted_at": None,
    }
    key = {"journal_id": journal_id, "author_id": user.id, "entry_date": day.isoformat()}

    if data.updated_at is not None:
        doc = await db[c.SHARED_ENTRIES].find_one_and_update(
            {**key, **ACTIVE, "updated_at": data.updated_at},
            {"$set": fields},
            return_document=ReturnDocument.AFTER,
        )
        if doc is not None:
            author = await _profiles(db, {user.id})
            return shared_entry_out(doc, author.get(user.id), True, storage)
        if await db[c.SHARED_ENTRIES].find_one({**key, **ACTIVE}, {"_id": 1}) is not None:
            raise _conflict()
        raise _not_found()

    doc = {
        "_id": uuid4(),
        **key,
        **fields,
        "icon_set_id": user.icon_set_id,
        "photos": [],
        "created_at": now,
    }
    try:
        await db[c.SHARED_ENTRIES].insert_one(doc)
    except DuplicateKeyError as err:
        # Mục đã có (máy khác vừa tạo) → 409; nếu đã xóa mềm thì viết đè như trang nhật ký.
        old = await db[c.SHARED_ENTRIES].find_one_and_update(
            {**key, "deleted_at": {"$ne": None}},
            {"$set": {**fields, "photos": [], "created_at": now}},
            return_document=ReturnDocument.BEFORE,
        )
        if old is None:
            raise _conflict() from err
        revived = {**old, **fields, "photos": [], "created_at": now}
        author = await _profiles(db, {user.id})
        return shared_entry_out(revived, author.get(user.id), True, storage)

    author = await _profiles(db, {user.id})
    return shared_entry_out(doc, author.get(user.id), True, storage)


async def delete_entry(db: AsyncDatabase, user: User, journal_id: UUID, day: date) -> None:
    """Xóa mềm mục chung của tôi (giữ được `restore_days` ngày như trang nhật ký)."""
    journal = await find_member_journal(db, user, journal_id)
    if journal is None:
        raise _not_found()
    now = _now()
    result = await db[c.SHARED_ENTRIES].update_one(
        {
            "journal_id": journal_id,
            "author_id": user.id,
            "entry_date": day.isoformat(),
            **ACTIVE,
        },
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise _not_found()


async def entry_out_for_viewer(
    db: AsyncDatabase, entry: dict, user: User, storage: Storage | None
) -> SharedEntryOut:
    """Đổi document mục chung ra ngoài (kèm tên/avatar người viết) cho endpoint ảnh."""
    authors = await _profiles(db, {entry["author_id"]})
    return shared_entry_out(entry, authors.get(entry["author_id"]), entry["author_id"] == user.id, storage)


async def find_entry(db: AsyncDatabase, user: User, journal_id: UUID, day: date) -> dict | None:
    """Mục chung của tôi trong một ngày (chưa xóa)."""
    return await db[c.SHARED_ENTRIES].find_one(
        {
            "journal_id": journal_id,
            "author_id": user.id,
            "entry_date": day.isoformat(),
            **ACTIVE,
        }
    )
