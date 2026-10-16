# Google OAuth bằng Authlib, cookie phiên HttpOnly, CSRF

## Tổng quan hai cookie

| Cookie | Ai đặt | Nội dung | Thuộc tính | Sống |
| --- | --- | --- | --- | --- |
| `dd_oauth` | `SessionMiddleware` (Starlette) | `state`, `nonce` của Authlib, `tz`; ký bằng itsdangerous | HttpOnly, Lax | 10 phút |
| `dd_session` | callback của mình | token ngẫu nhiên; DB lưu SHA-256 | HttpOnly, Secure, Lax | `session_ttl_days` |
| `dd_csrf` | callback của mình | token ngẫu nhiên | **không** HttpOnly (JS đọc), Secure, Lax | như `dd_session` |

Không lưu thông tin đăng nhập trong `request.session`. Cookie `dd_oauth` chỉ được ký, không được
mã hóa, nên client đọc được nội dung, và phiên lưu trong đó không thu hồi được.

## `app/core/oauth.py`

```python
from authlib.integrations.starlette_client import OAuth

from app.core.config import settings

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
```

## Collection `user_sessions` (đặc tả mục 5.4)

```
{ _id: <SHA-256 của token, 32 byte>, user_id: <uuid>, created_at: <date>, expires_at: <date> }
```

- Index `ix_user_id` để thu hồi mọi phiên của một người (đăng xuất mọi nơi, `DELETE /me`).
- TTL index trên `expires_at` (`expireAfterSeconds=0`): MongoDB tự xóa phiên hết hạn. TTL chạy nền khoảng mỗi
  60 giây nên code **vẫn phải** kiểm tra `expires_at > now`.
- Không có khóa ngoại: `DELETE /me` phải tự `delete_many({"user_id": ...})` (xem `mongodb.md` mục 8).

## `app/core/security.py`

```python
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Cookie, Depends, Request, Response
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.core.errors import ApiError  # helper lỗi chuẩn của dự án (định dạng: api-conventions)
from app.db import collections as c
from app.db.client import Db
from app.schemas.users import User  # schema Pydantic của người dùng hiện tại

SESSION_COOKIE = "dd_session"
CSRF_COOKIE = "dd_csrf"
CSRF_HEADER = "x-csrf-token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _hash(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def _cookie_kwargs(httponly: bool) -> dict:
    return {
        "httponly": httponly,
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
        "domain": settings.cookie_domain,
    }


async def create_session(db: AsyncDatabase, response: Response, user_id) -> None:
    token = secrets.token_urlsafe(32)
    max_age = settings.session_ttl_days * 86400
    now = datetime.now(UTC)
    await db[c.USER_SESSIONS].insert_one(
        {
            "_id": _hash(token),
            "user_id": user_id,
            "created_at": now,
            "expires_at": now + timedelta(seconds=max_age),
        }
    )
    response.set_cookie(SESSION_COOKIE, token, max_age=max_age, **_cookie_kwargs(httponly=True))
    response.set_cookie(
        CSRF_COOKIE, secrets.token_urlsafe(32), max_age=max_age, **_cookie_kwargs(httponly=False)
    )


async def destroy_session(db: AsyncDatabase, response: Response, token: str | None) -> None:
    if token:
        await db[c.USER_SESSIONS].delete_one({"_id": _hash(token)})
    # delete_cookie phải truyền đúng path/domain/samesite/secure như lúc set, nếu không trình duyệt giữ cookie lại.
    for name, http_only in ((SESSION_COOKIE, True), (CSRF_COOKIE, False)):
        response.delete_cookie(name, **_cookie_kwargs(httponly=http_only))


async def get_current_user(
    request: Request,
    db: Db,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> User:
    if not token:
        raise ApiError(401, "AUTH_REQUIRED", "Bạn cần đăng nhập")
    now = datetime.now(UTC)
    session = await db[c.USER_SESSIONS].find_one({"_id": _hash(token), "expires_at": {"$gt": now}})
    if session is None:
        raise ApiError(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn")
    doc = await db[c.USERS].find_one({"_id": session["user_id"], "deleted_at": None})
    if doc is None:
        raise ApiError(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn")
    request.state.user_id = str(doc["_id"])  # key_func của rate limit đọc giá trị này
    return User.from_doc(doc)


CurrentUser = Annotated[User, Depends(get_current_user)]


async def verify_csrf(request: Request) -> None:
    """Gắn ở cấp app. Chỉ kiểm tra request ghi có kèm cookie phiên."""
    if request.method in SAFE_METHODS:
        return
    if SESSION_COOKIE not in request.cookies:
        # Không có cookie phiên thì không có gì để CSRF lợi dụng; để get_current_user trả 401.
        # Nếu không, phiên hết hạn (dd_session và dd_csrf cùng hết hạn) sẽ ra 403 thay vì 401,
        # và frontend sẽ không chuyển về trang đăng nhập.
        return
    origin = request.headers.get("origin")
    if origin not in settings.frontend_origins:
        raise ApiError(403, "CSRF_FAILED", "Yêu cầu không hợp lệ")
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise ApiError(403, "CSRF_FAILED", "Yêu cầu không hợp lệ")
```

