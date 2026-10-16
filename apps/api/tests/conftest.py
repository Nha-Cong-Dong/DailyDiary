import os

os.environ.setdefault("ENV", "test")
os.environ.setdefault("COOKIE_SECURE", "false")

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.rate_limit import limiter
from app.db import collections as c
from app.db.client import get_db, make_client
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
    client = make_client(settings.mongodb_uri)
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
