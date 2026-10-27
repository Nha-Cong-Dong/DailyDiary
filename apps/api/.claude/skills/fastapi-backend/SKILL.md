---
name: fastapi-backend
description: Mẫu code chuẩn cho backend FastAPI của DailyDiary (apps/api), gồm lifespan và AsyncMongoClient (PyMongo async), dependency Db/get_current_user, truy vấn và cập nhật MongoDB an toàn (lọc user_id, chống NoSQL injection, cập nhật nguyên tử), migration MongoDB tự viết, CORS cho Vite localhost:5173, đăng nhập Google bằng Authlib với cookie HttpOnly và chống CSRF, rate limit slowapi, presigned URL S3/MinIO bằng boto3, test pytest + httpx AsyncClient trên MongoDB thật. Dùng mỗi khi tạo hoặc sửa main.py, core/, db/, dependency, service truy vấn MongoDB, migration, router auth/photos, conftest.py, hoặc khi gặp lỗi DuplicateKeyError, WriteError do validator, ServerSelectionTimeoutError, lỗi cookie/CORS, 429, lỗi presigned URL, test không cô lập, kể cả khi người dùng không nói tên thư viện. Dùng cùng skill api-conventions.
---

# FastAPI backend: mẫu code chuẩn

Skill này nói **cách viết** các phần nền của `apps/api`. Quy ước dự án (vai trò thư mục,
định dạng lỗi, mã trạng thái, đọc giới hạn từ `shared/limits.json`, các ca test bắt buộc…)
nằm trong skill **api-conventions**. Đọc skill đó trước; ở đây chỉ dùng lại, không nhắc lại.
Cây thư mục chuẩn: `docs/Project_Structure.md`. Mô hình dữ liệu: `docs/Project_Specs.md` mục 5.4.

Mã nguồn mẫu đầy đủ nằm trong `references/`. Đó là **mẫu**, tên có thể khác code thật: kho ảnh là đối tượng
`Storage` ở `app.state.storage` (dependency `S3`/`get_storage`), DB là `Db`, upsert người dùng ở
`services/users.upsert_google_user`. Chỉ mở file liên quan tới việc đang làm:

| Đang làm | Đọc |
| --- | --- |
| `core/config.py`, `main.py`, lifespan, CORS, thứ tự middleware | `references/settings-lifespan.md` |
| `db/client.py`, service truy vấn/cập nhật MongoDB, phân trang, tìm kiếm, chống injection | `references/mongodb.md` |
| `db/migrations/`, thêm collection/index/validator, đổi cấu trúc dữ liệu | `references/migrations.md` |
| `/auth/google/*`, cookie phiên, `get_current_user`, CSRF, đăng xuất | `references/auth-google-cookie.md` |
| `core/rate_limit.py`, gắn limit vào endpoint, handler 429 | `references/rate-limit.md` |
| `/photos/upload-url`, xác nhận ảnh, link xem ảnh, MinIO/R2 | `references/s3-presigned.md` |
| `tests/conftest.py`, fixture DB, client hai người dùng, mock OAuth | `references/testing.md` |

## 1. Settings và lifespan

- Một lớp `Settings(BaseSettings)` đọc biến môi trường và `.env`; tạo một lần, import ở nơi cần.
  Bí mật (`SESSION_SECRET`, khóa OAuth, khóa S3, `MONGODB_URI`) chỉ nằm trong biến môi trường.
- Tài nguyên sống lâu (client MongoDB, client S3) tạo trong `lifespan` và gắn vào `app.state`.
  Starlette 1.x đã bỏ `on_startup`/`on_shutdown`, nên chỉ dùng `lifespan`.
- Viết `create_app()` thay vì biến `app` toàn cục có sẵn trạng thái, để test tạo app mới cho mỗi lần chạy.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    get_limits()  # đọc và kiểm tra shared/limits.json ngay khi khởi động
    client = make_client(settings.mongodb_uri)
    app.state.db = client[settings.mongodb_db]
    # Storage (core/storage.py) giữ cả hai client S3: gọi kho và ký URL; None khi chưa cấu hình kho.
    app.state.storage = make_storage()
    try:
        yield
    finally:
        await client.close()  # close() của AsyncMongoClient là coroutine
