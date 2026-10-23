from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.core.limits import get_limits, rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.db.client import Db
from app.schemas.search import SearchOut, TopKeywordsOut
from app.services import search as search_service

router = APIRouter(tags=["search"])

Score = Annotated[int, Query(ge=1, le=5)]


@router.get("/search", response_model=SearchOut)
# Tìm theo từng lần ngừng gõ nên có hạn mức riêng, cao hơn "read".
@limiter.limit(rate_limit("search"))
async def search(
    request: Request,
    user: CurrentUser,
    db: Db,
    q: Annotated[
        str, Query(min_length=1, max_length=100, pattern=r"\S", description="Từ khóa (không ghi log)")
    ],
    score: Annotated[list[Score] | None, Query()] = None,
    period: search_service.Period = "all",
    has_photo: bool = False,
    cursor: date | None = None,
) -> SearchOut:
    """Tìm trong tiêu đề, nội dung, từ khóa; lọc điểm (nhiều mức), khoảng thời gian, chỉ ngày có ảnh.

    Mới nhất trước, `pagination.search_page_size` kết quả mỗi trang; `cursor` = `next_cursor` của lần trước.
    """
    return await search_service.search(
        db,
        user,
        q,
        scores=score or [],
        period=period,
        has_photo=has_photo,
        cursor=cursor,
        limit=get_limits().tier(user.account_tier).pagination.search_page_size,
    )


@router.get("/keywords/top", response_model=TopKeywordsOut)
@limiter.limit(rate_limit("read"))
async def top_keywords(request: Request, user: CurrentUser, db: Db) -> TopKeywordsOut:
    """6 từ khóa dùng nhiều nhất của chính người dùng."""
    return TopKeywordsOut(keywords=await search_service.top_keywords(db, user))
