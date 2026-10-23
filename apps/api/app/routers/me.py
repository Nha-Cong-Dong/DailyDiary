from fastapi import APIRouter, BackgroundTasks, Request, Response

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser, clear_session_cookies
from app.core.storage import S3, OptionalS3
from app.db.client import Db
from app.schemas.account import DataSummaryOut, DeleteAccountIn
from app.schemas.photos import AvatarUploadOut, PhotoUploadIn
from app.schemas.users import MeOut, MeUpdate
from app.services import account as account_service
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


@router.get("/data-summary", response_model=DataSummaryOut)
@limiter.limit(rate_limit("read"))
async def data_summary(request: Request, user: CurrentUser, db: Db) -> DataSummaryOut:
    """Số trang, ảnh, link chia sẻ sẽ mất khi xóa dữ liệu hoặc xóa tài khoản."""
    return await account_service.data_summary(db, user.id)


@router.delete("", status_code=204)
@limiter.limit(rate_limit("write"))
async def delete_account(
    request: Request,
    response: Response,
    body: DeleteAccountIn,
    user: CurrentUser,
    db: Db,
    s3: OptionalS3,
    background: BackgroundTasks,
) -> None:
    """Xóa tài khoản (F-07): gửi `{"confirm_email": <email tài khoản>}`. Đăng xuất mọi thiết bị ngay;
    ảnh trong kho và hồ sơ được dọn trong nền. Góp ý giữ nội dung nhưng ẩn danh.
    """
    await account_service.delete_account(db, user, body.confirm_email)
    clear_session_cookies(response)
    background.add_task(account_service.purge_account, db, s3, user.id)