```

## 2. MongoDB với PyMongo async

- Dùng `pymongo.AsyncMongoClient` (driver async chính thức). **Không dùng Motor**, vì đã ngừng phát triển.
  Không dùng ODM: schema Pydantic đã kiểm tra dữ liệu, service viết truy vấn rõ ràng.
- Một client cho mỗi process, tạo trong lifespan. Client tự quản lý pool; endpoint nhận `AsyncDatabase`
  qua dependency `Db`. Tham số bắt buộc của client:
  - `uuidRepresentation="standard"`: nếu thiếu, lưu `uuid.UUID` sẽ báo lỗi.
  - `tz_aware=True`: nếu thiếu, datetime đọc ra không có múi giờ.
  - `serverSelectionTimeoutMS=3000`: nếu để mặc định 30 s, DB sập sẽ làm request treo rất lâu.
- `entry_date` là chuỗi `"YYYY-MM-DD"`; `_id`/`user_id` là `uuid.UUID`. BSON date lưu tới mili giây, nên
  so sánh `updated_at` với giá trị frontend gửi lại không bị lệch.
- **Mọi** bộ lọc trên dữ liệu người dùng có `"user_id": user_id`. Ghép filter/update từ trường Pydantic đã kiểm
  tra kiểu, **không** đưa dict từ request vào (`{"title": {"$ne": None}}` sẽ thành toán tử).
- Ghi một ngày = một thao tác trên một document: `find_one_and_update(..., upsert=True,
  return_document=ReturnDocument.AFTER)`. Điều kiện nghiệp vụ đưa vào filter để kiểm tra nguyên tử
  (vd. `"updated_at": known` phát hiện xung đột; ảnh dùng khóa lạc quan: filter kèm nguyên mảng `photos` đã đọc,
  `modified_count == 0` thì đọc lại và thử lại — xem `services/photos.py`).
- MVP không dùng transaction. Thao tác nhiều collection (xóa tài khoản) viết theo thứ tự để chạy lại được.
- Tìm kiếm từ khóa: `re.escape` chuỗi đã chuẩn hóa, regex neo đầu `^`, phân biệt hoa thường
  (đã chuẩn hóa về chữ thường), để MongoDB dùng được index và không bị ReDoS.
- Bắt `DuplicateKeyError` (vi phạm unique) và `WriteError` mã 121 (validator) ở service, rồi đổi thành lỗi chuẩn.

```python
from typing import Annotated
from fastapi import Depends, Request
from pymongo.asynchronous.database import AsyncDatabase

async def get_db(request: Request) -> AsyncDatabase:
    return request.app.state.db

