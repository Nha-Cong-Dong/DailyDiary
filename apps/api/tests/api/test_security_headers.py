import pytest
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from app.core.security import SecurityHeadersMiddleware

pytestmark = pytest.mark.anyio


async def test_every_response_has_security_headers_even_errors(anon):
    for path in ("/health", "/me"):  # 200 và 401
        r = await anon.get(path)
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
        # Local/test chạy HTTP: không gửi HSTS (trình duyệt sẽ nhớ và ép HTTPS cho localhost).
        assert "strict-transport-security" not in r.headers


def _client(hsts: bool) -> AsyncClient:
    async def page(request):
        return PlainTextResponse("ok", headers={"Referrer-Policy": "no-referrer"})

    app = SecurityHeadersMiddleware(Starlette(routes=[Route("/", page)]), hsts=hsts)
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def test_hsts_only_when_enabled_and_route_headers_win():
    async with _client(hsts=True) as client:
        r = await client.get("/")
    assert r.headers["strict-transport-security"] == "max-age=31536000; includeSubDomains"
    # Route tự đặt (trang chia sẻ công khai) thì giữ nguyên, không bị ghi đè.
    assert r.headers["referrer-policy"] == "no-referrer"
    async with _client(hsts=False) as client:
        assert "strict-transport-security" not in (await client.get("/")).headers
