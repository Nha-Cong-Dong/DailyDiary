# Rate limit với slowapi

## `app/core/rate_limit.py`

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings


def user_or_ip(request: Request) -> str:
    # get_current_user đã gán request.state.user_id trước khi limiter kiểm tra,
    # vì FastAPI giải dependency xong mới gọi hàm đã bọc decorator.
    user_id = getattr(request.state, "user_id", None)
    return f"user:{user_id}" if user_id else f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=user_or_ip,
    storage_uri=settings.rate_limit_storage_uri,  # "memory://" | "redis://host:6379/0"
    strategy="moving-window",  # tránh dồn request ở ranh giới phút
    headers_enabled=False,  # True thì mọi endpoint bị limit phải có tham số `response: Response`
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = exc.limit.limit.get_expiry() if exc.limit else 60
    return JSONResponse(
        status_code=429,
        content={"error": {"code": "RATE_LIMITED", "message": "Bạn thao tác quá nhanh, thử lại sau ít phút"}},
        headers={"Retry-After": str(retry_after)},
    )
```

Đăng ký trong `create_app()` (xem `settings-lifespan.md`):

```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
```

Không cần `SlowAPIMiddleware` nếu chỉ dùng decorator theo từng endpoint. Middleware đó chỉ cần
khi dùng `default_limits` cho mọi route.

## Gắn vào endpoint

```python
from fastapi import APIRouter, Request

from app.core.limits import rate_limit  # trả chuỗi kiểu "30/minute" từ shared/limits.json
from app.core.rate_limit import limiter
from app.core.security import CurrentUser

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("/{day}")  # decorator route ở TRÊN
@limiter.limit(rate_limit("read"))  # decorator limit ở DƯỚI
async def read_entry(request: Request, day: date, user: CurrentUser, db: DbSession): ...


@router.post("/{day}/photos/upload-url")
@limiter.limit(rate_limit("photo_upload"))  # ví dụ "10/minute;50/day", nhiều mức cách nhau bằng ';'
async def photo_upload_url(request: Request, day: date, user: CurrentUser, db: DbSession): ...
```

Nếu đặt sai thứ tự decorator, limit sẽ không có tác dụng và cũng không báo lỗi.
Thiếu tham số `request: Request` thì slowapi báo lỗi lúc import.

- Đọc limit lúc chạy thay vì lúc import (để đổi limits.json không cần khởi động lại): `limiter.limit`
  nhận callable, ví dụ `@limiter.limit(lambda: rate_limit("read"))`.
- Limit theo cấp tài khoản (beta/free/premium): callable nhận `key` không đủ thông tin, nên đặt thêm
  `request.state.account_tier` trong `get_current_user` và tách limit theo nhóm endpoint.
- Endpoint không cần limit (healthcheck): `@limiter.exempt`.

## IP thật sau proxy

- `get_remote_address` đọc `request.client.host`. Sau reverse proxy, giá trị này là IP của proxy, nên mọi
  người dùng chung một hạn mức. Cách sửa: chạy uvicorn với `--proxy-headers --forwarded-allow-ips=<IP proxy>`
  để Starlette lấy IP từ `X-Forwarded-For` chỉ khi request đến từ proxy tin cậy.
- Không dùng `slowapi.util.get_ipaddr`: nó đọc `X-Forwarded-For` của mọi request, nên kẻ tấn công tự đặt
  header là vượt được limit đăng nhập.

## Storage

- `memory://`: đếm trong từng process. Chạy `--workers 4` thì hạn mức thực tế thành 4 lần. Chỉ dùng khi local hoặc có một instance.
- Production nhiều instance: `redis://...` (cài `limits[redis]`). Nếu Redis lỗi, slowapi mặc định ném lỗi;
  có thể cân nhắc `swallow_errors=True` để API vẫn chạy khi Redis sập.

## Test

```python
from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def _no_rate_limit():
    limiter.enabled = False
    yield
    limiter.enabled = True


async def test_upload_url_rate_limited(alice):
    limiter.enabled = True
    limiter.reset()
    for _ in range(10):
        await alice.post("/entries/2026-10-16/photos/upload-url", json={...})
    r = await alice.post("/entries/2026-10-16/photos/upload-url", json={...})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in r.headers
```

Lấy số lần (10) từ `core/limits.py` thay vì viết cứng trong test.
