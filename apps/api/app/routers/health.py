from fastapi import APIRouter
from pydantic import BaseModel

from app.core.errors import ApiError
from app.db.client import Db

router = APIRouter(tags=["health"])


class HealthOut(BaseModel):
    status: str
    db: str


@router.get("/health", response_model=HealthOut)
async def health(db: Db) -> HealthOut:
    try:
        await db.command("ping")
    except Exception as exc:
        raise ApiError(503, "DB_UNAVAILABLE", "Cơ sở dữ liệu chưa sẵn sàng") from exc
    return HealthOut(status="ok", db="ok")
