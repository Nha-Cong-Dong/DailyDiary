from datetime import UTC, datetime, timedelta

import pytest
from fastapi.responses import RedirectResponse
from httpx import ASGITransport, AsyncClient
from limits import parse_many

from app.core import config
from app.core.limits import rate_limit
from app.core.oauth import oauth
from app.core.rate_limit import limiter
from app.core.security import CSRF_COOKIE, SESSION_COOKIE, hash_token
from app.db import collections as c
from app.db.client import get_db
from app.main import create_app

pytestmark = pytest.mark.anyio


@pytest.fixture
def google(monkeypatch):
    """Giả lập Google: có client id/secret, không gọi mạng, token trả userinfo sửa được trong test."""
    monkeypatch.setattr(config.settings, "google_client_id", "test-id")
    monkeypatch.setattr(config.settings, "google_client_secret", "test-secret")

    async def fake_redirect(request, redirect_uri):
        return RedirectResponse("https://accounts.google.com/o/oauth2/auth?fake=1", status_code=302)

    monkeypatch.setattr(oauth.google, "authorize_redirect", fake_redirect)
    userinfo = {"sub": "g-123", "email": "c@example.com", "email_verified": True, "name": "  Chi   Lê  "}

    async def fake_token(request):
        return {"userinfo": dict(userinfo)}

    monkeypatch.setattr(oauth.google, "authorize_access_token", fake_token)
    return userinfo


async def _login(client: AsyncClient, tz: str | None = None):
    await client.get("/auth/google/login", params={"tz": tz} if tz else None)
    return await client.get("/auth/google/callback", params={"code": "x", "state": "y"})


async def test_login_without_google_keys_redirects_with_error(anon, monkeypatch):
    monkeypatch.setattr(config.settings, "google_client_id", None)
    r = await anon.get("/auth/google/login")
    assert r.status_code == 303
    assert r.headers["location"].endswith("/login?error=not_configured")


async def test_callback_creates_user_sets_cookies_and_sends_new_user_to_onboarding(anon, db, google):
    r = await _login(anon, tz="America/Los_Angeles")
    assert r.status_code == 303
    assert r.headers["location"].endswith("/onboarding")
    assert SESSION_COOKIE in r.cookies and CSRF_COOKIE in r.cookies
    set_cookie = " ".join(r.headers.get_list("set-cookie")).lower()
    assert "httponly" in set_cookie and "samesite=lax" in set_cookie

    user = await db[c.USERS].find_one({"google_sub": "g-123"})
    assert user["display_name"] == "Chi Lê"  # NFC, gộp khoảng trắng
    assert user["timezone"] == "America/Los_Angeles"
    assert user["icon_set_id"] == "sprout"
    assert user["onboarded_at"] is None
    session = await db[c.USER_SESSIONS].find_one({"user_id": user["_id"]})
    assert session["_id"] == hash_token(r.cookies[SESSION_COOKIE])  # DB chỉ lưu hash


async def test_returning_user_keeps_own_timezone_and_goes_to_today_after_onboarding(anon, db, google):
    await _login(anon, tz="America/Los_Angeles")
    await db[c.USERS].update_one({"google_sub": "g-123"}, {"$set": {"onboarded_at": datetime.now(UTC)}})
    r = await _login(anon, tz="Asia/Tokyo")
    assert r.headers["location"].endswith("/today")
    user = await db[c.USERS].find_one({"google_sub": "g-123"})
    assert user["timezone"] == "America/Los_Angeles"  # múi giờ lúc đăng nhập chỉ dùng cho người mới


async def test_bad_timezone_from_browser_falls_back_to_default(anon, db, google):
    await _login(anon, tz="../etc/passwd")
    user = await db[c.USERS].find_one({"google_sub": "g-123"})
    assert user["timezone"] == "Asia/Ho_Chi_Minh"


async def test_unverified_email_is_rejected(anon, db, google):
    google["email_verified"] = False
    r = await _login(anon)
    assert r.headers["location"].endswith("/login?error=email_unverified")
    assert await db[c.USERS].count_documents({}) == 0


async def test_account_pending_deletion_cannot_log_in(anon, db, google):
    await _login(anon)
    await db[c.USERS].update_one({"google_sub": "g-123"}, {"$set": {"deleted_at": datetime.now(UTC)}})
    await db[c.USER_SESSIONS].delete_many({})
    r = await _login(anon)
    assert r.headers["location"].endswith("/login?error=account_deleted")
    assert await db[c.USER_SESSIONS].count_documents({}) == 0


