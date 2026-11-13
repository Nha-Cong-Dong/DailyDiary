"""Bạn bè (ADR 0007, F-11): mã bạn, yêu cầu kết bạn, chấp nhận → sinh sổ chung, kết thúc sổ.

- Tìm bạn bằng **mã bạn** (không theo email): mỗi tài khoản một mã 10 ký tự, xoay được bất cứ lúc nào;
  mã cũ chết ngay. Mã bạn không bao giờ vào log (nó là định danh người dùng).
- Quan hệ phải được chấp nhận: gửi mã → yêu cầu (hết hạn sau `shared.request_expires_days`) → chấp nhận
  thì sinh sổ chung. Không có tự động kết bạn.
- Kết thúc sổ chung: hiệu lực tức thì, không xóa gì; sổ chuyển `status: "ended"`.
- Không transaction nhiều document (ADR 0001): tạo sổ dùng `member_key` + index unique (partial,
  `scope: "pair"`) để hai lần chấp nhận cùng lúc chỉ tạo được một cuốn.
"""

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.storage import Storage
from app.db import collections as c
from app.schemas.social import (
    FriendListOut,
    FriendOut,
    FriendRequestIn,
    FriendRequestListOut,
    FriendRequestOut,
)
from app.schemas.users import User

# Bảng chữ không nhầm: bỏ I/L (dễ lẫn 1), O (lẫn 0), 0 và 1. 31 ký tự → 31^10 tổ hợp mã.
CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"

# Trường đọc của `users` khi cần tên/avatar để hiện.
_PROFILE_FIELDS = {"_id": 1, "display_name": 1, "avatar_url": 1, "avatar_key": 1, "deleted_at": 1}


def _not_found() -> ApiError:
    return ApiError(404, "NOT_FOUND", "Không tìm thấy")


def new_friend_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(10))


def _avatar_url(doc: dict, storage: Storage | None) -> str | None:
    """Ảnh đại diện: ảnh tự tải lên (link ký) nếu có, không thì ảnh Google."""
    if doc.get("avatar_key"):
        return storage.view_url(doc["avatar_key"]) if storage else None
    return doc.get("avatar_url")


