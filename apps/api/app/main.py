from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.limits import get_limits
from app.core.logging import RequestLogMiddleware, configure_logging
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.db.client import make_client
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_limits()  # đọc và kiểm tra shared/limits.json ngay khi khởi động
    client = make_client(settings.mongodb_uri)
    app.state.mongo = client
    app.state.db = client[settings.mongodb_db]
    try:
        yield
    finally:
        await client.close()


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title="DailyDiary API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.env != "production" else None,
        redoc_url=None,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    register_error_handlers(app)

    # Thêm sau = bọc ngoài. CORS phải là lớp ngoài cùng để mọi response (kể cả 429/500) có header CORS.
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
    return app


app = create_app()
