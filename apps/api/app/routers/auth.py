from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuthError
from fastapi import APIRouter, Cookie, Request, Response
from fastapi.responses import RedirectResponse
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.errors import ApiError
from app.core.limits import rate_limit
from app.core.oauth import google_configured, oauth
from app.core.rate_limit import limiter
from app.core.security import SESSION_COOKIE, create_session, destroy_session
from app.db.client import Db
from app.schemas.users import DevLoginIn, MeOut, valid_timezone
from app.services import users as user_service

router = APIRouter(prefix="/auth", tags=["auth"])
DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"


def _front(path: str = "/", **query: str) -> RedirectResponse:
    url = settings.frontend_url + path + (f"?{urlencode(query)}" if query else "")
    return RedirectResponse(url, status_code=303)


# Đường được phép quay về sau khi đăng nhập (`next`); danh sách cố định.
RETURN_PATHS = frozenset({"/profile"})


def _landing_after_login(onboarded: bool) -> str:
    # Chưa xong 3 bước lần đầu thì vào /onboarding (kể cả khi lần trước bỏ dở), ngược lại vào /today.
    return "/today" if onboarded else "/onboarding"


def _safe_tz(tz: str | None) -> str | None:
    try:
        return valid_timezone(tz) if tz else None
    except ValueError:
        return None


@router.get("/google/login")
@limiter.limit(rate_limit("login"), key_func=get_remote_address)
async def google_login(request: Request, tz: str | None = None, next: str | None = None):
    """Bắt đầu đăng nhập. Frontend mở trang này trực tiếp (không fetch) để cookie dd_oauth đi trọn vòng.

    `next`: chỉ nhận đường trong RETURN_PATHS (đăng nhập lại để xác nhận xóa tài khoản rồi quay về Hồ sơ);
    giá trị khác bị bỏ qua, không bao giờ chuyển hướng tới địa chỉ client tự đặt.
    """
    if not google_configured():
        return _front("/login", error="not_configured")
    # Múi giờ trình duyệt chỉ dùng khi tạo tài khoản mới.
    request.session["tz"] = _safe_tz(tz)
    if next in RETURN_PATHS:
        request.session["next"] = next
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/google/callback")
@limiter.limit(rate_limit("login"), key_func=get_remote_address)
async def google_callback(request: Request, db: Db):
    """Google chuyển về đây; trả redirect (không phải JSON) vì trình duyệt tới từ Google."""
    if not google_configured():
        return _front("/login", error="not_configured")
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        return _front("/login", error="oauth")

    info = token.get("userinfo") or {}  # Authlib đã xác minh id_token
    if not info.get("sub") or info.get("email_verified") is not True or not info.get("email"):
        return _front("/login", error="email_unverified")

    try:
        user = await user_service.upsert_google_user(
            db,
            google_sub=info["sub"],
            email=info["email"],
            display_name=info.get("name"),
            avatar_url=info.get("picture"),
            timezone=request.session.pop("tz", None) or DEFAULT_TIMEZONE,
        )
    except user_service.AccountDeleted:
        request.session.clear()
        return _front("/login", error="account_deleted")
    back = request.session.get("next")
    request.session.clear()

    onboarded = user.onboarded_at is not None
    response = _front(back if back in RETURN_PATHS and onboarded else _landing_after_login(onboarded))
    await create_session(db, response, user.id)
    return response


@router.post("/logout", status_code=204)
# Không cần đăng nhập mà mỗi lần gọi đều ghi DB: giới hạn theo IP như đăng nhập, nới hơn vì mạng chung
# (trường, công ty) có nhiều người cùng IP.
@limiter.limit(rate_limit("logout"), key_func=get_remote_address)
async def logout(
    request: Request, db: Db, response: Response, token: str | None = Cookie(None, alias=SESSION_COOKIE)
) -> None:
    await destroy_session(db, response, token)


# Đăng nhập thử không cần Google: chỉ đăng ký khi env là local/test VÀ bật DEV_LOGIN (xem main.create_app).
dev_router = APIRouter(prefix="/auth", tags=["auth"], include_in_schema=False)


@dev_router.post("/dev-login")
# Không rate limit: route chỉ có ở local/test, e2e đăng nhập thử nhiều lần mỗi phút.
async def dev_login(request: Request, response: Response, db: Db, body: DevLoginIn | None = None) -> dict:
    body = body or DevLoginIn()
    try:
        user = await user_service.upsert_google_user(
            db,
            google_sub=f"dev:{body.email}",
            email=body.email,
            display_name=body.display_name or body.email.split("@")[0],
            avatar_url=None,
            timezone=DEFAULT_TIMEZONE,
        )
    except user_service.AccountDeleted as exc:
        raise ApiError(403, "ACCOUNT_DELETED", "Tài khoản này đang chờ xóa") from exc
    await create_session(db, response, user.id)
    return {
        "next": _landing_after_login(user.onboarded_at is not None),
        "me": MeOut.from_user(user).model_dump(),
    }
