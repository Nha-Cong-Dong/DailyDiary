"""Thư gửi tương lai (GĐ2): liệt kê, ghi, xóa. Tối đa 1 thư/1 ngày ghi; nội dung mở đúng hạn."""

from uuid import UUID

from fastapi import APIRouter, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.db.client import Db
from app.schemas.letters import LetterListOut, LetterOut, LetterWrite
from app.services import letters as letter_service

router = APIRouter(prefix="/letters", tags=["letters"])


@router.get("", response_model=LetterListOut)
@limiter.limit(rate_limit("read"))
async def list_letters(request: Request, user: CurrentUser, db: Db) -> LetterListOut:
    """Danh sách thư của tôi; thư còn niêm phong chỉ hiện ngày mở."""
    return await letter_service.list_letters(db, user)


@router.post("", response_model=LetterOut, status_code=201)
@limiter.limit(rate_limit("write"))
async def create_letter(request: Request, body: LetterWrite, user: CurrentUser, db: Db) -> LetterOut:
    """Ghi thư, hẹn ngày mở (phải là ngày sau hôm nay)."""
    return await letter_service.create_letter(db, user, body)


@router.delete("/{letter_id}", status_code=204)
@limiter.limit(rate_limit("write"))
async def delete_letter(request: Request, letter_id: UUID, user: CurrentUser, db: Db) -> None:
    """Xóa hẳn một lá thư (thư không giữ ảnh nên không có gì dọn ở storage)."""
    await letter_service.delete_letter(db, user, letter_id)
