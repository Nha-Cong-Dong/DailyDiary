from typing import Annotated

from fastapi import APIRouter, Path, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.db.client import Db
from app.schemas.calendar import CalendarOut
from app.services import calendar as calendar_service

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/{year}/{month}", response_model=CalendarOut)
@limiter.limit(rate_limit("read"))
async def read_month(
    request: Request,
    year: Annotated[int, Path(ge=2000, le=2100)],
    month: Annotated[int, Path(ge=1, le=12)],
    user: CurrentUser,
    db: Db,
) -> CalendarOut:
    """Lịch + thống kê tháng trong một request: ngày, điểm, sub icon, cờ, số ảnh.

    Không có tiêu đề, nội dung hay từ khóa.
    """
    return await calendar_service.get_month(db, user, year, month)
