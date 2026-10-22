# Settings, lifespan, CORS, thứ tự middleware

## `app/core/config.py`

```python
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "local"  # local | staging | production

    # MongoDB. Local: Docker Compose; production: chuỗi mongodb+srv:// của Atlas (đặt trong biến môi trường).
    mongodb_uri: str = "mongodb://dd:dd@localhost:27017/?authSource=admin"
    mongodb_db: str = "dailydiary"
    mongodb_test_db: str = "dailydiary_test"  # test XÓA SẠCH DB này; tên bắt buộc kết thúc bằng "_test"

    # Frontend / cookie
    frontend_url: str = "http://localhost:5173"
    frontend_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    cookie_domain: str | None = None  # production: ".dailydiary.xxx"
    cookie_secure: bool = True  # local http có thể đặt False
    session_secret: str  # ký cookie dd_oauth của SessionMiddleware
    session_ttl_days: int = 30

    # Google OAuth
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # Rate limit
    rate_limit_storage_uri: str = "memory://"

    # S3 / MinIO / R2
    s3_endpoint_url: str  # backend gọi kho: http://minio:9000 hoặc http://localhost:9000
    s3_public_endpoint_url: str  # trình duyệt dùng: http://localhost:9000
    s3_region: str = "us-east-1"  # R2: "auto"
    s3_bucket: str = "dailydiary-photos"
    s3_access_key: str
    s3_secret_key: str


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

Ghi chú:
- `list[str]` đọc từ biến môi trường dạng JSON: `FRONTEND_ORIGINS='["http://localhost:5173"]'`.
- `.env` nằm trong `.gitignore`; commit `.env.example` không có giá trị thật.
- Test cần cấu hình khác: đặt biến môi trường trong `conftest.py` **trước** khi import `app`,
  hoặc override `get_settings`.

## `app/main.py`

```python
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.security import verify_csrf
from app.core.storage import make_s3_client
from app.db.client import make_client
from app.routers import auth, entries, me, photos


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = make_client(settings.mongodb_uri)
    app.state.mongo = client
    app.state.db = client[settings.mongodb_db]
    app.state.s3 = make_s3_client(settings.s3_endpoint_url)
    app.state.s3_presign = make_s3_client(settings.s3_public_endpoint_url)
    try:
        yield
    finally:
        await client.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="DailyDiary API",
        lifespan=lifespan,
        dependencies=[Depends(verify_csrf)],  # chỉ chặn POST/PUT/PATCH/DELETE
        docs_url="/docs" if settings.env != "production" else None,
        redoc_url=None,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    # Đăng ký thêm handler lỗi chuẩn của dự án ở đây (xem api-conventions).

    # Middleware: thêm sau = bọc ngoài. CORS phải thêm cuối cùng.
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        session_cookie="dd_oauth",
        max_age=600,
        same_site="lax",
        https_only=settings.cookie_secure,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
        max_age=600,
    )

    for r in (auth.router, me.router, entries.router, photos.router):
        app.include_router(r)
    return app


app = create_app()
```

Chạy local: `uvicorn app.main:app --reload --port 8000`.
Chạy production sau proxy: `uvicorn app.main:app --proxy-headers --forwarded-allow-ips=<IP proxy>`.

## Thứ tự middleware

`add_middleware` sau cùng là lớp ngoài cùng. Thứ tự request đi qua:

```
CORSMiddleware → SessionMiddleware → ExceptionMiddleware (handler 429, lỗi chuẩn) → router
```

CORS ở ngoài cùng nên mọi response, kể cả lỗi, đều có `Access-Control-Allow-Origin`.
Lỗi 500 không được bắt thì đi qua `ServerErrorMiddleware`, lớp này nằm ngoài CORS, nên frontend
vẫn có thể thấy "CORS error" với lỗi 500. Cách xử lý: đăng ký handler cho `Exception` để trả JSON lỗi chuẩn.

## CORS và cookie khi chạy local

- `localhost:5173` gọi `localhost:8000` là **khác origin** (khác cổng) nhưng **cùng site**, nên cookie
  `SameSite=Lax` vẫn được gửi khi `fetch` có `credentials: "include"`.
- Không có `allow_origin_regex` rộng kiểu `.*`; nếu cần preview deploy, liệt kê từng origin.
- Phương án dùng proxy (giống cấu hình chung tên miền trên production):

```ts
// apps/web/vite.config.ts
server: {
  proxy: {
    "/api": { target: "http://localhost:8000", changeOrigin: false, rewrite: (p) => p.replace(/^\/api/, "") },
  },
},
```

  Khi dùng proxy, `google_redirect_uri` phải trỏ qua proxy (`http://localhost:5173/api/auth/google/callback`)
  và URI này phải được khai trong Google Console.
