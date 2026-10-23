from fastapi import APIRouter, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.core.storage import S3, OptionalS3
from app.db.client import Db
from app.schemas.photos import AvatarUploadOut, PhotoUploadIn
from app.schemas.users import MeOut, MeUpdate
from app.services import users as user_service

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=MeOut)
# Mỗi lần tải trang đều gọi /me (rẻ: không truy vấn thêm ngoài phiên) nên có hạn mức riêng, cao hơn "read".
@limiter.limit(rate_limit("me"))
async def read_me(request: Request, user: CurrentUser, s3: OptionalS3) -> MeOut:
    return MeOut.from_user(user, s3)


@router.patch("", response_model=MeOut)
@limiter.limit(rate_limit("write"))
async def update_me(request: Request, body: MeUpdate, user: CurrentUser, db: Db, s3: OptionalS3) -> MeOut:
    """Sửa tên, múi giờ (chỉ áp dụng cho các ngày sau đó), bộ icon, màu cờ tùy chỉnh,
    đổi hoặc gỡ ảnh đại diện, đánh dấu xong lần đầu."""
    return MeOut.from_user(await user_service.update_me(db, user, body, s3), s3)


@router.post("/avatar/upload-url", response_model=AvatarUploadOut)
@limiter.limit(rate_limit("photo_upload"))
async def create_avatar_upload(
    request: Request, body: PhotoUploadIn, user: CurrentUser, s3: S3
) -> AvatarUploadOut:
    """Presigned PUT cho ảnh đại diện đã cắt vuông và nén trên trình duyệt; tải xong gửi PATCH /me."""
    return user_service.create_avatar_upload(s3, user, body.content_type)
