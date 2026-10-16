---
name: fastapi-backend
description: Mẫu code chuẩn cho backend FastAPI của DailyDiary (apps/api), gồm lifespan và engine async, dependency get_db/get_current_user, AsyncSession của SQLAlchemy 2 + asyncpg, Alembic với async engine, CORS cho Vite localhost:5173, đăng nhập Google bằng Authlib với cookie HttpOnly và chống CSRF, rate limit slowapi, presigned URL S3/MinIO bằng boto3, test pytest + httpx AsyncClient. Dùng mỗi khi tạo hoặc sửa main.py, core/, dependency, model, migration, router auth/photos, conftest.py, hoặc khi gặp lỗi MissingGreenlet, lỗi cookie/CORS, 429, lỗi presigned URL, test không cô lập, kể cả khi người dùng không nói tên thư viện. Dùng cùng skill api-conventions.
---

# FastAPI backend: mẫu code chuẩn

Skill này nói **cách viết** các phần nền của `apps/api`. Quy ước dự án (vai trò thư mục,
định dạng lỗi, mã trạng thái, đọc giới hạn từ `shared/limits.json`, các ca test bắt buộc…)
nằm trong skill **api-conventions**. Đọc skill đó trước; ở đây chỉ dùng lại, không nhắc lại.

Mã nguồn mẫu đầy đủ nằm trong `references/`. Chỉ mở file liên quan tới việc đang làm:

| Đang làm | Đọc |
| --- | --- |
| `core/config.py`, `main.py`, lifespan, CORS, thứ tự middleware | `references/settings-lifespan.md` |
| Engine, `get_db`, model, truy vấn async, eager loading, UPDATE có điều kiện | `references/db-session.md` |
| `alembic/env.py`, tạo/chạy migration | `references/alembic-async.md` |
| `/auth/google/*`, cookie phiên, `get_current_user`, CSRF, đăng xuất | `references/auth-google-cookie.md` |
| `core/rate_limit.py`, gắn limit vào endpoint, handler 429 | `references/rate-limit.md` |
| `/photos/upload-url`, xác nhận ảnh, link xem ảnh, MinIO/R2 | `references/s3-presigned.md` |
| `tests/conftest.py`, fixture DB, client hai người dùng, mock OAuth | `references/testing.md` |

## Vị trí file

```
apps/api/app/
├── main.py            # create_app(), lifespan, middleware, router
├── core/
│   ├── config.py      # Settings (pydantic-settings)
│   ├── db.py          # make_engine(), get_db, DbSession
│   ├── security.py    # cookie phiên, get_current_user, CurrentUser, verify_csrf
│   ├── oauth.py       # đối tượng OAuth của Authlib
│   ├── rate_limit.py  # limiter, key_func, handler 429
│   └── storage.py     # client boto3, get_s3
├── models/            # Base + model; __init__.py import đủ model cho Alembic
└── ...
```

## 1. Settings và lifespan

- Một lớp `Settings(BaseSettings)` đọc biến môi trường và `.env`; tạo một lần, import ở nơi cần.
  Bí mật (`SESSION_SECRET`, khóa OAuth, khóa S3, chuỗi DB) chỉ nằm trong biến môi trường.
- Tài nguyên sống lâu (engine, `async_sessionmaker`, client S3) tạo trong `lifespan` và gắn vào
  `app.state`. Starlette 1.x đã bỏ `on_startup`/`on_shutdown`, nên chỉ dùng `lifespan`.
- Khi tắt app, `await engine.dispose()` để đóng pool.
- Viết `create_app()` thay vì biến `app` toàn cục có sẵn trạng thái, để test tạo app mới cho mỗi lần chạy.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = make_engine(settings)
    app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    app.state.s3 = make_s3_client(settings.s3_endpoint_url)
    app.state.s3_presign = make_s3_client(settings.s3_public_endpoint_url)
    yield
    await engine.dispose()
