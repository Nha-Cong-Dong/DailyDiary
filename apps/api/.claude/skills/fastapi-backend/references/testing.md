# Test với pytest + httpx AsyncClient

## Cài đặt

```
pytest
httpx
anyio            # có sẵn plugin pytest; FastAPI dùng nó trong tài liệu testing
```

Chọn **một** cơ chế async: ở đây dùng `anyio` (marker `@pytest.mark.anyio`). Không cài thêm pytest-asyncio
để chạy chung, vì hai plugin cùng quản lý event loop sẽ gây lỗi khó hiểu. pytest-asyncio 1.x cũng đã bỏ
fixture `event_loop`, nên ví dụ cũ trên mạng không còn dùng được.

`pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
addopts = "-ra --strict-markers"
markers = ["integration: cần MinIO thật"]
```

## DB test

Dùng PostgreSQL thật trong compose, database riêng `dailydiary_test`. Không dùng SQLite, vì
`on_conflict_do_update`, `unaccent`, `timestamptz` và `RETURNING` hoạt động khác.

## `tests/conftest.py`

```python
import os

os.environ.setdefault("COOKIE_SECURE", "false")   # đặt trước khi import app

import secrets
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.db import get_db
from app.core.rate_limit import limiter
from app.core.security import CSRF_COOKIE, SESSION_COOKIE, _hash
from app.core.storage import get_s3
from app.main import create_app
from app.models import Base, User, UserSession

ORIGIN = settings.frontend_origins[0]


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def engine():
    eng = create_async_engine(settings.test_database_url, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        # Muốn kiểm tra migration thay vì create_all:
        #   from alembic.config import Config; from alembic import command
        #   cfg = Config("alembic.ini")
        #   def upgrade(sync_conn): cfg.attributes["connection"] = sync_conn; command.upgrade(cfg, "head")
        #   await conn.run_sync(upgrade)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db(engine):
    """Mỗi test nằm trong một transaction ngoài; service commit() chỉ đóng savepoint; cuối test rollback hết."""
    async with engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()


@pytest.fixture
def fake_s3():
    from tests.fakes import FakeStorage
    return FakeStorage()


@pytest.fixture
def app(db, fake_s3):
    app = create_app()

    async def _get_db():
        yield db

    # ASGITransport không chạy lifespan → app.state.sessionmaker/s3 không tồn tại; phải override.
    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_s3] = lambda: fake_s3
    limiter.enabled = False
    yield app
    app.dependency_overrides.clear()
    limiter.enabled = True


@pytest.fixture
async def anon(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test",
                           headers={"Origin": ORIGIN}) as c:
        yield c


@pytest.fixture
def make_client(app, db):
    """Factory: tạo user + phiên thật trong DB, trả client đã đăng nhập (có cookie và CSRF)."""
    async def _make(email: str) -> AsyncClient:
        user = User(google_sub=f"sub-{email}", email=email, display_name=email.split("@")[0],
                    timezone="Asia/Ho_Chi_Minh", account_tier="beta")
        db.add(user)
        await db.flush()
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        db.add(UserSession(token_hash=_hash(token), user_id=user.id,
                           expires_at=datetime.now(UTC) + timedelta(days=1)))
        await db.commit()
        c = AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            cookies={SESSION_COOKIE: token, CSRF_COOKIE: csrf},
            headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        )
        c.user = user  # tiện cho assert
        return c

    return _make  # ASGITransport không mở socket, không cần đóng client


@pytest.fixture
async def alice(make_client):
    return await make_client("alice@example.com")


@pytest.fixture
async def bob(make_client):
    return await make_client("bob@example.com")
```

Không có `pytestmark` toàn cục: đánh dấu từng file bằng `pytestmark = pytest.mark.anyio` ở đầu file test.
Fixture async scope session (`engine`) chạy được vì `anyio_backend` cũng có scope session.

## Mẫu test

```python
import pytest

pytestmark = pytest.mark.anyio


async def test_get_entry_requires_login(anon):
    r = await anon.get("/entries/2026-10-16")
    assert r.status_code == 401


async def test_bob_cannot_read_alice_entry(alice, bob):
    await alice.put("/entries/2026-10-16", json={"score": 4, "icon_set_id": "default"})
    r = await bob.get("/entries/2026-10-16")
    assert r.status_code == 404          # không lộ là bài có tồn tại


async def test_write_without_session_is_401_not_403(anon):
    r = await anon.put("/entries/2026-10-16", json={"score": 4})
    assert r.status_code == 401


async def test_write_without_csrf_header_is_rejected(alice):
    r = await alice.put("/entries/2026-10-16", json={"score": 4}, headers={"X-CSRF-Token": "sai"})
    assert r.status_code == 403
```

## Mock Google OAuth

```python
from app.core.oauth import oauth


async def test_google_callback_creates_user_and_sets_cookie(anon, monkeypatch, db):
    async def fake_token(request):
        return {"userinfo": {"sub": "g-123", "email": "c@example.com", "email_verified": True, "name": "C"}}

    monkeypatch.setattr(oauth.google, "authorize_access_token", fake_token)
    r = await anon.get("/auth/google/callback?code=x&state=y", follow_redirects=False)

    assert r.status_code == 303
    set_cookie = r.headers.get_list("set-cookie")
    assert any(h.startswith("dd_session=") and "HttpOnly" in h for h in set_cookie)
```

## `tests/fakes.py` (S3 giả)

```python
class _Client:
    def __init__(self):
        self.objects: dict[str, bytes] = {}

    def head_object(self, Bucket, Key):
        from botocore.exceptions import ClientError
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")
        return {"ContentLength": len(self.objects[Key])}

    def get_object(self, Bucket, Key, Range=None):
        import io
        return {"Body": io.BytesIO(self.objects[Key][:16])}

    def delete_objects(self, Bucket, Delete):
        for o in Delete["Objects"]:
            self.objects.pop(o["Key"], None)


class _Presign:
    def generate_presigned_url(self, op, Params, ExpiresIn, HttpMethod=None):
        return f"http://s3.test/{Params['Key']}?op={op}"


class FakeStorage:
    def __init__(self):
        self.client, self.presign, self.bucket = _Client(), _Presign(), "test"
```

Test xác nhận ảnh: đặt `fake_s3.client.objects[key] = b"RIFF\x00\x00\x00\x00WEBP..."` rồi gọi endpoint.

## Chạy

```bash
docker compose up -d postgres
TEST_DATABASE_URL=postgresql+asyncpg://dd:dd@localhost:5432/dailydiary_test pytest -q
```