async def test_expired_session_is_401(make_client):
    client = await make_client("old@example.com", expires_in=timedelta(seconds=-1))
    r = await client.get("/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "AUTH_REQUIRED"


async def test_logout_revokes_session(alice):
    assert (await alice.get("/me")).status_code == 200
    r = await alice.post("/auth/logout")
    assert r.status_code == 204
    alice.cookies.set(SESSION_COOKIE, alice.token)  # dùng lại cookie cũ sau khi đăng xuất
    assert (await alice.get("/me")).status_code == 401


async def test_write_without_csrf_header_is_403(alice):
    r = await alice.patch("/me", json={"display_name": "A"}, headers={"X-CSRF-Token": "sai"})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "CSRF_FAILED"


async def test_write_from_other_origin_is_403(alice):
    r = await alice.patch("/me", json={"display_name": "A"}, headers={"Origin": "https://evil.example"})
    assert r.status_code == 403


async def test_write_without_session_is_401_not_403(anon):
    r = await anon.patch("/me", json={"display_name": "A"})
    assert r.status_code == 401


async def test_sliding_refresh_extends_session_and_cookies(make_client, db):
    client = await make_client("slide@example.com", expires_in=timedelta(days=2))
    r = await client.get("/me")
    assert r.status_code == 200
    assert SESSION_COOKIE in r.cookies and CSRF_COOKIE in r.cookies
    session = await db[c.USER_SESSIONS].find_one({"_id": hash_token(client.token)})
    assert session["expires_at"] - datetime.now(UTC) > timedelta(days=29)


async def test_fresh_session_is_not_refreshed(alice):
    r = await alice.get("/me")
    assert SESSION_COOKIE not in r.cookies


async def test_login_is_rate_limited_per_ip(anon, google):
    limiter.enabled = True
    limiter.reset()
    try:
        codes = [(await anon.get("/auth/google/login")).status_code for _ in range(6)]
    finally:
        limiter.reset()
        limiter.enabled = False
    assert codes[:5] == [302] * 5
    assert codes[5] == 429


async def test_logout_is_rate_limited_per_ip(anon):
    """Đăng xuất không cần đăng nhập mà vẫn ghi DB: giới hạn theo IP (ip_rate_limits.logout)."""
    allowed = parse_many(rate_limit("logout"))[0].amount
    limiter.enabled = True
    limiter.reset()
    try:
        codes = [(await anon.post("/auth/logout")).status_code for _ in range(allowed + 1)]
    finally:
        limiter.reset()
        limiter.enabled = False
    assert codes[:allowed] == [204] * allowed
    assert codes[allowed] == 429


# --- Đăng nhập thử (chỉ local/test) ---


def _client_for(app):
    return AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test", headers={"Origin": "http://localhost:5173"}
    )


async def test_dev_login_works_in_test_env_when_enabled(db, monkeypatch):
    monkeypatch.setattr(config.settings, "dev_login", True)
    monkeypatch.setattr(config.settings, "env", "test")
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    limiter.enabled = False
    try:
        async with _client_for(app) as client:
            r = await client.post("/auth/dev-login", json={"email": "dev@example.com", "display_name": "Dev"})
            assert r.status_code == 200
            assert r.json()["next"] == "/onboarding"
            assert (await client.get("/me")).json()["display_name"] == "Dev"
    finally:
        limiter.enabled = True
    assert "/auth/dev-login" not in app.openapi()["paths"]  # không lọt vào openapi.json


async def test_dev_login_absent_when_flag_off(db, monkeypatch):
    monkeypatch.setattr(config.settings, "dev_login", False)
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    async with _client_for(app) as client:
        assert (await client.post("/auth/dev-login")).status_code == 404


async def test_dev_login_refuses_to_start_in_production(monkeypatch):
    monkeypatch.setattr(config.settings, "dev_login", True)
    monkeypatch.setattr(config.settings, "env", "production")
    monkeypatch.setattr(config.settings, "session_secret", "x" * 48)
    with pytest.raises(RuntimeError, match="DEV_LOGIN"):
        create_app()


async def test_production_requires_session_secret(monkeypatch):
    monkeypatch.setattr(config.settings, "dev_login", False)
    monkeypatch.setattr(config.settings, "env", "production")
    monkeypatch.setattr(config.settings, "session_secret", None)
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        create_app()


async def test_login_can_return_to_profile_only(anon, db, google):
    """Đăng nhập lại để xác nhận xóa tài khoản rồi quay về Hồ sơ; `next` khác danh sách bị bỏ qua."""
    await _login(anon)
    await db[c.USERS].update_one({"google_sub": "g-123"}, {"$set": {"onboarded_at": datetime.now(UTC)}})
    await anon.get("/auth/google/login", params={"next": "/profile"})
    r = await anon.get("/auth/google/callback", params={"code": "x", "state": "y"})
    assert r.headers["location"].endswith("/profile")
    for bad in ("https://evil.example", "//evil.example", "/today/../admin", "/profile?x=1"):
        await anon.get("/auth/google/login", params={"next": bad})
        r = await anon.get("/auth/google/callback", params={"code": "x", "state": "y"})
        assert r.headers["location"].endswith("/today"), bad


async def test_new_user_goes_to_onboarding_even_with_next(anon, google):
    await anon.get("/auth/google/login", params={"next": "/profile"})
    r = await anon.get("/auth/google/callback", params={"code": "x", "state": "y"})
    assert r.headers["location"].endswith("/onboarding")
