from fastapi import APIRouter, BackgroundTasks, Request

from app.core.limits import rate_limit
from app.core.rate_limit import limiter
from app.core.security import CurrentUser
from app.db.client import Db
from app.schemas.feedback import FeedbackIn, FeedbackOut
from app.services import feedback as feedback_service

router = APIRouter(tags=["feedback"])


@router.post("/feedback", response_model=FeedbackOut, status_code=201)
@limiter.limit(rate_limit("feedback"))
async def send_feedback(
    request: Request, body: FeedbackIn, user: CurrentUser, db: Db, background: BackgroundTasks
) -> FeedbackOut:
    """Lưu góp ý rồi gửi email về hộp thư của Jotly trong nền (lỗi gửi thư không làm hỏng request)."""
    doc = await feedback_service.save_feedback(db, user, body)
    background.add_task(feedback_service.email_feedback, db, user, doc)
    return FeedbackOut()
