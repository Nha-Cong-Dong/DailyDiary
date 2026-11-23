"""Bạn bè (ADR 0007, F-11): mã bạn, yêu cầu kết bạn, chấp nhận/từ chối, mời mở sổ, kết thúc sổ.

Router chỉ nhận request, gọi service, trả response — không truy vấn DB trực tiếp.
Mời mở sổ chung ở đây (một bên mời); danh sách/chấp nhận/từ chối lời mời ở `shared_journals`.
"""

from uuid import UUID

from fastapi import APIRouter, Request, Response
from slowapi.util import get_remote_address

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.core.storage import OptionalS3
from app.db.client import Db
from app.schemas.social import (
    FriendCodeOut,
    FriendListOut,
    FriendRequestIn,
    FriendRequestListOut,
    FriendRequestOut,
    JournalInviteOut,
)
from app.services import friendships as friend_service
from app.services import journal_invites

router = APIRouter(tags=["friends"])


@router.get("/me/friend-code", response_model=FriendCodeOut)
@limiter.limit(rate_limit("me"))
async def my_friend_code(request: Request, user: CurrentUser, db: Db) -> FriendCodeOut:
    """Mã bạn của tôi (sinh lần đầu nếu chưa có). Mã không bao giờ vào log."""
    return FriendCodeOut(friend_code=await friend_service.get_or_create_friend_code(db, user))


@router.post("/me/friend-code/rotate", response_model=FriendCodeOut)
@limiter.limit(rate_limit("write"))
async def rotate_friend_code(request: Request, user: CurrentUser, db: Db) -> FriendCodeOut:
    """Xoay mã bạn: mã cũ và link mời theo mã cũ chết ngay."""
    return FriendCodeOut(friend_code=await friend_service.rotate_friend_code(db, user))


@router.get("/friends", response_model=FriendListOut)
@limiter.limit(rate_limit("read"))
async def list_friends(request: Request, user: CurrentUser, db: Db, s3: OptionalS3) -> FriendListOut:
    """Danh sách bạn bè, kèm sổ chung của từng cặp."""
    return await friend_service.list_friends(db, user, s3)


@router.get("/friends/requests", response_model=FriendRequestListOut)
@limiter.limit(rate_limit("read"))
async def list_requests(request: Request, user: CurrentUser, db: Db, s3: OptionalS3) -> FriendRequestListOut:
    """Yêu cầu kết bạn đến và đi, chưa hết hạn."""
    return await friend_service.list_requests(db, user, s3)


@router.post("/friends/requests", response_model=FriendRequestOut)
@limiter.limit(rate_limit("friend_request"))
@limiter.limit(rate_limit("friend_request_ip"), key_func=get_remote_address)
async def send_request(
    request: Request, body: FriendRequestIn, user: CurrentUser, db: Db, s3: OptionalS3
) -> FriendRequestOut:
    """Gửi yêu cầu kết bạn bằng mã bạn. Mã sai → 404 chung, không lộ lý do."""
    return await friend_service.send_request(db, user, body, s3)


@router.post("/friends/requests/{request_id}/accept", status_code=204)
@limiter.limit(rate_limit("write"))
async def accept_request(request: Request, request_id: UUID, user: CurrentUser, db: Db) -> Response:
    """Chấp nhận yêu cầu kết bạn → thành bạn (sổ chung tạo riêng qua lời mời mở sổ)."""
    await friend_service.accept_request(db, user, request_id)
    return Response(status_code=204)


@router.post("/friends/{friend_id}/journal-invite", response_model=JournalInviteOut)
@limiter.limit(rate_limit("journal_invite"))
async def invite_journal(
    request: Request, friend_id: UUID, user: CurrentUser, db: Db, s3: OptionalS3
) -> JournalInviteOut:
    """Mời một người bạn mở sổ chung; sổ chỉ được tạo khi hai bên đều chấp nhận."""
    return await journal_invites.invite_journal(db, user, friend_id, s3)


@router.post("/friends/requests/{request_id}/decline", status_code=204)
@limiter.limit(rate_limit("write"))
async def decline_request(request: Request, request_id: UUID, user: CurrentUser, db: Db) -> Response:
    """Từ chối yêu cầu."""
    await friend_service.decline_request(db, user, request_id)
    return Response(status_code=204)


@router.delete("/friends/{friend_id}/friendship", status_code=204)
@limiter.limit(rate_limit("write"))
async def unfriend(request: Request, friend_id: UUID, user: CurrentUser, db: Db) -> Response:
    """Hủy kết bạn: kết thúc sổ đang có (giữ dữ liệu) và hủy lời mời mở sổ đang chờ."""
    await friend_service.unfriend(db, user, friend_id)
    return Response(status_code=204)


@router.delete("/friends/{journal_id}", status_code=204)
@limiter.limit(rate_limit("write"))
async def end_journal(request: Request, journal_id: UUID, user: CurrentUser, db: Db) -> Response:
    """Kết thúc sổ chung: hiệu lực tức thì, không xóa gì."""
    await friend_service.end_journal(db, user, journal_id)
    return Response(status_code=204)