async def get_or_create_friend_code(db: AsyncDatabase, user: User) -> str:
    """Mã bạn hiện tại; sinh (một lần duy nhất) nếu chưa có. Chạy lại được: chỉ đặt khi thiếu."""
    doc = await db[c.USERS].find_one_and_update(
        {"_id": user.id, "friend_code": {"$exists": False}},
        {"$set": {"friend_code": new_friend_code()}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        doc = await db[c.USERS].find_one({"_id": user.id}, {"friend_code": 1})
    code = (doc or {}).get("friend_code")
    if not code:
        raise _not_found()
    return code


async def rotate_friend_code(db: AsyncDatabase, user: User) -> str:
    """Xoay mã mới; mã cũ và mọi link mời theo mã cũ không dùng được nữa."""
    doc = await db[c.USERS].find_one_and_update(
        {"_id": user.id},
        {"$set": {"friend_code": new_friend_code()}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise _not_found()
    return doc["friend_code"]


def member_key(a: UUID, b: UUID) -> str:
    """Khóa cặp: hai uuid đã sắp xếp. Index unique loại trùng khi hai request chạy cùng lúc."""
    return "|".join(sorted([str(a), str(b)]))


async def _count_friends(db: AsyncDatabase, user_id: UUID) -> int:
    """Số quan hệ đã chấp nhận (mỗi quan hệ = một cuốn sổ)."""
    return await db[c.FRIENDSHIPS].count_documents(
        {
            "status": "accepted",
            "$or": [{"addressee_id": user_id}, {"requester_id": user_id}],
        }
    )


async def _count_active_journals(db: AsyncDatabase, user_id: UUID) -> int:
    return await db[c.SHARED_JOURNALS].count_documents({"members.user_id": user_id, "status": "active"})


async def _profiles(db: AsyncDatabase, ids: set[UUID]) -> dict[UUID, dict]:
    if not ids:
        return {}
    cursor = db[c.USERS].find({"_id": {"$in": sorted(ids)}}, _PROFILE_FIELDS)
    return {p["_id"]: p async for p in cursor}


async def list_friends(db: AsyncDatabase, user: User, storage: Storage | None) -> FriendListOut:
    """Bạn bè của tôi: mọi quan hệ đã chấp nhận, kèm trạng thái sổ chung của cặp."""
    limits = get_limits().tier(user.account_tier).shared

    docs = await (
        db[c.FRIENDSHIPS].find(
            {
                "status": "accepted",
                "$or": [{"addressee_id": user.id}, {"requester_id": user.id}],
            },
            {"_id": 1, "requester_id": 1, "addressee_id": 1, "journal_id": 1},
        )
    ).to_list()

    def other_of(d: dict) -> UUID:
        return d["addressee_id"] if d["addressee_id"] == user.id else d["requester_id"]

    profiles = await _profiles(db, {other_of(d) for d in docs})

    friends: list[FriendOut] = []
    for d in docs:
        other_id = other_of(d)
        profile = profiles.get(other_id) or {}
        journal_id = d.get("journal_id")
        status = None
        if journal_id is not None:
            jdoc = await db[c.SHARED_JOURNALS].find_one({"_id": journal_id}, {"_id": 0, "status": 1})
            status = jdoc.get("status") if jdoc else None
        friends.append(
            FriendOut(
                id=other_id,
                display_name=profile.get("display_name", ""),
                avatar_url=_avatar_url(profile, storage),
                journal_id=journal_id,
                journal_status=status,
            )
        )
    friends.sort(key=lambda f: f.display_name.lower())

    journals_count = await db[c.SHARED_JOURNALS].count_documents({"members.user_id": user.id})
    return FriendListOut(
        friends=friends,
        friends_max=limits.friends_max,
        journals_max=limits.journals_max,
        friends_count=len(docs),
        journals_count=journals_count,
    )


async def list_requests(db: AsyncDatabase, user: User, storage: Storage | None) -> FriendRequestListOut:
    """Yêu cầu kết bạn đang chờ (đến và đi), chưa hết hạn."""
    limits = get_limits().tier(user.account_tier).shared
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=limits.request_expires_days)

    incoming_docs = await (
        db[c.FRIENDSHIPS].find(
            {"addressee_id": user.id, "status": "pending"},
            {"_id": 1, "requester_id": 1, "addressee_id": 1, "created_at": 1},
        )
    ).to_list()
    outgoing_docs = await (
        db[c.FRIENDSHIPS].find(
            {"requester_id": user.id, "status": "pending"},
            {"_id": 1, "requester_id": 1, "addressee_id": 1, "created_at": 1},
        )
    ).to_list()

    profiles = await _profiles(
        db,
        {d["requester_id"] for d in incoming_docs} | {d["addressee_id"] for d in outgoing_docs},
    )

    def build(doc: dict, direction: str) -> FriendRequestOut | None:
        other_id = doc["requester_id"] if direction == "incoming" else doc["addressee_id"]
        created = doc.get("created_at") or now
        if created < cutoff:
            return None  # hết hạn → không hiện nữa
        profile = profiles.get(other_id) or {}
        return FriendRequestOut(
            id=doc["_id"],
            direction=direction,
            display_name=profile.get("display_name", ""),
            avatar_url=_avatar_url(profile, storage),
            status="pending",
            created_at=created,
            expires_at=created + timedelta(days=limits.request_expires_days),
        )

    incoming = [r for r in (build(d, "incoming") for d in incoming_docs) if r]
    outgoing = [r for r in (build(d, "outgoing") for d in outgoing_docs) if r]
    return FriendRequestListOut(incoming=incoming, outgoing=outgoing)


async def send_request(
    db: AsyncDatabase, user: User, data: FriendRequestIn, storage: Storage | None = None
) -> FriendRequestOut:
    """Gửi yêu cầu kết bạn theo mã bạn. Mã sai → 404 chung (không lộ lý do, mã không vào log)."""
    limits = get_limits().tier(user.account_tier).shared
    now = datetime.now(UTC)

    # Trần số bạn: chặn quan hệ mới, không bao giờ chặn người đã có.
    if await _count_friends(db, user.id) >= limits.friends_max:
        raise ApiError(422, "FRIENDS_LIMIT", f"Đã đủ {limits.friends_max} bạn, nâng cấp để thêm bạn")

    target = await db[c.USERS].find_one(
        {"friend_code": data.code.upper(), "deleted_at": None}, _PROFILE_FIELDS
    )
    if target is None:
        raise _not_found()
    if target["_id"] == user.id:
        raise ApiError(422, "SELF_REQUEST", "Không thể kết bạn với chính mình")

    # Đã là bạn → không gửi lại.
    if await db[c.SHARED_JOURNALS].find_one(
        {"member_key": member_key(user.id, target["_id"]), "scope": "pair"}, {"_id": 1}
    ):
        raise ApiError(409, "ALREADY_FRIENDS", "Hai người đã là bạn")

    # Yêu cầu đang chờ giữa hai người (bất kỳ hướng nào) → không gửi lại.
    if await db[c.FRIENDSHIPS].find_one(
        {
            "status": "pending",
            "$or": [
                {"requester_id": user.id, "addressee_id": target["_id"]},
                {"requester_id": target["_id"], "addressee_id": user.id},
            ],
        },
        {"_id": 1},
    ):
        raise ApiError(409, "REQUEST_EXISTS", "Đã có yêu cầu kết bạn giữa hai người")

    doc = {
        "_id": uuid4(),
        "requester_id": user.id,
        "addressee_id": target["_id"],
        "status": "pending",
        "journal_id": None,
        "created_at": now,
    }
    try:
        await db[c.FRIENDSHIPS].insert_one(doc)
    except DuplicateKeyError as err:
        raise ApiError(409, "REQUEST_EXISTS", "Đã có yêu cầu kết bạn giữa hai người") from err

    created = doc["created_at"]
    return FriendRequestOut(
        id=doc["_id"],
        direction="outgoing",
        display_name=target.get("display_name", ""),
        avatar_url=_avatar_url(target, storage),
        status="pending",
        created_at=created,
        expires_at=created + timedelta(days=limits.request_expires_days),
    )


async def accept_request(db: AsyncDatabase, user: User, request_id: UUID) -> dict:
    """Chấp nhận yêu cầu (phải là người nhận) → tạo sổ chung.

    Hai bên cùng bấm chấp nhận trong cùng khoảnh khắc: chỉ một cuốn sổ được tạo
    (index unique `member_key`). Trần sổ chung kiểm trước khi tạo.
    """
    limits = get_limits().tier(user.account_tier).shared
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=limits.request_expires_days)

    req = await db[c.FRIENDSHIPS].find_one(
        {"_id": request_id, "addressee_id": user.id, "status": "pending"},
        {"_id": 1, "requester_id": 1, "addressee_id": 1, "created_at": 1},
    )
    if req is None:
        raise _not_found()
    if (req.get("created_at") or now) < cutoff:
        raise _not_found()  # hết hạn: coi như không tồn tại

    # Trần sổ chung: M1 một cặp một sổ, nên trần bằng trần bạn.
    if await _count_active_journals(db, user.id) >= limits.journals_max:
        raise ApiError(422, "JOURNALS_LIMIT", f"Đã đủ {limits.journals_max} sổ chung")

    other_id = req["requester_id"]
    key = member_key(user.id, other_id)

    # Upsert theo member_key: hai request cùng lúc chỉ tạo được một cuốn (index unique partial).
    journal = await db[c.SHARED_JOURNALS].find_one_and_update(
        {"member_key": key, "scope": "pair"},
        {
            "$setOnInsert": {
                "_id": uuid4(),
                "scope": "pair",
                "mode": "together",
                "status": "active",
                "member_key": key,
                "members": [
                    {"user_id": user.id, "role": "member", "joined_at": now},
                    {"user_id": other_id, "role": "member", "joined_at": now},
                ],
                "created_by": user.id,
                "created_at": now,
                "updated_at": now,
            }
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if journal is None:
        raise _not_found()

    await db[c.FRIENDSHIPS].update_one(
        {"_id": req["_id"], "status": "pending"},
        {"$set": {"status": "accepted", "journal_id": journal["_id"], "responded_at": now}},
    )
    return journal


async def decline_request(db: AsyncDatabase, user: User, request_id: UUID) -> None:
    """Từ chối (phải là người nhận)."""
    now = datetime.now(UTC)
    result = await db[c.FRIENDSHIPS].update_one(
        {"_id": request_id, "addressee_id": user.id, "status": "pending"},
        {"$set": {"status": "declined", "responded_at": now}},
    )
    if result.matched_count == 0:
        raise _not_found()


async def end_journal(db: AsyncDatabase, user: User, journal_id: UUID) -> None:
    """Kết thúc sổ chung: hiệu lực tức thì, không xóa gì.

    Người còn lại không thấy mục của người đã kết thúc; mỗi người vẫn thấy mục của chính mình.
    """
    journal = await db[c.SHARED_JOURNALS].find_one(
        {"_id": journal_id, "members.user_id": user.id}, {"_id": 1, "status": 1}
    )
    if journal is None:
        raise _not_found()
    now = datetime.now(UTC)
    await db[c.SHARED_JOURNALS].update_one(
        {"_id": journal_id}, {"$set": {"status": "ended", "ended_at": now, "updated_at": now}}
    )
    await db[c.FRIENDSHIPS].update_many(
        {"journal_id": journal_id, "status": "accepted"}, {"$set": {"status": "ended"}}
    )
