import secrets
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.limits import get_limits
from app.core.logging import RequestLogMiddleware, configure_logging
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.security import verify_csrf
from app.core.storage import make_storage
from app.db.client import make_client
from app.routers import auth, entries, health, me, photos, shares

DEV_ENVS = {"local", "test"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_limits()  # đọc và kiểm tra shared/limits.json ngay khi khởi động
    client = make_client(settings.mongodb_uri)
    app.state.mongo = client
    app.state.db = client[settings.mongodb_db]
    app.state.storage = make_storage()
    try:
        yield
    finally:
        await client.close()


def _session_secret() -> str:
    # Khóa ký cookie dd_oauth (state/nonce của OAuth). Bắt buộc ngoài local/test.
    if settings.session_secret:
        return settings.session_secret
    if settings.env in DEV_ENVS:
        return secrets.token_urlsafe(48)  # local/test: khóa tạm, đổi mỗi lần khởi động
    raise RuntimeError("Thiếu SESSION_SECRET")


def create_app() -> FastAPI:
    configure_logging()
    if settings.dev_login and settings.env not in DEV_ENVS:
        raise RuntimeError("DEV_LOGIN chỉ được bật khi ENV là local hoặc test")
    app = FastAPI(
        title="DailyDiary API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.env != "production" else None,
        redoc_url=None,
        # Request ghi có cookie phiên phải đúng Origin và X-CSRF-Token (core/security.py).
        dependencies=[Depends(verify_csrf)],
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    register_error_handlers(app)

    # Thêm sau = bọc ngoài. CORS phải là lớp ngoài cùng để mọi response (kể cả 429/500) có header CORS.
    # Cookie tạm của luồng OAuth (state, nonce, tz), không phải phiên đăng nhập.
    app.add_middleware(
        SessionMiddleware,
        secret_key=_session_secret(),
        session_cookie="dd_oauth",
        max_age=600,
        same_site="lax",
        https_only=settings.cookie_secure,
    )
    app.add_middleware(RequestLogMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
        max_age=600,
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(me.router)
    app.include_router(entries.router)
    app.include_router(photos.router)
    app.include_router(shares.router)
    if settings.dev_login and settings.env in DEV_ENVS:
        app.include_router(auth.dev_router)
    return app


app = create_app()