```

## 2. Session SQLAlchemy async

- Cài `sqlalchemy[asyncio]` (hoặc `sqlalchemy[postgresql-asyncpg]`). Từ bản 2.1, greenlet là extra
  và không được cài mặc định. Thiếu nó, engine async sẽ báo lỗi ngay lần chạy đầu.
- `async_sessionmaker(engine, expire_on_commit=False)`: sau `commit()`, object vẫn đọc được thuộc tính
  để trả response. Nếu để mặc định `True`, việc đọc thuộc tính sẽ kích hoạt lazy load và gây `MissingGreenlet`.
- Mỗi request một session, lấy qua dependency. Không dùng chung một session cho nhiều task
  (`asyncio.gather`) và không lưu session vào biến toàn cục.
- `get_db` chỉ mở và đóng session, **không tự commit**. Service gọi `await db.commit()` ở cuối
  thao tác ghi để lỗi commit (vi phạm UNIQUE, deadlock) quay về đúng request. Session đóng mà chưa
  commit sẽ tự rollback.
- Quan hệ khai báo `lazy="raise"` và nạp bằng `selectinload()` khi cần. Lazy load ngầm trong async
  luôn là lỗi, nên để nó báo lỗi rõ ràng khi chạy dev thay vì `MissingGreenlet` khó hiểu.
- Dùng alias `Annotated` để chữ ký endpoint gọn:

```python
async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessionmaker() as session:
        yield session

DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
```

- Hosting có pooler PgBouncer (Supabase, Neon) ở chế độ transaction: tắt cache prepared statement
  của asyncpg (`prepared_statement_cache_size=0` trên URL, hoặc `prepared_statement_name_func` +
  `NullPool`). Chi tiết trong `references/db-session.md`.

## 3. Alembic với async engine

- Khởi tạo bằng `alembic init -t async alembic`. Chỉ `run_migrations_online` khác bản sync:
  `connection.run_sync(do_run_migrations)`.
- Tạo engine trong `env.py` từ `settings.database_url` với `poolclass=NullPool`. Không ghi URL
  vào `alembic.ini`: lộ bí mật, và dấu `%` trong mật khẩu sẽ làm hỏng configparser.
- `target_metadata = Base.metadata`. `Base` có `naming_convention`, để tên constraint ổn định và
  migration `drop_constraint` sinh ra đúng tên.
- `app/models/__init__.py` phải import mọi model, nếu không autogenerate sẽ coi bảng là đã bị xóa.
- Extension (`unaccent`) tạo trong migration bằng `op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")`.
- Đọc lại mọi file autogenerate trước khi commit, vì nó không nhận ra đổi tên cột/bảng.
- Chạy `alembic upgrade head` ở bước triển khai, **không** chạy trong `lifespan`, vì nhiều worker
  sẽ cùng chạy migration một lúc.

## 4. CORS cho Vite

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,   # local: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)
```

- Có cookie thì phải liệt kê origin cụ thể; `"*"` kết hợp với `allow_credentials=True` sẽ bị trình duyệt từ chối.
  `localhost:5173` và `127.0.0.1:5173` là hai origin khác nhau.
- Thêm CORSMiddleware **sau cùng** để nó là lớp ngoài cùng. Nhờ vậy response 401/429/500 cũng có
  header CORS; thiếu header, frontend chỉ thấy "CORS error" thay vì mã lỗi thật.
- Frontend gọi `fetch(..., { credentials: "include" })`. Có thể thay CORS bằng `server.proxy` của Vite
  (`/api` → `http://localhost:8000`) để giống cấu hình chung tên miền trên production.

## 5. Google OAuth (Authlib) + cookie HttpOnly

Luồng: `/auth/google/login?tz=...` → Google → `/auth/google/callback` → đặt cookie → chuyển hướng về frontend.

- Authlib Starlette lưu `state`/`nonce` của OAuth2 trong `request.session`, nên cần `SessionMiddleware`
  (cần cài `itsdangerous`). Đây là cookie tạm của luồng OAuth, đặt tên riêng (`dd_oauth`), `max_age=600`.
  Cookie này **không phải** phiên đăng nhập.
- Phiên đăng nhập là cookie thứ hai, `dd_session`. Giá trị là token ngẫu nhiên
  (`secrets.token_urlsafe(32)`); DB chỉ lưu SHA-256 của token trong bảng `user_sessions`. Nhờ vậy
  đăng xuất và `DELETE /me` thu hồi phiên được ngay. Bảng này chưa có trong mục 5.4 của đặc tả,
  nên thêm bằng migration.
- Thuộc tính cookie: `httponly=True, secure=settings.cookie_secure, samesite="lax", path="/"`,
  `domain=settings.cookie_domain` (local để `None`). Khi `delete_cookie`, truyền lại đúng `path`/`domain`,
  nếu không trình duyệt sẽ không xóa.
- `redirect_uri` lấy từ settings (khớp với URI đã khai ở Google Console), không dùng
  `request.url_for`, vì sau proxy hàm này trả về `http://` và Google từ chối.
