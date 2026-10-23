from datetime import date

from fastapi import APIRouter, Request, Response
from slowapi.util import get_remote_address

from app.core.errors import ApiError
from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.core.storage import OptionalS3
from app.db.client import Db
from app.schemas.shares import PublicShareOut, SharedEntryOut, ShareOut, ShareUpdate
from app.services import shares as share_service

router = APIRouter(tags=["shares"])

# Trang công khai: không cho máy tìm kiếm lập chỉ mục, không lưu cache, không gửi link qua Referer.
PUBLIC_HEADERS = {
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
}


@router.get("/entries/{day}/share", response_model=ShareOut | None)
@limiter.limit(rate_limit("read"))
async def read_share(request: Request, day: date, user: CurrentUser, db: Db) -> ShareOut | None:
    """Link chia sẻ của một ngày; `null` khi chưa bật."""
    return await share_service.get_share(db, user.id, day.isoformat())


@router.put("/entries/{day}/share", response_model=ShareOut)
@limiter.limit(rate_limit("write"))
async def upsert_share(request: Request, day: date, body: ShareUpdate, user: CurrentUser, db: Db) -> ShareOut:
    """Bật link hoặc đổi phần người nhận được xem. Lần đầu bật sinh token mới."""
    return await share_service.upsert_share(db, user.id, day.isoformat(), body)


@router.delete("/entries/{day}/share", status_code=204)
@limiter.limit(rate_limit("write"))
async def delete_share(request: Request, day: date, user: CurrentUser, db: Db) -> None:
    """Tắt link. Link cũ không mở được nữa; bật lại sẽ có link mới."""
    await share_service.delete_share(db, user.id, day.isoformat())


@router.get("/shares", response_model=list[SharedEntryOut])
@limiter.limit(rate_limit("read"))
async def list_shares(request: Request, user: CurrentUser, db: Db) -> list[SharedEntryOut]:
    """Các trang đang chia sẻ, mới nhất trước."""
    return await share_service.list_shares(db, user.id)


@router.get("/public/shares/{token}", response_model=PublicShareOut, response_model_exclude_unset=True)
@limiter.limit(rate_limit("share_view"), key_func=get_remote_address)
async def read_public_share(
    request: Request, response: Response, token: str, db: Db, s3: OptionalS3
) -> PublicShareOut:
    """Trang người nhận xem, không cần đăng nhập. Mọi lý do không mở được đều trả cùng một 404."""
    try:
        share = await share_service.read_public(db, token, s3)
    except ApiError as exc:
        exc.headers = {**(exc.headers or {}), **PUBLIC_HEADERS}
        raise
    response.headers.update(PUBLIC_HEADERS)
    return share
