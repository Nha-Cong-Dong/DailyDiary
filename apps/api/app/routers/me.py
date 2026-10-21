from fastapi import APIRouter, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.db.client import Db
from app.schemas.users import MeOut, MeUpdate
from app.services import users as user_service

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=MeOut)
# Mỗi lần tải trang đều gọi /me (rẻ: không truy vấn thêm ngoài phiên) nên có hạn mức riêng, cao hơn "read".
@limiter.limit(rate_limit("me"))
async def read_me(request: Request, user: CurrentUser) -> MeOut:
    return MeOut.from_user(user)


@router.patch("", response_model=MeOut)
@limiter.limit(rate_limit("write"))
async def update_me(request: Request, body: MeUpdate, user: CurrentUser, db: Db) -> MeOut:
    """Sửa tên, múi giờ (chỉ áp dụng cho các ngày sau đó), bộ icon, gỡ ảnh đại diện, đánh dấu xong lần đầu."""
    return MeOut.from_user(await user_service.update_me(db, user, body))