- Trong callback: `token["userinfo"]` đã được Authlib xác minh từ `id_token`. Định danh là
  `userinfo["sub"]` → `google_sub`; từ chối nếu `email_verified` khác `True`. Bắt `OAuthError`
  rồi chuyển hướng về frontend kèm `?error=`.
- Múi giờ trình duyệt: frontend mở `/auth/google/login?tz=Asia/Ho_Chi_Minh`. Backend kiểm tra bằng
  `zoneinfo.ZoneInfo`, lưu vào `request.session`, và chỉ ghi vào `users.timezone` khi tạo user mới.
  Upsert user bằng `insert(...).on_conflict_do_update` của dialect PostgreSQL.
- `get_current_user` đọc cookie, tìm phiên còn hạn, gán `request.state.user_id` (rate limit dùng giá trị này)
  rồi trả `User`.
- CSRF cho request ghi: dependency toàn app kiểm tra `Origin` nằm trong danh sách cho phép **và**
  header `X-CSRF-Token` khớp cookie `dd_csrf` (cookie không HttpOnly, frontend đọc được).
  SameSite=Lax không chặn được subdomain cùng site, nên vẫn cần lớp này. Request không có cookie phiên
  thì bỏ qua kiểm tra CSRF, để phiên hết hạn trả 401 (không phải 403).

Code đầy đủ trong `references/auth-google-cookie.md`.

## 6. Rate limit với slowapi

- Một `Limiter` dùng chung, `key_func` lấy `request.state.user_id` (do `get_current_user` gán),
  nếu không có thì lấy IP. FastAPI giải dependency trước khi gọi hàm đã bọc decorator, nên khi
  limiter kiểm tra thì user đã có.
- Decorator route đặt **trên** `@limiter.limit(...)`. Endpoint bị limit phải có tham số `request: Request`.
- Chuỗi limit lấy từ `core/limits.py`, ví dụ dạng `"10/minute;50/day"` cho upload ảnh.
- Đăng nhập limit theo IP: `@limiter.limit(..., key_func=get_remote_address)`. Sau proxy, chạy uvicorn
  với `--proxy-headers --forwarded-allow-ips=<IP proxy>`. Không dùng `get_ipaddr`, vì nó tin header
  `X-Forwarded-For` do client tự gửi.
- Không đăng ký `_rate_limit_exceeded_handler` mặc định, vì nó trả JSON khác định dạng của dự án.
  Tự viết handler cho `RateLimitExceeded`, kèm header `Retry-After`.
- `storage_uri="memory://"` chỉ đúng khi có một process. Chạy nhiều worker hoặc nhiều instance thì
  dùng Redis (`redis://...`).
- Trong test, đặt `limiter.enabled = False`; chỉ bật trong test riêng cho 429 và gọi `limiter.reset()`.

## 7. Presigned URL upload ảnh

- Client boto3: `Config(signature_version="s3v4", s3={"addressing_style": "path"})`, `endpoint_url`
  trỏ MinIO/R2. Dùng **hai** client: một client gọi kho từ backend (`S3_ENDPOINT_URL`, có thể là
  `http://minio:9000` trong Docker), một client chỉ để ký URL bằng địa chỉ trình duyệt truy cập được
  (`S3_PUBLIC_ENDPOINT_URL`, ví dụ `http://localhost:9000`). Host nằm trong chữ ký nên không thay chuỗi sau khi ký được.
- Dùng presigned **PUT** (`generate_presigned_url("put_object", Params={..., "ContentType": ct})`), hết hạn
  khoảng 5 phút. Cloudflare R2 không hỗ trợ upload bằng presigned POST form, nên không dựa vào
  `content-length-range`; dung lượng và định dạng được kiểm tra ở bước xác nhận.
- Backend tự tạo key từ `user_id` theo mẫu `storage_key` trong đặc tả. Ở bước xác nhận, backend dựng
  lại key từ `photo_id` của client, không nhận key thô từ client.
- Xác nhận: `head_object` lấy `ContentLength`; đọc 16 byte đầu (`Range="bytes=0-15"`) để kiểm tra
  magic bytes JPEG/PNG/WebP; không đạt thì `delete_object` rồi trả lỗi.
- `generate_presigned_url` chỉ ký cục bộ, không gọi mạng. Còn `head_object`, `get_object`,
  `delete_object` là I/O chặn, phải chạy qua `anyio.to_thread.run_sync`, nếu không cả event loop bị treo.
