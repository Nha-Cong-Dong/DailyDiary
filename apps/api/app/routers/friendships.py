"""Bạn bè (ADR 0007, F-11): mã bạn, yêu cầu kết bạn, chấp nhận/từ chối, kết thúc sổ chung.

Router chỉ nhận request, gọi service, trả response — không truy vấn DB trực tiếp.
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
)
from app.services import friendships as friend_service

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
    """Chấp nhận yêu cầu → sinh sổ chung 1–1."""
    await friend_service.accept_request(db, user, request_id)
    return Response(status_code=204)


@router.post("/friends/requests/{request_id}/decline", status_code=204)
@limiter.limit(rate_limit("write"))
async def decline_request(request: Request, request_id: UUID, user: CurrentUser, db: Db) -> Response:
    """Từ chối yêu cầu."""
    await friend_service.decline_request(db, user, request_id)
    return Response(status_code=204)


@router.delete("/friends/{journal_id}", status_code=204)
@limiter.limit(rate_limit("write"))
async def end_journal(request: Request, journal_id: UUID, user: CurrentUser, db: Db) -> Response:
    """Kết thúc sổ chung: hiệu lực tức thì, không xóa gì."""
    await friend_service.end_journal(db, user, journal_id)
    return Response(status_code=204)
