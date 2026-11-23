"""Lời mời mở sổ chung (ADR 0007): thành bạn ≠ có sổ chung.

- Sổ chỉ được tạo khi **hai bên đều chấp nhận**: một người gửi lời mời (bấm "Mở sổ chung"),
  người kia chấp nhận → tạo sổ. Không ai được tự sinh sổ cho cặp khác.
- Một cặp có tối đa một sổ đang hoạt động và tối đa `shared.journals_per_pair_max` sổ tổng cộng:
  sổ đã kết thúc được lưu trữ, mở lại = sổ mới (`generation` + 1, đánh số lại từ 0). Unique
  `(member_key, generation)` (m0013) làm hai bên bấm chấp nhận cùng lúc chỉ tạo được một cuốn.
- Trần số sổ chung kiểm ở bước tạo (bên chấp nhận).
- Lời mời có hiệu lực `shared.request_expires_days` rồi tự biến mất khỏi danh sách (khớp
  cách hết hạn của yêu cầu kết bạn).
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.errors import ApiError
from app.core.limits import get_limits
from app.core.storage import Storage
from app.db import collections as c
from app.schemas.social import JournalInviteListOut, JournalInviteOut
from app.schemas.users import User

# Hai uuid đã sắp xếp của cặp — trùng khóa với `member_key` của sổ chung, kèm scope "pair".
_PAIR = {"scope": "pair"}


def _not_found() -> ApiError:
    return ApiError(404, "NOT_FOUND", "Không tìm thấy")


async def _profiles(db: AsyncDatabase, ids: set[UUID]) -> dict[UUID, dict]:
    if not ids:
        return {}
    fields = {"_id": 1, "display_name": 1, "avatar_url": 1, "avatar_key": 1, "deleted_at": 1}
    return {p["_id"]: p async for p in db[c.USERS].find({"_id": {"$in": sorted(ids)}}, fields)}


def _avatar(doc: dict, storage: Storage | None) -> str | None:
    if doc.get("avatar_key"):
        return storage.view_url(doc["avatar_key"]) if storage else None
    return doc.get("avatar_url")


def _is_friend_filter(a: UUID, b: UUID) -> dict:
    return {
        "status": "accepted",
        "$or": [
            {"requester_id": a, "addressee_id": b},
            {"requester_id": b, "addressee_id": a},
        ],
    }


def _pair_invite_filter(a: UUID, b: UUID) -> dict:
    return {
        "status": "pending",
        "$or": [
            {"requester_id": a, "addressee_id": b},
            {"requester_id": b, "addressee_id": a},
        ],
    }


async def invite_journal(
    db: AsyncDatabase, user: User, friend_id: UUID, storage: Storage | None = None
) -> JournalInviteOut:
    """Gửi lời mời mở sổ chung với một người bạn (mình là bên đã sẵn sàng)."""
    limits = get_limits().tier(user.account_tier).shared
    now = datetime.now(UTC)
    if friend_id == user.id:
        raise ApiError(422, "SELF_INVITE", "Không thể mời chính mình mở sổ chung")

    if not await db[c.FRIENDSHIPS].find_one(_is_friend_filter(user.id, friend_id), {"_id": 1}):
        raise ApiError(422, "NOT_FRIENDS", "Chỉ mời được người bạn của mình")

    key = "|".join(sorted([str(user.id), str(friend_id)]))
    # Sổ đã kết thúc được lưu trữ, không chặn mở sổ mới; chỉ chặn khi còn sổ đang hoạt động hoặc đủ trần cặp.
    if await db[c.SHARED_JOURNALS].find_one({"member_key": key, "status": "active", **_PAIR}, {"_id": 1}):
        raise ApiError(409, "JOURNAL_EXISTS", "Hai người đã có sổ chung")
    if (
        await db[c.SHARED_JOURNALS].count_documents({"member_key": key, **_PAIR})
        >= limits.journals_per_pair_max
    ):
        raise ApiError(
            422, "PAIR_JOURNALS_LIMIT", f"Mỗi cặp bạn chỉ có tối đa {limits.journals_per_pair_max} sổ chung"
        )
    if await db[c.JOURNAL_REQUESTS].find_one(_pair_invite_filter(user.id, friend_id), {"_id": 1}):
        raise ApiError(409, "INVITE_EXISTS", "Đã có lời mời mở sổ chung giữa hai người")

    doc = {
        "_id": uuid4(),
        "requester_id": user.id,
        "addressee_id": friend_id,
        "status": "pending",
        "journal_id": None,
        "created_at": now,
    }
    try:
        await db[c.JOURNAL_REQUESTS].insert_one(doc)
    except DuplicateKeyError as err:
        raise ApiError(409, "INVITE_EXISTS", "Đã có lời mời mở sổ chung giữa hai người") from err

    profile = (await _profiles(db, {friend_id})).get(friend_id) or {}
    return JournalInviteOut(
        id=doc["_id"],
        direction="outgoing",
        display_name=profile.get("display_name", ""),
        avatar_url=_avatar(profile, storage),
        status="pending",
        created_at=now,
        expires_at=now + timedelta(days=limits.request_expires_days),
    )


async def list_journal_invites(
    db: AsyncDatabase, user: User, storage: Storage | None
) -> JournalInviteListOut:
    """Lời mời mở sổ chung đang chờ (đến và đi), chưa hết hạn."""
    limits = get_limits().tier(user.account_tier).shared
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=limits.request_expires_days)

    query = {
        "status": "pending",
        "created_at": {"$gte": cutoff},
        "$or": [{"requester_id": user.id}, {"addressee_id": user.id}],
    }
    pending = (
        await db[c.JOURNAL_REQUESTS]
        .find(query, {"_id": 1, "requester_id": 1, "addressee_id": 1, "created_at": 1})
        .to_list()
    )

    incoming = [r for r in pending if r["addressee_id"] == user.id]
    outgoing = [r for r in pending if r["requester_id"] == user.id]
    other_ids = {r["addressee_id"] for r in incoming} | {r["requester_id"] for r in outgoing}
    profiles = await _profiles(db, other_ids)

    def to_out(doc: dict, direction: str) -> JournalInviteOut:
        other = doc["addressee_id"] if direction == "outgoing" else doc["requester_id"]
        profile = profiles.get(other) or {}
        created = doc.get("created_at") or now
        return JournalInviteOut(
            id=doc["_id"],
            direction=direction,
            display_name=profile.get("display_name", ""),
            avatar_url=_avatar(profile, storage),
            status="pending",
            created_at=created,
            expires_at=created + timedelta(days=limits.request_expires_days),
        )

    return JournalInviteListOut(
        incoming=[to_out(r, "incoming") for r in incoming],
        outgoing=[to_out(r, "outgoing") for r in outgoing],
    )


async def accept_invite(db: AsyncDatabase, user: User, invite_id: UUID) -> dict:
    """Người được mời chấp nhận → tạo sổ chung. Chỉ người nhận mới được chấp nhận.

    Hai bên bấm cùng lúc: chỉ tạo một cuốn (index unique `member_key`). Trần sổ chung kiểm ở đây
    (bên tạo sổ), không phải lúc gửi mời.
    """
    limits = get_limits().tier(user.account_tier).shared
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=limits.request_expires_days)

    invite = await db[c.JOURNAL_REQUESTS].find_one(
        {"_id": invite_id, "addressee_id": user.id, "status": "pending"},
        {"_id": 1, "requester_id": 1, "addressee_id": 1, "created_at": 1},
    )
    if invite is None:
        raise _not_found()
    if (invite.get("created_at") or now) < cutoff:
        raise _not_found()  # hết hạn: coi như không tồn tại

    active = await db[c.SHARED_JOURNALS].count_documents({"members.user_id": user.id, "status": "active"})
    if active >= limits.journals_max:
        raise ApiError(422, "JOURNALS_LIMIT", f"Đã đủ {limits.journals_max} sổ chung")

    other_id = invite["requester_id"]
    key = "|".join(sorted([str(user.id), str(other_id)]))

    # Sổ đang hoạt động của cặp (nếu bên kia vừa chấp nhận cùng lúc) thì dùng lại; không thì tạo cuốn kế tiếp
    # (sổ cũ đã kết thúc giữ nguyên làm lưu trữ). Unique (member_key, generation) chặn tạo trùng khi đua nhau.
    pair_filter = {"member_key": key, **_PAIR}
    journal = await db[c.SHARED_JOURNALS].find_one({**pair_filter, "status": "active"})
    if journal is None:
        generation = await db[c.SHARED_JOURNALS].count_documents(pair_filter) + 1
        if generation > limits.journals_per_pair_max:
            raise ApiError(
                422,
                "PAIR_JOURNALS_LIMIT",
                f"Mỗi cặp bạn chỉ có tối đa {limits.journals_per_pair_max} sổ chung",
            )
        journal = {
            "_id": uuid4(),
            "scope": "pair",
            "mode": "together",
            "status": "active",
            "member_key": key,
            "generation": generation,
            "members": [
                {"user_id": user.id, "role": "member", "joined_at": now},
                {"user_id": other_id, "role": "member", "joined_at": now},
            ],
            "created_by": user.id,
            "created_at": now,
            "updated_at": now,
        }
        try:
            await db[c.SHARED_JOURNALS].insert_one(journal)
        except DuplicateKeyError:
            journal = await db[c.SHARED_JOURNALS].find_one({**pair_filter, "status": "active"})
            if journal is None:
                raise _not_found() from None

    result = await db[c.JOURNAL_REQUESTS].update_one(
        {"_id": invite_id, "addressee_id": user.id, "status": "pending"},
        {"$set": {"status": "accepted", "journal_id": journal["_id"], "responded_at": now}},
    )
    if result.matched_count == 0:
        # Bên kia vừa kết thúc cặp hoặc mời đã hết hạn trong lúc bấm → giữ sổ đã tạo, không lỗi.
        return journal
    # Gắn sổ vào quan hệ bạn để danh sách bạn hiện đúng trạng thái (khớp m0010).
    await db[c.FRIENDSHIPS].update_one(
        _is_friend_filter(user.id, other_id),
        {"$set": {"journal_id": journal["_id"]}},
    )
    return journal


async def decline_invite(db: AsyncDatabase, user: User, invite_id: UUID) -> None:
    """Từ chối lời mời (chỉ người nhận)."""
    now = datetime.now(UTC)
    result = await db[c.JOURNAL_REQUESTS].update_one(
        {"_id": invite_id, "addressee_id": user.id, "status": "pending"},
        {"$set": {"status": "declined", "responded_at": now}},
    )
    if result.matched_count == 0:
        raise _not_found()


async def pending_invite_exists(db: AsyncDatabase, a: UUID, b: UUID) -> bool:
    """Có lời mời đang chờ giữa hai người không (dùng đánh dấu trên danh sách bạn)."""
    return await db[c.JOURNAL_REQUESTS].find_one(_pair_invite_filter(a, b), {"_id": 1}) is not None