Db = Annotated[AsyncDatabase, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
```

## 3. Migration MongoDB

- MongoDB không có schema cố định, nhưng dự án vẫn quản lý **validator `$jsonSchema` và index** bằng migration
  tự viết: `app/db/migrations/mNNNN_<mo_ta>.py` có `ID` và `async def up(db)`, liệt kê trong `app/db/migrate.py`.
- Chạy: `uv run python -m app.db.migrate`. Migration đã chạy được ghi vào `_migrations` và lần sau bị bỏ qua.
  Chỉ tiến, không có downgrade, nên mỗi migration phải **chạy lại được** mà không hỏng (index đặt tên cố định,
  `collMod` cho validator).
- Validator chỉ kiểm tra cấu trúc (kiểu, điểm 1–5, enum). Giới hạn độ dài/số lượng nằm ở `shared/limits.json`.
- Không dùng TTL index cho bài xóa mềm: tác vụ dọn phải xóa ảnh trong kho trước. TTL chỉ dùng cho `user_sessions`.
- Chạy migration ở bước triển khai, **không** chạy trong `lifespan`, vì nhiều worker sẽ chạy cùng lúc.

Chi tiết và mẫu đổi cấu trúc dữ liệu có sẵn: `references/migrations.md`.

## 4. CORS cho Vite

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,  # local: ["http://localhost:5173"]
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
  (`secrets.token_urlsafe(32)`); collection `user_sessions` chỉ lưu SHA-256 của token làm `_id`. Nhờ vậy
  đăng xuất và `DELETE /me` thu hồi phiên được ngay; TTL index tự dọn phiên hết hạn.
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
  Upsert user bằng `find_one_and_update` với `$set` (trường luôn cập nhật) và `$setOnInsert` (trường chỉ đặt lần đầu).
- `get_current_user` đọc cookie, tìm phiên còn hạn (vẫn kiểm tra `expires_at`, vì TTL chạy trễ tới ~60 s),
  gán `request.state.user_id` (rate limit dùng giá trị này) rồi trả `User`.
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
  magic bytes JPEG/WebP (chỉ nhận hai loại này; trình duyệt đã nén sang WebP/JPEG); không đạt thì `delete_object` rồi trả lỗi.
- `generate_presigned_url` chỉ ký cục bộ, không gọi mạng. Còn `head_object`, `get_object`,
  `delete_object` là I/O chặn, phải chạy qua `anyio.to_thread.run_sync`, nếu không cả event loop bị treo.
- Link xem ảnh: `get_object` presigned, `ExpiresIn=3600` (theo đặc tả, khoảng 1 giờ).
- Bucket phải bật CORS cho `PUT` từ origin của frontend; thiếu CORS, trình duyệt chặn upload dù URL đúng.

## 8. Test: pytest + httpx AsyncClient

- `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`. `ASGITransport`
  **không chạy lifespan**, nên test phải override `get_db` bằng `app.dependency_overrides` và gắn kho giả trực tiếp
  (`app.state.storage = FakeStorage()`, xem `tests/conftest.py`); dependency kho là `get_storage` / `get_optional_storage`.
- Dùng plugin `anyio` theo tài liệu FastAPI (`@pytest.mark.anyio`, fixture `anyio_backend`
  trả `"asyncio"`, scope session). Không trộn với pytest-asyncio; bản 1.x của nó đã bỏ fixture `event_loop`.
- DB test là MongoDB thật (container compose), không dùng mongomock, vì validator, index unique, TTL và
  toán tử cập nhật hoạt động khác. Đầu phiên test: xóa DB `*_test` và chạy migration; sau mỗi test:
  `delete_many({})` trên mọi collection (giữ validator và index).
- Fixture từ chối chạy nếu tên DB test không kết thúc bằng `_test`, vì nó xóa sạch DB.
- Fixture `make_client(user)` tạo user + phiên trong DB rồi trả client đã gắn cookie `dd_session`,
  `dd_csrf`, header `Origin` và `X-CSRF-Token`. Hai client `alice`/`bob` dùng cho ca truy cập chéo tài khoản.
- OAuth: `monkeypatch` `oauth.google.authorize_access_token` trả `{"userinfo": {...}}`; không gọi Google thật.

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân thường gặp |
| --- | --- |
| `ValueError: cannot encode native uuid.UUID with UuidRepresentation.UNSPECIFIED` | Client tạo thiếu `uuidRepresentation="standard"`; luôn tạo bằng `make_client` |
| So sánh datetime báo `can't compare offset-naive and offset-aware` | Client thiếu `tz_aware=True`, hoặc code tạo `datetime.utcnow()` thay vì `datetime.now(UTC)` |
| `/health` treo khoảng 30 s khi DB tắt | Thiếu `serverSelectionTimeoutMS` |
| `WriteError ... Document failed validation` (mã 121) | Dữ liệu sai kiểu so với `$jsonSchema`; xem `errInfo` trong lỗi để biết trường nào |
| `DuplicateKeyError` khi tạo nhật ký | Đã có bài cùng `(user_id, entry_date)`: dùng upsert thay vì `insert_one` |
| Tìm kiếm chậm hoặc trả sai | Regex không neo `^`, không `re.escape`, hoặc dùng cờ `i` nên không dùng được index |
| Cookie không được gửi từ Vite | Thiếu `credentials: "include"`, origin `127.0.0.1` thay vì `localhost`, hoặc `secure=True` trên HTTP ở trình duyệt không coi localhost là an toàn |
| `mismatching_state` ở callback | Cookie `dd_oauth` bị mất: bắt đầu login ở host khác với callback, hoặc `SessionMiddleware` đặt `https_only=True` trên HTTP |
| 429 không có CORS header | CORSMiddleware chưa phải lớp ngoài cùng |
| Presigned URL 403 `SignatureDoesNotMatch` | Ký bằng host nội bộ, hoặc `Content-Type` lúc PUT khác lúc ký |
| Test chạm dữ liệu của nhau | Không override `get_db`, hoặc fixture không dọn collection sau test |
| Autosave trả 403 sau khi phiên hết hạn | `verify_csrf` chạy trước auth; phải bỏ qua khi không có cookie phiên |

## Phiên bản thư viện đã tra (cập nhật 2026-10-17)

Phiên bản lấy từ PyPI. Tài liệu tra qua Context7 bằng HTTP API (`context7.com/api/v1`), vì công cụ
MCP Context7 chưa được nạp trong phiên tạo skill.

| Thư viện | Phiên bản | Context7 library ID |
| --- | --- | --- |
| FastAPI | 0.143.3 (yêu cầu starlette ≥ 0.46; bản mới nhất 1.8.0) | `/websites/fastapi_tiangolo` |
| Pydantic / pydantic-settings | 2.14.1 / 2.16.0 | `/pydantic/pydantic`, `/pydantic/pydantic-settings` |
| PyMongo (API async `AsyncMongoClient`) | 4.19.0 | `/mongodb/docs-pymongo` |
| MongoDB server (local, CI) | 8.0.34 | - |
| Authlib | 1.8.0 (+ itsdangerous 2.2.0 cho SessionMiddleware; httpx là phụ thuộc chạy, không chỉ để test) | `/authlib/authlib` |
| slowapi | 0.1.10 | `/laurents/slowapi` |
| boto3 | 1.43.114 | `/boto/boto3` |
| httpx / anyio | 0.28.1 / 4.15.1 | `/websites/fastapi_tiangolo` (mục testing) |
| tzdata | ≥ 2026.5 (dữ liệu múi giờ IANA cho `zoneinfo` trên Windows) | - |

Khi nâng phiên bản lớn, tra lại Context7 và cập nhật bảng này.
