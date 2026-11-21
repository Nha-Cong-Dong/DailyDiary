"""Sổ chung (ADR 0007, F-11): đọc/ghi mục chung, ảnh trong sổ chung, lời mời mở sổ.

Mọi endpoint kiểm tra người gọi là thành viên của sổ; không thuộc → 404 (không phải 403,
để không rò rỉ sự tồn tại). `author_id` lấy từ phiên, không lấy từ body.
Lời mời mở sổ: một bên mời (routers/friendships.py), hai bên đều chấp nhận mới tạo sổ.
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Request, Response

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.core.storage import S3, OptionalS3
from app.db.client import Db
from app.schemas.social import (
    JournalDetailOut,
    JournalInviteListOut,
    JournalListOut,
    SharedEntryOut,
    SharedEntryPageOut,
    SharedEntryWrite,
    SharedPhotoConfirmIn,
    SharedPhotoOrderIn,
    SharedPhotoUploadIn,
    SharedPhotoUploadOut,
)
from app.services import journal_invites
from app.services import shared_journals as journal_service
from app.services import shared_photos as shared_photo_service

router = APIRouter(tags=["journals"])


@router.get("/journals/invites", response_model=JournalInviteListOut)
@limiter.limit(rate_limit("read"))
async def list_journal_invites(
    request: Request, user: CurrentUser, db: Db, s3: OptionalS3
) -> JournalInviteListOut:
    """Lời mời mở sổ chung đang chờ (đến và đi), chưa hết hạn."""
    return await journal_invites.list_journal_invites(db, user, s3)


@router.post("/journals/invites/{invite_id}/accept", status_code=204)
@limiter.limit(rate_limit("write"))
async def accept_journal_invite(
    request: Request, invite_id: UUID, user: CurrentUser, db: Db
) -> Response:
    """Chấp nhận lời mời (phải là người được mời) → tạo sổ chung nếu hai bên đều sẵn sàng."""
    await journal_invites.accept_invite(db, user, invite_id)
    return Response(status_code=204)


@router.post("/journals/invites/{invite_id}/decline", status_code=204)
@limiter.limit(rate_limit("write"))
async def decline_journal_invite(
    request: Request, invite_id: UUID, user: CurrentUser, db: Db
) -> Response:
    """Từ chối lời mời (phải là người được mời)."""
    await journal_invites.decline_invite(db, user, invite_id)
    return Response(status_code=204)


@router.get("/journals", response_model=JournalListOut)
@limiter.limit(rate_limit("read"))
async def list_journals(request: Request, user: CurrentUser, db: Db, s3: OptionalS3) -> JournalListOut:
    """Các sổ chung của tôi, kèm trạng thái chuỗi ấm và badge đồng bộ."""
    return await journal_service.list_journals(db, user, s3)


@router.get("/journals/{journal_id}", response_model=JournalDetailOut)
@limiter.limit(rate_limit("journal_read"))
async def get_journal(
    request: Request, journal_id: UUID, user: CurrentUser, db: Db, s3: OptionalS3
) -> JournalDetailOut:
    """Chi tiết một cuốn sổ: thành viên, chuỗi ấm, badge đồng bộ."""
    return await journal_service.get_journal(db, user, journal_id, s3)


@router.get("/journals/{journal_id}/entries", response_model=SharedEntryPageOut)
@limiter.limit(rate_limit("journal_read"))
async def list_entries(
    request: Request,
    journal_id: UUID,
    user: CurrentUser,
    db: Db,
    s3: OptionalS3,
    cursor: str | None = None,
) -> SharedEntryPageOut:
    """Mục chung của cả hai, mới nhất trước. `?cursor=` để sang trang tiếp."""
    return await journal_service.list_entries(db, user, journal_id, s3, cursor)


@router.put("/journals/{journal_id}/entries/{day}", response_model=SharedEntryOut)
@limiter.limit(rate_limit("journal_write"))
async def save_entry(
    request: Request,
    journal_id: UUID,
    day: date,
    body: SharedEntryWrite,
    user: CurrentUser,
    db: Db,
    s3: OptionalS3,
) -> SharedEntryOut:
    """Viết mục chung của **tôi** cho một ngày."""
    return await journal_service.save_entry(db, user, journal_id, day, body, s3)


@router.delete("/journals/{journal_id}/entries/{day}", status_code=204)
@limiter.limit(rate_limit("write"))
async def delete_entry(request: Request, journal_id: UUID, day: date, user: CurrentUser, db: Db) -> Response:
    """Xóa mềm mục chung của tôi."""
    await journal_service.delete_entry(db, user, journal_id, day)
    return Response(status_code=204)


@router.post("/journals/{journal_id}/photos/upload-url", response_model=SharedPhotoUploadOut)
@limiter.limit(rate_limit("photo_upload"))
async def create_upload(
    request: Request,
    journal_id: UUID,
    day: date,
    body: SharedPhotoUploadIn,
    user: CurrentUser,
    db: Db,
    s3: S3,
) -> SharedPhotoUploadOut:
    """Ký hai presigned PUT cho ảnh của mục chung (mục phải có trước)."""
    return await shared_photo_service.create_upload(db, s3, user, journal_id, day, body.content_type)


@router.post("/journals/{journal_id}/photos", response_model=SharedEntryOut)
@limiter.limit(rate_limit("photo_upload"))
async def confirm_upload(
    request: Request,
    journal_id: UUID,
    day: date,
    body: SharedPhotoConfirmIn,
    user: CurrentUser,
    db: Db,
    s3: S3,
) -> SharedEntryOut:
    """Xác nhận ảnh đã tải lên kho rồi gắn vào mục chung của tôi."""
    entry = await shared_photo_service.confirm_upload(
        db, s3, user, journal_id, day, body.photo_id, body.content_type, body.width, body.height
    )
    return await journal_service.entry_out_for_viewer(db, entry, user, s3)


@router.patch("/journals/{journal_id}/photos/order", response_model=SharedEntryOut)
@limiter.limit(rate_limit("write"))
async def reorder_photos(
    request: Request,
    journal_id: UUID,
    day: date,
    body: SharedPhotoOrderIn,
    user: CurrentUser,
    db: Db,
    s3: OptionalS3,
) -> SharedEntryOut:
    """Sắp xếp ảnh của mục chung của tôi."""
    entry = await shared_photo_service.reorder(db, user, journal_id, day, body.photo_ids)
    return await journal_service.entry_out_for_viewer(db, entry, user, s3)
