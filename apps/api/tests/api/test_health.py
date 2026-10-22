import pytest

pytestmark = pytest.mark.anyio


async def test_health_ok(anon):
    r = await anon.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "db": "ok"}


async def test_cors_allows_frontend_origin_with_credentials(anon):
    r = await anon.get("/health")
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert r.headers["access-control-allow-credentials"] == "true"


async def test_cors_rejects_unknown_origin(anon):
    r = await anon.get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in r.headers


async def test_health_returns_503_quickly_when_db_is_down(app, anon):
    import time

    from app.db.client import get_db, make_client

    dead = make_client("mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500")
    app.dependency_overrides[get_db] = lambda: dead["x"]
    start = time.perf_counter()
    r = await anon.get("/health")
    await dead.close()
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "DB_UNAVAILABLE"
    assert time.perf_counter() - start < 5