- Link xem ảnh: `get_object` presigned, `ExpiresIn=3600` (theo đặc tả, khoảng 1 giờ).
- Bucket phải bật CORS cho `PUT` từ origin của frontend; thiếu CORS, trình duyệt chặn upload dù URL đúng.

## 8. Test: pytest + httpx AsyncClient

- `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`. `ASGITransport`
  **không chạy lifespan**, nên test phải override `get_db` (và `get_s3`) bằng `app.dependency_overrides`.
- Dùng plugin `anyio` theo tài liệu FastAPI (`@pytest.mark.anyio`, fixture `anyio_backend`
  trả `"asyncio"`, scope session). Không trộn với pytest-asyncio; bản 1.x của nó đã bỏ fixture `event_loop`.
- Cô lập test: mỗi test mở một connection và một transaction ngoài,
  `AsyncSession(bind=conn, join_transaction_mode="create_savepoint")`, cuối test rollback. Service
  vẫn gọi `commit()` bình thường, vì commit chỉ đóng savepoint.
- DB test là PostgreSQL thật (container compose), không dùng SQLite, vì `on_conflict`, `unaccent`
  và `timestamptz` hoạt động khác.
- Fixture `make_client(user)` tạo user + phiên trong DB rồi trả client đã gắn cookie `dd_session`,
  `dd_csrf`, header `Origin` và `X-CSRF-Token`. Hai client `alice`/`bob` dùng cho ca truy cập chéo tài khoản.
- OAuth: `monkeypatch` `oauth.google.authorize_access_token` trả `{"userinfo": {...}}`; không gọi Google thật.

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân thường gặp |
| --- | --- |
| `MissingGreenlet` / `greenlet_spawn has not been called` | Lazy load sau commit hoặc ngoài `await`; thiếu `expire_on_commit=False`, `selectinload`, hoặc thiếu extra `asyncio` |
| Cookie không được gửi từ Vite | Thiếu `credentials: "include"`, origin `127.0.0.1` thay vì `localhost`, hoặc `secure=True` trên HTTP ở trình duyệt không coi localhost là an toàn |
| `mismatching_state` ở callback | Cookie `dd_oauth` bị mất: bắt đầu login ở host khác với callback, hoặc `SessionMiddleware` đặt `https_only=True` trên HTTP |
| 429 không có CORS header | CORSMiddleware chưa phải lớp ngoài cùng |
| Presigned URL 403 `SignatureDoesNotMatch` | Ký bằng host nội bộ, hoặc `Content-Type` lúc PUT khác lúc ký |
| Test chạm dữ liệu của nhau / treo | Không override `get_db`, dùng chung engine giữa event loop, thiếu rollback |
| 409 liên tục khi tự động lưu | `updated_at` bị cắt còn mili giây khi đi qua `Date` của JS; xem `references/db-session.md` |
| Autosave trả 403 sau khi phiên hết hạn | `verify_csrf` chạy trước auth; phải bỏ qua khi không có cookie phiên |
| `prepared statement "__asyncpg_stmt_x__" already exists` | Chạy qua PgBouncer mà chưa tắt cache prepared statement |

## Phiên bản thư viện đã tra (2026-10-16)

Phiên bản lấy từ PyPI. Tài liệu tra qua Context7 bằng HTTP API (`context7.com/api/v1`), vì công cụ
MCP Context7 chưa được nạp trong phiên tạo skill.

| Thư viện | Phiên bản | Context7 library ID |
| --- | --- | --- |
| FastAPI | 0.143.3 (yêu cầu starlette ≥ 0.46; bản mới nhất 1.8.0) | `/websites/fastapi_tiangolo` |
| Pydantic / pydantic-settings | 2.14.1 / 2.16.0 | `/pydantic/pydantic`, `/pydantic/pydantic-settings` |
| SQLAlchemy | 2.1.4 | `/websites/sqlalchemy_en_20` (Context7 chỉ có tài liệu 2.0; mẫu ở đây dùng được cho cả 2.0 và 2.1) |
| asyncpg | 0.32.0 | - |
| Alembic | 1.20.0 | `/websites/alembic_sqlalchemy` |
| Authlib | 1.9.1 (+ itsdangerous 2.2.0 cho SessionMiddleware) | `/authlib/authlib` |
| slowapi | 0.1.10 | `/laurents/slowapi` |
| boto3 | 1.43.114 | `/boto/boto3` |
| httpx / anyio | 0.28.1 / 4.15.1 | `/websites/fastapi_tiangolo` (mục testing) |

Khi nâng phiên bản lớn, tra lại Context7 và cập nhật bảng này.
