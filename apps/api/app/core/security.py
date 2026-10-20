"""Phiên đăng nhập bằng cookie HttpOnly + chống CSRF.

Mẫu: skill fastapi-backend, references/auth-google-cookie.md.

- `dd_session`: token ngẫu nhiên; DB chỉ lưu SHA-256 làm _id của user_sessions (thu hồi được ngay).
- `dd_csrf`: token không HttpOnly; frontend gửi lại qua header X-CSRF-Token trong mọi request ghi.
- Phiên sống `session_ttl_days` và tự gia hạn (sliding) khi còn dưới một nửa thời hạn.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import Cookie, Depends, Request, Response
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.core.errors import ApiError
from app.db import collections as c
from app.db.client import Db
from app.schemas.users import User

SESSION_COOKIE = "dd_session"
CSRF_COOKIE = "dd_csrf"
CSRF_HEADER = "x-csrf-token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def hash_token(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def _cookie_kwargs(httponly: bool) -> dict:
    return {
        "httponly": httponly,
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
        "domain": settings.cookie_domain,
    }


def _ttl() -> timedelta:
    return timedelta(days=settings.session_ttl_days)


def _set_cookies(response: Response, token: str, csrf: str) -> None:
    max_age = int(_ttl().total_seconds())
    response.set_cookie(SESSION_COOKIE, token, max_age=max_age, **_cookie_kwargs(httponly=True))
    response.set_cookie(CSRF_COOKIE, csrf, max_age=max_age, **_cookie_kwargs(httponly=False))


async def create_session(db: AsyncDatabase, response: Response, user_id: UUID) -> None:
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    await db[c.USER_SESSIONS].insert_one(
        {"_id": hash_token(token), "user_id": user_id, "created_at": now, "expires_at": now + _ttl()}
    )
    _set_cookies(response, token, secrets.token_urlsafe(32))


async def destroy_session(db: AsyncDatabase, response: Response, token: str | None) -> None:
    if token:
        await db[c.USER_SESSIONS].delete_one({"_id": hash_token(token)})
    # delete_cookie phải truyền đúng path/domain/samesite/secure như lúc set,
    # nếu không trình duyệt giữ cookie lại.
    for name, http_only in ((SESSION_COOKIE, True), (CSRF_COOKIE, False)):
        response.delete_cookie(name, **_cookie_kwargs(httponly=http_only))


async def get_current_user(
    request: Request,
    response: Response,
    db: Db,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> User:
    if not token:
        raise ApiError(401, "AUTH_REQUIRED", "Bạn cần đăng nhập")
    now = datetime.now(UTC)
    # TTL index dọn phiên hết hạn trễ tới ~60 giây, nên vẫn kiểm tra expires_at ở đây.
    session = await db[c.USER_SESSIONS].find_one({"_id": hash_token(token), "expires_at": {"$gt": now}})
    if session is None:
        raise ApiError(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn")
    doc = await db[c.USERS].find_one({"_id": session["user_id"], "deleted_at": None})
    if doc is None:
        raise ApiError(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn")

    # Sliding: còn dưới một nửa thời hạn thì gia hạn phiên trong DB và cả hai cookie.
    if session["expires_at"] - now < _ttl() / 2:
        await db[c.USER_SESSIONS].update_one({"_id": session["_id"]}, {"$set": {"expires_at": now + _ttl()}})
        _set_cookies(response, token, request.cookies.get(CSRF_COOKIE) or secrets.token_urlsafe(32))

    request.state.user_id = str(doc["_id"])  # key_func của rate limit đọc giá trị này
    return User.from_doc(doc)


CurrentUser = Annotated[User, Depends(get_current_user)]


async def verify_csrf(request: Request) -> None:
    """Gắn ở cấp app. Chỉ kiểm tra request ghi có kèm cookie phiên."""
    if request.method in SAFE_METHODS:
        return
    if SESSION_COOKIE not in request.cookies:
        # Không có cookie phiên thì không có gì để CSRF lợi dụng; để get_current_user trả 401
        # (không phải 403), nhờ vậy phiên hết hạn đưa frontend về trang đăng nhập.
        return
    if request.headers.get("origin") not in settings.frontend_origins:
        raise ApiError(403, "CSRF_FAILED", "Yêu cầu không hợp lệ")
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise ApiError(403, "CSRF_FAILED", "Yêu cầu không hợp lệ")
