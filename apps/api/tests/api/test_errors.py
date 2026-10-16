import logging

import pytest
from fastapi import APIRouter, Request

from app.core.errors import ApiError
from app.core.rate_limit import limiter

pytestmark = pytest.mark.anyio

router = APIRouter(prefix="/_test")


@router.get("/api-error")
async def raise_api_error():
    raise ApiError(409, "ENTRY_CONFLICT", "Bài đã được sửa ở nơi khác")


@router.get("/items/{n}")
async def typed_param(n: int):
    return {"n": n}


SECRET = "nội dung nhật ký bí mật"


@router.get("/boom")
async def boom():
    # Dữ liệu người dùng lọt vào thông điệp exception (vd. IntegrityError) — không được xuất hiện trong log.
    raise RuntimeError(SECRET)


@router.get("/limited")
@limiter.limit("1/minute")
async def limited(request: Request):
    return {"ok": True}


@pytest.fixture
def test_app(app):
    app.include_router(router)
    return app


async def test_api_error_uses_project_shape(anon, test_app):
    r = await anon.get("/_test/api-error")
    assert r.status_code == 409
    assert r.json() == {"error": {"code": "ENTRY_CONFLICT", "message": "Bài đã được sửa ở nơi khác"}}


async def test_unknown_route_is_404_in_project_shape(anon):
    r = await anon.get("/khong-ton-tai")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


async def test_validation_error_is_422_without_echoing_input(anon, test_app):
    r = await anon.get("/_test/items/abc-bi-mat")
    assert r.status_code == 422
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "abc-bi-mat" not in r.text


async def test_unhandled_error_is_500_with_cors_and_no_leak(anon, test_app, caplog):
    caplog.set_level(logging.INFO, logger="dailydiary.request")
    r = await anon.get("/_test/boom")
    assert r.status_code == 500
    assert r.json()["error"]["code"] == "INTERNAL_ERROR"
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "bí mật" not in r.text
    assert "bí mật" not in caplog.text
    assert "RuntimeError" in caplog.text


async def test_rate_limit_returns_429_in_project_shape(anon, test_app):
    limiter.enabled = True
    limiter.reset()
    assert (await anon.get("/_test/limited")).status_code == 200
    r = await anon.get("/_test/limited")
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "RATE_LIMITED"
    assert int(r.headers["Retry-After"]) > 0
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


async def test_request_log_has_no_query_string_or_body(anon, caplog):
    caplog.set_level(logging.INFO, logger="dailydiary.request")
    await anon.post("/health?q=da+lat", content=b'{"content": "nhat ky rieng tu"}')
    line = next(rec.getMessage() for rec in caplog.records if rec.name == "dailydiary.request")
    assert "/health" in line
    assert "da+lat" not in line and "da lat" not in line
    assert "nhat ky" not in caplog.text


async def test_uvicorn_access_log_is_disabled(app):
    # app fixture đã gọi create_app() → configure_logging()
    assert logging.getLogger("uvicorn.access").disabled
