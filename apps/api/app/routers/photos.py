from datetime import date
from uuid import UUID

from fastapi import APIRouter, Request, Response

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.core.storage import S3
from app.db.client import Db
from app.schemas.entries import EntryOut
from app.schemas.photos import PhotoConfirmIn, PhotoOrderIn, PhotoUploadIn, PhotoUploadOut
from app.services import photos as photo_service

router = APIRouter(tags=["photos"])


@router.post("/entries/{day}/photos/upload-url", response_model=PhotoUploadOut)
@limiter.limit(rate_limit("photo_upload"))
async def create_upload(
    request: Request, day: date, body: PhotoUploadIn, user: CurrentUser, db: Db, s3: S3
) -> PhotoUploadOut:
    """Xin hai presigned PUT (ảnh chính, ảnh thu nhỏ) cho trang đã có. 422 khi đủ ảnh hoặc hết dung lượng."""
    return await photo_service.create_upload(db, s3, user, day, body.content_type)


@router.post("/entries/{day}/photos", response_model=EntryOut)
@limiter.limit(rate_limit("photo_upload"))
async def confirm_upload(
    request: Request, day: date, body: PhotoConfirmIn, user: CurrentUser, db: Db, s3: S3
) -> EntryOut:
    """Xác nhận ảnh đã tải lên kho: kiểm tra tồn tại, dung lượng, định dạng rồi gắn vào trang."""
    return await photo_service.confirm_upload(db, s3, user, day, body)


@router.patch("/entries/{day}/photos/order", response_model=EntryOut)
@limiter.limit(rate_limit("write"))
async def reorder_photos(
    request: Request, day: date, body: PhotoOrderIn, user: CurrentUser, db: Db, s3: S3
) -> EntryOut:
    """Sắp xếp lại: gửi đủ id ảnh của trang theo thứ tự mới."""
    return await photo_service.reorder(db, s3, user, day, body.photo_ids)


@router.delete("/photos/{photo_id}", status_code=204)
@limiter.limit(rate_limit("write"))
async def delete_photo(request: Request, photo_id: UUID, user: CurrentUser, db: Db, s3: S3) -> Response:
    """Xóa ảnh khỏi trang và khỏi kho."""
    await photo_service.delete_photo(db, s3, user, photo_id)
    return Response(status_code=204)
