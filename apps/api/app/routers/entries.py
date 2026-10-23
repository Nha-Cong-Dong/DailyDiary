from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.core.storage import OptionalS3
from app.db.client import Db
from app.schemas.account import WipeIn, WipeOut
from app.schemas.entries import EntryDeletedOut, EntryMonthOut, EntryOut, EntryWrite
from app.services import account as account_service
from app.services import entries as entry_service

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("", response_model=EntryMonthOut)
@limiter.limit(rate_limit("read"))
async def list_month(
    request: Request,
    month: Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Tháng YYYY-MM")],
    user: CurrentUser,
    db: Db,
) -> EntryMonthOut:
    """Dòng thời gian một tháng: mọi trang chưa xóa, mới nhất trước, chỉ đoạn đầu nội dung và số ảnh."""
    return await entry_service.list_month(db, user.id, month)


@router.delete("", response_model=WipeOut)
@limiter.limit(rate_limit("write"))
async def wipe_journal(
    request: Request, body: WipeIn, user: CurrentUser, db: Db, s3: OptionalS3, background: BackgroundTasks
) -> WipeOut:
    """Xóa toàn bộ dữ liệu (F-07): mọi trang (cả thùng rác), link chia sẻ, ảnh nhật ký.

    Giữ tài khoản và cài đặt.

    Gửi `{"confirm": "XÓA"}`. Ảnh trong kho được dọn trong nền ngay sau khi trả lời.
    """
    out = await account_service.wipe_journal(db, user)
    background.add_task(account_service.purge_journal_photos, s3, user.id)
    return out


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
