import os

os.environ.setdefault("ENV", "test")
os.environ.setdefault("COOKIE_SECURE", "false")

import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import CSRF_COOKIE, SESSION_COOKIE, hash_token
from app.db import collections as c
from app.db.client import get_db
from app.db.client import make_client as make_mongo_client
from app.db.migrate import run_migrations
from app.main import create_app

ORIGIN = settings.frontend_origins[0]


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def mongo():
    """DB test được xóa và dựng lại từ migration ở đầu mỗi phiên test (kiểm tra luôn migration)."""
    # Chốt an toàn: fixture này XÓA SẠCH database. Chỉ cho chạy trên DB có tên kết thúc bằng "_test".
    if not settings.mongodb_test_db.endswith("_test"):
        pytest.exit(
            f"MONGODB_TEST_DB phải có tên '*_test' (đang là '{settings.mongodb_test_db}')", returncode=2
        )
    client = make_mongo_client(settings.mongodb_uri)
    await client.drop_database(settings.mongodb_test_db)
    await run_migrations(client[settings.mongodb_test_db])
    yield client
    await client.close()


@pytest.fixture
async def db(mongo):
    """Mỗi test dùng DB sạch: xóa document sau test, giữ lại collection, validator và index."""
    database = mongo[settings.mongodb_test_db]
    yield database
    for name in c.ALL:
        await database[name].delete_many({})


@pytest.fixture
def app(db):
    # ASGITransport không chạy lifespan → không có app.state.db; phải override get_db.
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    limiter.enabled = False
    yield app
    app.dependency_overrides.clear()
    limiter.enabled = True


@pytest.fixture
async def anon(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test", headers={"Origin": ORIGIN}
    ) as client:
        yield client


@pytest.fixture
def make_client(app, db):
    """Tạo user + phiên thật trong DB, trả client đã đăng nhập (cookie phiên, CSRF, Origin)."""

    async def _make(email: str, *, expires_in: timedelta = timedelta(days=29), **user_fields) -> AsyncClient:
        now = datetime.now(UTC)
        user = {
            "_id": uuid4(),
            "google_sub": f"sub-{email}",
            "email": email,
            "display_name": email.split("@")[0],
            "avatar_url": None,
            "timezone": "Asia/Ho_Chi_Minh",
            "icon_set_id": "sprout",
            "account_tier": "beta",
            "joined_at": now,
            "onboarded_at": now,
            "deleted_at": None,
            **user_fields,
        }
        await db[c.USERS].insert_one(user)
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        await db[c.USER_SESSIONS].insert_one(
            {
                "_id": hash_token(token),
                "user_id": user["_id"],
                "created_at": now,
                "expires_at": now + expires_in,
            }
        )
        client = AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            cookies={SESSION_COOKIE: token, CSRF_COOKIE: csrf},
            headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        )
        client.user = user
        client.token = token
        return client

    return _make


@pytest.fixture
async def alice(make_client):
    return await make_client("alice@example.com")


@pytest.fixture
async def bob(make_client):
    return await make_client("bob@example.com")
