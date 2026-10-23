from datetime import date

from fastapi import APIRouter, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.core.storage import OptionalS3
from app.db.client import Db
from app.schemas.entries import EntryDeletedOut, EntryOut, EntryWrite
from app.services import entries as entry_service

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("/{day}", response_model=EntryOut)
@limiter.limit(rate_limit("read"))
async def read_entry(request: Request, day: date, user: CurrentUser, db: Db, s3: OptionalS3) -> EntryOut:
    """Nhật ký của một ngày. 404 khi chưa ghi hoặc đã xóa."""
    return await entry_service.get_entry(db, user.id, day, s3)


@router.put("/{day}", response_model=EntryOut)
@limiter.limit(rate_limit("autosave"))
async def save_entry(
    request: Request, day: date, body: EntryWrite, user: CurrentUser, db: Db, s3: OptionalS3
) -> EntryOut:
    """Tạo hoặc cập nhật. Gửi kèm `updated_at` đã nhận để phát hiện xung đột (409).

    Không cho ghi ngày tương lai theo múi giờ hồ sơ (422).
    """
    return await entry_service.save_entry(db, user, day, body, s3)


@router.delete("/{day}", response_model=EntryDeletedOut)
@limiter.limit(rate_limit("write"))
async def delete_entry(request: Request, day: date, user: CurrentUser, db: Db) -> EntryDeletedOut:
    """Xóa mềm; khôi phục được tới `restore_until`."""
    return await entry_service.delete_entry(db, user, day)


@router.post("/{day}/restore", response_model=EntryOut)
@limiter.limit(rate_limit("write"))
async def restore_entry(request: Request, day: date, user: CurrentUser, db: Db, s3: OptionalS3) -> EntryOut:
    """Hoàn tác xóa (còn trong hạn khôi phục)."""
    return await entry_service.restore_entry(db, user, day, s3)