Frontend đọc `dd_csrf` từ `document.cookie` và gửi lại qua header `X-CSRF-Token` trong mọi request ghi.
Cookie không phân biệt cổng, nên khi chạy local, JS ở `localhost:5173` đọc được cookie do `localhost:8000`
đặt. Trên production, đặt `cookie_domain=".dailydiary.xxx"` để `app.` đọc được cookie do `api.` đặt.

## `app/routers/auth.py`

```python
from urllib.parse import urlencode
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from authlib.integrations.starlette_client import OAuthError
from fastapi import APIRouter, Cookie, Request, Response
from fastapi.responses import RedirectResponse
from slowapi.util import get_remote_address

from app.core.config import settings
from app.db.client import Db
from app.core.limits import rate_limit  # đọc từ shared/limits.json
from app.core.oauth import oauth
from app.core.rate_limit import limiter
from app.core.security import SESSION_COOKIE, create_session, destroy_session
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _front(path: str = "/", **query) -> RedirectResponse:
    url = settings.frontend_url + path + (f"?{urlencode(query)}" if query else "")
    return RedirectResponse(url, status_code=303)


@router.get("/google/login")
@limiter.limit(rate_limit("login"), key_func=get_remote_address)
async def google_login(request: Request, tz: str | None = None):
    try:
        request.session["tz"] = str(ZoneInfo(tz)) if tz else None
    except (ZoneInfoNotFoundError, ValueError):
        request.session["tz"] = None
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/google/callback")
@limiter.limit(rate_limit("login"), key_func=get_remote_address)
async def google_callback(request: Request, db: Db):
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        return _front("/login", error="oauth")

    info = token.get("userinfo") or {}
    if not info.get("sub") or info.get("email_verified") is not True:
        return _front("/login", error="email_unverified")

    user = await user_service.upsert_google_user(
        db,
        google_sub=info["sub"],
        email=info.get("email"),
        display_name=(info.get("name") or "")[:50],
        avatar_url=info.get("picture"),
        timezone=request.session.pop("tz", None) or "Asia/Ho_Chi_Minh",
    )
    request.session.clear()

    response = _front("/")
    await create_session(db, response, user.id)
    return response


@router.post("/logout", status_code=204)
async def logout(db: Db, response: Response, token: str | None = Cookie(None, alias=SESSION_COOKIE)):
    await destroy_session(db, response, token)
```

Ghi chú:
- Callback **trả redirect** chứ không trả JSON lỗi chuẩn, vì trình duyệt tới đây từ Google chứ không qua `fetch`.
- Gọi `authorize_redirect` với `redirect_uri` lấy từ settings. Giá trị này phải trùng từng ký tự với URI
  khai trong Google Console, và login phải bắt đầu ở cùng host với callback để cookie `dd_oauth` đi theo.
- Trong giai đoạn thử nghiệm, OAuth consent screen để chế độ Testing (xem đặc tả), nên email lạ sẽ bị
  Google chặn trước khi tới callback.

## Upsert user (`services/users.py`)

```python
from datetime import UTC, datetime
from uuid import uuid4

from pymongo import ReturnDocument

from app.db import collections as c


async def upsert_google_user(db, *, google_sub, email, display_name, avatar_url, timezone) -> dict:
    now = datetime.now(UTC)
    return await db[c.USERS].find_one_and_update(
        {"google_sub": google_sub},
        {
            "$set": {"email": email},
            # Chỉ đặt khi tạo mới: người dùng có thể đã tự sửa tên/múi giờ trong /me.
            "$setOnInsert": {
                "_id": uuid4(),
                "display_name": display_name,
                "avatar_url": avatar_url,
                "timezone": timezone,
                "account_tier": "beta",
                "joined_at": now,
                "deleted_at": None,
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
```

Hai request callback cùng lúc cho một người mới có thể cùng upsert: một bên thắng, bên kia nhận
`DuplicateKeyError` trên `uq_google_sub`. Bắt lỗi đó và gọi lại `find_one_and_update` một lần (lúc này sẽ khớp document có sẵn).

Nếu user có `deleted_at` (đang chờ xóa), quyết định rõ: chặn đăng nhập hay khôi phục. Không lặng lẽ cho vào.
