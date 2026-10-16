from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.errors import error_response


def user_or_ip(request: Request) -> str:
    # get_current_user gán request.state.user_id; FastAPI giải dependency trước khi limiter kiểm tra.
    user_id = getattr(request.state, "user_id", None)
    return f"user:{user_id}" if user_id else f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=user_or_ip,
    storage_uri=settings.rate_limit_storage_uri,
    strategy="moving-window",
    headers_enabled=False,
)


async def rate_limit_exceeded_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = exc.limit.limit.get_expiry() if exc.limit else 60
    return error_response(
        429,
        "RATE_LIMITED",
        "Bạn thao tác quá nhanh, thử lại sau ít phút",
        headers={"Retry-After": str(retry_after)},
    )
