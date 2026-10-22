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

Dùng MongoDB thật trong compose, database riêng `dailydiary_test`. Không dùng mongomock, vì validator
`$jsonSchema`, index unique, TTL và toán tử cập nhật (`$setOnInsert`, `$pull`...) hoạt động khác hoặc không có.

Cô lập: đầu phiên test xóa DB test và chạy toàn bộ migration (kiểm tra luôn migration); sau mỗi test xóa document
ở mọi collection nhưng giữ validator và index. Không dùng transaction để rollback, vì MongoDB standalone không hỗ trợ.

## `tests/conftest.py`

```python
import os

os.environ.setdefault("ENV", "test")
os.environ.setdefault("COOKIE_SECURE", "false")  # đặt trước khi import app

import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import CSRF_COOKIE, SESSION_COOKIE, _hash
from app.core.storage import get_s3
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
    # Chốt an toàn: fixture này XÓA SẠCH database. Chỉ cho chạy trên DB có tên kết thúc bằng "_test".
    if not settings.mongodb_test_db.endswith("_test"):
        pytest.exit(f"MONGODB_TEST_DB phải có tên '*_test' (đang là '{settings.mongodb_test_db}')", returncode=2)
    client = make_client(settings.mongodb_uri)
    await client.drop_database(settings.mongodb_test_db)
    await run_migrations(client[settings.mongodb_test_db])
    yield client
    await client.close()


@pytest.fixture
async def db(mongo):
    database = mongo[settings.mongodb_test_db]
    yield database
    for name in c.ALL:
        await database[name].delete_many({})


@pytest.fixture
def fake_s3():
    from tests.fakes import FakeStorage

    return FakeStorage()


@pytest.fixture
def app(db, fake_s3):
    app = create_app()
    # ASGITransport không chạy lifespan → app.state.db/s3 không tồn tại; phải override.
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_s3] = lambda: fake_s3
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
    """Factory: tạo user + phiên thật trong DB, trả client đã đăng nhập (có cookie và CSRF)."""

    async def _make(email: str) -> AsyncClient:
        now = datetime.now(UTC)
        user = {
            "_id": uuid4(),
            "google_sub": f"sub-{email}",
            "email": email,
            "display_name": email.split("@")[0],
            "avatar_url": None,
            "timezone": "Asia/Ho_Chi_Minh",
            "account_tier": "beta",
            "joined_at": now,
            "deleted_at": None,
        }
        await db[c.USERS].insert_one(user)
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        await db[c.USER_SESSIONS].insert_one(
            {"_id": _hash(token), "user_id": user["_id"], "created_at": now, "expires_at": now + timedelta(days=1)}
        )
        client = AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            cookies={SESSION_COOKIE: token, CSRF_COOKIE: csrf},
            headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        )
        client.user = user  # tiện cho assert
        return client

    return _make  # ASGITransport không mở socket, không cần đóng client


@pytest.fixture
async def alice(make_client):
    return await make_client("alice@example.com")


@pytest.fixture
async def bob(make_client):
    return await make_client("bob@example.com")
```

Không có `pytestmark` toàn cục: đánh dấu từng file bằng `pytestmark = pytest.mark.anyio` ở đầu file test.
Fixture async scope session (`mongo`) chạy được vì `anyio_backend` cũng có scope session.

Thư mục test theo `docs/Project_Structure.md`: `tests/unit/` (không cần DB), `tests/db/` (migration, index,
validator), `tests/api/` (`test_<router>.py`).

## Mẫu test

```python
import pytest

pytestmark = pytest.mark.anyio


async def test_get_entry_requires_login(anon):
    r = await anon.get("/entries/2026-10-16")
    assert r.status_code == 401


async def test_bob_cannot_read_alice_entry(alice, bob):
    await alice.put("/entries/2026-10-16", json={"score": 4})
    r = await bob.get("/entries/2026-10-16")
    assert r.status_code == 404  # không lộ là bài có tồn tại


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
docker compose up -d mongo
cd apps/api && uv run pytest -q   # dùng MONGODB_TEST_DB=dailydiary_test
```
