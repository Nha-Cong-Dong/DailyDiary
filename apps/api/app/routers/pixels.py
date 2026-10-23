from typing import Annotated

from fastapi import APIRouter, Path, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.db.client import Db
from app.schemas.pixels import PixelsOut
from app.services import pixels as pixels_service

router = APIRouter(prefix="/pixels", tags=["pixels"])


@router.get("/{year}", response_model=PixelsOut)
@limiter.limit(rate_limit("read"))
async def read_year(
    request: Request, year: Annotated[int, Path(ge=2000, le=2100)], user: CurrentUser, db: Db
) -> PixelsOut:
    """Điểm cả năm (chuỗi gọn), cờ hiệu, ngày ghi bù, chuỗi ngày và các năm có dữ liệu. Không có nội dung."""
    return await pixels_service.get_year(db, user, year)
