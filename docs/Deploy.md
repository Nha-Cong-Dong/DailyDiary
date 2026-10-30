# Triển khai Jotly lên production

|                 |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| **Mục đích**    | Cách hạ tầng production đang được dựng, cách dựng lại từ đầu, và việc làm định kỳ        |
| **Cập nhật**    | 30/10/2026                                                                               |
| **Liên quan**   | Đặc tả mục 5.2 (hạ tầng), 5.7 (môi trường), 6 (vận hành) · `docker-compose.prod.yml` · `.github/workflows/jobs.yml` · Việc chưa làm: [`Backlog.md`](Backlog.md) |

> [!IMPORTANT]
> Khóa bí mật (mật khẩu DB, khóa R2/B2, OAuth secret, App Password, token tunnel) chỉ nằm trong **file `.env.*` trên máy
> chạy API** (bị `.gitignore` chặn), **dashboard của dịch vụ** hoặc **GitHub Secrets**; không dán vào chat, issue,
> commit hay file được theo dõi trong repo.

## Sơ đồ

| Thành phần        | Dịch vụ                                         | Địa chỉ                         | Chi phí |
| ----------------- | ----------------------------------------------- | ------------------------------- | ------- |
| Web               | Cloudflare Pages, dự án `jotly` (Direct Upload) | `https://jotly.io.vn`           | 0       |
| API               | Docker trên máy cá nhân + Cloudflare Tunnel `jotly-app` | `https://api.jotly.io.vn` | 0 (máy phải luôn bật) |
| Cơ sở dữ liệu     | MongoDB Atlas M0                                | Singapore, DB `dailydiary`      | 0       |
| Kho ảnh           | Cloudflare R2                                   | bucket `jotly-photos`           | 0 tới 10 GB (cần thẻ thanh toán) |
| Kho sao lưu       | Backblaze B2                                    | bucket `Jotly-Bucket` (`ca-east-006`) | 0 tới 10 GB |
| Tác vụ định kỳ    | GitHub Actions                                  | workflow `Jobs`, mỗi giờ        | 0       |
| Email             | Gmail SMTP                                      | App Password                    | 0       |
| DNS               | Cloudflare                                      | zone `jotly.io.vn`              | 0       |

Web và API cùng tên miền gốc `jotly.io.vn` (`io.vn` nằm trong Public Suffix List), cookie đặt `Domain=jotly.io.vn`
(`COOKIE_DOMAIN`) nên web đọc được `dd_csrf` và cookie `SameSite=Lax` hoạt động.

## Thứ tự

```
1 DNS → 2 Atlas → 3 R2 → 4 Google OAuth → 5 merge vào main → 6 API (máy cá nhân + tunnel) → 7 Cloudflare Pages
      → 8 GitHub Secrets + chạy thử tác vụ → 9 kiểm tra production → 10 sao lưu chính thức + thử khôi phục
```

**Tiến độ (30/10/2026):** Bước 1–7 xong; production chạy tại `https://jotly.io.vn`. Bước 8: secret đã nhập, nhưng
workflow `Jobs` đang lỗi (`purge_accounts` → `OperationFailure`). Bước 9: đã kiểm tra đăng nhập, onboarding, viết trang,
tải ảnh, header bảo mật, CORS, chuyển hướng `www`; còn lại một số mục. Bước 10 chưa làm. Chi tiết: [`Backlog.md`](Backlog.md).

API ban đầu chạy trên Render (`render.yaml`); từ 29/10/2026 chuyển sang máy cá nhân. `render.yaml` giữ lại làm phương án
dự phòng (xem cuối mục 6).

---

## 1. DNS: chuyển `jotly.io.vn` về Cloudflare

1. Cloudflare Dashboard → **Add a domain** → `jotly.io.vn` → gói **Free**.
2. Cloudflare đưa 2 nameserver (dạng `xxx.ns.cloudflare.com`). Vào trang quản lý tên miền ở nhà đăng ký `.io.vn`
   → đổi nameserver sang 2 địa chỉ đó.
3. Chờ Cloudflare báo **Active** (vài phút tới vài giờ).
4. SSL/TLS → Overview → chế độ **Full (strict)**. SSL/TLS → Edge Certificates → bật **Always Use HTTPS**.

Bản ghi DNS không cần tạo tay: `api` do tunnel tạo (mục 6), `jotly.io.vn` và `www` do Pages tạo (mục 7).

## 2. MongoDB Atlas

Cluster **Atlas M0, Singapore, `cluster0.auszmkf`**, DB `dailydiary`, tạo ngày 21/10/2026; đã chạy đủ migration
0001–0009. Hai user:

| User | Dùng cho | Quyền cần có |
| --- | --- | --- |
| `vuongtribach_jotly` | API và tác vụ (GitHub Actions) | **chỉ** `readWrite` trên `dailydiary` |
| `jotly_migrate` | Chạy migration từ máy bạn | `dbAdmin` + `readWrite` trên `dailydiary` |

1. **Quyền user app:** Atlas → Database Access → `vuongtribach_jotly` → chỉ Specific privilege `readWrite` @
   `dailydiary`. User app không cần, và không nên có, quyền tạo validator hoặc index.
2. **Network Access:** `0.0.0.0/0` — GitHub Actions và mạng gia đình không có IP cố định.
3. **Migration** bằng `jotly_migrate`, từ máy bạn:
   ```powershell
   cd apps/api
   $env:PYTHONUTF8 = "1"; uv run --env-file .env.migrate python -m app.db.migrate
   ```
4. **Chuỗi kết nối (`MONGODB_URI`) cho API và GitHub:** chuỗi của user `vuongtribach_jotly`. Máy này không tra được bản
   ghi SRV nên dùng dạng `mongodb://` liệt kê 3 máy chủ kèm `tls=true&replicaSet=…&authSource=admin` (như
   `apps/api/.env.beta`); nơi tra được SRV có thể dùng `mongodb+srv://…@cluster0.auszmkf.mongodb.net/`. Tên DB đặt
   riêng bằng `MONGODB_DB=dailydiary`. **API và GitHub Secrets phải dùng cùng một chuỗi.**

M0 không có sao lưu tự động: tác vụ `backup_db` lo việc này (mục 8, 10). **Mỗi lần có migration mới:** chạy bước 3
trước khi merge code cần nó.

## 3. Cloudflare R2 (kho ảnh)

1. Cloudflare Dashboard → **R2** → bật R2 (Cloudflare yêu cầu thẻ thanh toán dù dùng trong hạn mức miễn phí).
2. **Create bucket** → tên `jotly-photos`, Location: **Automatic** với hint **Asia-Pacific (APAC)**. Không bật Public access.
3. Bucket → **Settings → CORS policy**:
   ```json
   [
     {
       "AllowedOrigins": ["https://jotly.io.vn"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **R2 → Manage API tokens → Create API token** → quyền **Object Read & Write**, chỉ bucket `jotly-photos`.
   Chép **Access Key ID** (`S3_ACCESS_KEY`), **Secret Access Key** (`S3_SECRET_KEY`) — secret chỉ hiện một lần.
5. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (Account ID ở trang tổng quan R2). Dùng cho cả
   `S3_ENDPOINT_URL` và `S3_PUBLIC_ENDPOINT_URL`. Region: `auto`.

## 4. Google OAuth

Project Google Cloud `jotly-512910`, OAuth client loại **Web application** tên `Jotly production`.

1. **Google Auth Platform → Branding:** Application home page `https://jotly.io.vn`, privacy policy
   `https://jotly.io.vn/privacy`, terms of service để trống (trang Điều khoản chưa có), Authorized domain `jotly.io.vn`,
   không đặt logo.
2. **Clients → Jotly production:** Authorized redirect URI `https://api.jotly.io.vn/auth/google/callback` (khớp tuyệt đối,
   không dấu `/` cuối). Client ID và secret là `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; **hai giá trị phải cùng một
   client**.
3. **Audience:** External, trạng thái **In production** (30/10/2026). Thương hiệu đã xác minh. Chỉ xin `openid email
   profile` nên không cần duyệt quyền nhạy cảm.

## 5. Đưa code lên `main`

`main` có branch protection: bắt buộc PR, CI `api`, `web`, `e2e` phải xanh, cấm force-push và xóa nhánh. Merge nhánh
đang làm vào `main` qua PR trước khi build lại API (mục 6) hoặc web (mục 7).

## 6. API: Docker trên máy cá nhân + Cloudflare Tunnel

API chạy bằng `docker-compose.prod.yml` (image từ `apps/api/Dockerfile`), chỉ mở cổng `127.0.0.1:8000`. Dịch vụ Windows
`cloudflared` (connector của tunnel `jotly-app`) chuyển `api.jotly.io.vn` tới cổng đó; máy không cần mở cổng router hay
có IP tĩnh.

1. **File cấu hình `apps/api/.env.prod`** (không commit; mẫu `apps/api/.env.example`):

   | Biến | Giá trị |
   | --- | --- |
   | `MONGODB_URI` | Bước 2.4 |
   | `MONGODB_DB` | `dailydiary` |
   | `SESSION_SECRET` | chuỗi ngẫu nhiên ≥ 48 ký tự (`uv run python -c "import secrets; print(secrets.token_urlsafe(48))"`) |
   | `FRONTEND_URL` | `https://jotly.io.vn` |
   | `FRONTEND_ORIGINS` | `["https://jotly.io.vn"]` |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Bước 4.2 |
   | `GOOGLE_REDIRECT_URI` | `https://api.jotly.io.vn/auth/google/callback` |
   | `S3_ENDPOINT_URL`, `S3_PUBLIC_ENDPOINT_URL` | Bước 3.5 (cùng một giá trị) |
   | `S3_REGION`, `S3_BUCKET` | `auto`, `jotly-photos` |
   | `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Bước 3.4 |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_STARTTLS` | `smtp.gmail.com`, `587`, `true` |
   | `SMTP_USER`, `SMTP_PASSWORD` | Gmail và App Password |
   | `MAIL_FROM` | thường bằng `SMTP_USER` |
   | `FEEDBACK_TO_EMAIL` | hộp thư nhận góp ý |

   `ENV=production`, `DEV_LOGIN=false`, `COOKIE_SECURE=true`, `COOKIE_DOMAIN=jotly.io.vn` đặt cố định trong
   `docker-compose.prod.yml`, không cần ghi vào file. Mỗi dòng dạng `TÊN=giá trị`, không dấu cách quanh `=`.
2. **Chạy** (ở gốc repo):
   ```powershell
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml ps        # api phải "healthy"
   ```
   Sau khi sửa `.env.prod` hoặc kéo code mới: `docker compose -f docker-compose.prod.yml up -d --build --force-recreate api`.
3. **Tunnel:** Cloudflare → Zero Trust → Networks → **Tunnels** → Create tunnel (loại Cloudflared), tên `jotly-app`.
   Cài connector trên máy theo lệnh Cloudflare đưa ra (cài thành dịch vụ Windows `cloudflared`, tự chạy cùng Windows).
4. **Route:** tunnel `jotly-app` → **Routes → Add route → Published application**: Subdomain `api`, Domain
   `jotly.io.vn`, Path trống, Service URL `http://localhost:8000`.
5. **DNS:** Cloudflare tạo bản ghi `api` loại **Tunnel** (Proxied). Nếu không tự tạo, thêm `CNAME api →
   <Tunnel ID>.cfargotunnel.com`, **Proxied**. Không để bản ghi `api` cũ trỏ nơi khác.
6. Kiểm tra `https://api.jotly.io.vn/health` → `{"status":"ok","db":"ok"}`.

**Để máy luôn phục vụ:** Docker Desktop bật "Start Docker Desktop when you sign in"; tắt Sleep của Windows khi cắm điện;
service `api` có `restart: unless-stopped`. Xem log: `docker compose -f docker-compose.prod.yml logs --since 30m api`
(log không chứa nội dung nhật ký).

**Phương án dự phòng (Render):** `render.yaml` vẫn dựng được service `jotly-api` (Render → New → Blueprint). Khi dùng lại
phải thêm biến `COOKIE_DOMAIN=jotly.io.vn` (file chưa có), đổi DNS `api` thành `CNAME → jotly-api.onrender.com`
(DNS only) và tắt route tunnel.

## 7. Cloudflare Pages (web)

Dự án `jotly` dùng **Direct Upload**, vì tài khoản không có quyền chủ tổ chức GitHub để kết nối repo. Mỗi lần đổi web
phải build và tải lên lại.

1. Build ở máy (trong `apps/web`):
   ```powershell
   $env:VITE_API_URL = "https://api.jotly.io.vn"; npm run build
   ```
   `VITE_API_URL` được nhúng lúc build; thiếu biến này bản build sẽ gọi `http://localhost:8000`.
2. Lần đầu: Cloudflare → **Workers & Pages → Create application** → dòng cuối "Need to use the legacy Pages workflow?
   **Continue to Pages**" → **Upload assets** → tên dự án `jotly` → kéo thả thư mục `apps/web/dist` → Deploy.
   Các lần sau: dự án `jotly` → **Create deployment** → kéo thả `dist`.
3. Dự án → **Custom domains** → thêm `jotly.io.vn`, rồi `www.jotly.io.vn`; chờ **Active**.
4. Chuyển `www` về tên miền chính: zone `jotly.io.vn` → **Rules → Redirect Rules → Create rule**:
   - Điều kiện: Hostname *equals* `www.jotly.io.vn`.
   - Then: **Dynamic**, `concat("https://jotly.io.vn", http.request.uri.path)`, mã **301**, bật **Preserve query string**.

Không có `404.html` nên Pages phục vụ `index.html` cho mọi đường dẫn (SPA). Header bảo mật lấy từ `apps/web/public/_headers`
(CSP đang Report-Only). Trang `*.pages.dev` mở được nhưng không đăng nhập được (khác tên miền với API).

## 8. GitHub Secrets và chạy thử tác vụ

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**:

   | Secret | Giá trị |
   | --- | --- |
   | `MONGODB_URI` | **giống hệt** `MONGODB_URI` trong `apps/api/.env.prod` |
   | `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | như `.env.prod` |
   | `BACKUP_S3_ENDPOINT_URL`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY` | B2: endpoint `https://s3.ca-east-006.backblazeb2.com`, region `ca-east-006`, bucket `Jotly-Bucket` |
   | `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `FEEDBACK_TO_EMAIL` | như `.env.prod` |

   `BACKUP_S3_BUCKET` trống thì `backup_db` in "Chưa cấu hình kho sao lưu… bỏ qua" và **vẫn xanh**; đọc log, đừng chỉ
   nhìn màu.
2. **Kiểm tra chuỗi kết nối trước:** chạy tác vụ trong container API (dùng `.env.prod`):
   ```powershell
   docker compose -f docker-compose.prod.yml exec -T api python -m app.jobs.run purge_accounts
   ```
   In `Đã dọn xong N tài khoản.` thì chuỗi đúng; nếu GitHub vẫn lỗi `OperationFailure`, secret `MONGODB_URI` khác chuỗi này.
3. **Actions → Jobs → Run workflow** → nhánh `main`, ô Tác vụ chọn lần lượt `purge_accounts`, `backup_db`,
   `backup_photos`, `purge_trash`. Mỗi lần phải xanh; vào B2 thấy file `db/YYYY/MM/DD/dailydiary-….tar.gz`.

Lịch tự chạy mỗi giờ (phút 17). Repo công khai: không có commit 60 ngày thì GitHub tắt lịch — bật lại ở tab Actions.

## 9. Kiểm tra production

- `https://jotly.io.vn` → **Tiếp tục với Google** → onboarding → viết trang hôm nay → tải 1 ảnh → xem Dòng thời gian,
  Year in Pixels → tìm kiếm → bật/tắt chia sẻ, mở link ở cửa sổ ẩn danh → gửi góp ý.
- DevTools → Console: không có lỗi CORS; ghi lại các dòng `[Report Only] … Content Security Policy` nếu có.
- Header: `https://jotly.io.vn` và `https://api.jotly.io.vn/health` có `strict-transport-security`, `x-frame-options: DENY`,
  `x-content-type-options: nosniff`.
- `https://www.jotly.io.vn/…` và `http://…` chuyển 301 về `https://jotly.io.vn/…`.
- `https://api.jotly.io.vn/docs`, `/redoc` trả 404.
- Hiệu năng: <https://pagespeed.web.dev/> với `https://jotly.io.vn` (mobile).

## 10. Sao lưu chính thức và thử khôi phục

1. Chạy `backup_db` + `backup_photos` (mục 8.3) sau khi đã có dữ liệu thật đầu tiên.
2. Thử khôi phục **vào MongoDB local** (không đụng production):
   ```powershell
   docker compose up -d mongo
   cd apps/api
   # .env trỏ MongoDB local và BACKUP_S3_* của B2 → restore đọc bản mới nhất trên B2, ghi vào DB local
   uv run python -m app.jobs.run restore_db --target jotly_restore_check
   ```
   So số document với production (Atlas → Collections), rồi xóa DB `jotly_restore_check`.
3. Ghi kết quả vào `MVP_Plan.md` (Bước 13: "sao lưu đầu tiên đã chạy") và xóa dòng tương ứng ở `Backlog.md`.

## Việc định kỳ

| Khi | Việc |
| --- | --- |
| Mỗi ngày | Máy chạy API còn bật, `docker compose -f docker-compose.prod.yml ps` báo `healthy` |
| Mỗi tuần | Tab Actions (Jobs có đỏ không), dung lượng R2/B2, Atlas (giới hạn 512 MB của M0), tunnel `jotly-app` Healthy |
| Mỗi tháng | Thử khôi phục một bản sao lưu vào DB local |
| Khi có migration mới | Chạy bước 2.3 trước khi merge vào `main` |
| Khi đổi web | Build với `VITE_API_URL` và tải `dist` lên Pages (mục 7) |
| Khi đổi API | Kéo `main`, `docker compose -f docker-compose.prod.yml up -d --build` |
| Khi đổi khóa | Cập nhật đồng thời `apps/api/.env.prod` và GitHub Secrets |

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp |
| --- | --- |
| `https://api.jotly.io.vn` trả 502/530 | Container `api` không chạy, hoặc dịch vụ `cloudflared` trên máy dừng, hoặc máy đang tắt/ngủ |
| `https://api.jotly.io.vn` trả trang "Service Suspended" | Bản ghi DNS `api` vẫn trỏ về Render |
| `redirect_uri_mismatch` ở Google | `GOOGLE_CLIENT_ID` thuộc client khác "Jotly production", hoặc redirect URI khai ở Google lệch từng ký tự |
| `invalid_client` ở Google | `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` không cùng một client |
| Đăng nhập được nhưng lưu báo "Chưa lưu được", log có `403` ở request ghi | Thiếu `COOKIE_DOMAIN=jotly.io.vn` (lỗi `CSRF_FAILED`); sau khi sửa phải xóa cookie cũ của `api.jotly.io.vn` |
| Đăng nhập xong quay về trang chủ nhưng vẫn chưa đăng nhập | Web mở bằng `*.pages.dev` thay vì `jotly.io.vn`; hoặc `FRONTEND_ORIGINS` không khớp |
| Tải ảnh lỗi "CORS" | CORS của bucket R2 thiếu `https://jotly.io.vn` hoặc phương thức `PUT` |
| Ảnh lỗi `SignatureDoesNotMatch` | `S3_PUBLIC_ENDPOINT_URL` sai, hoặc đồng hồ máy lệch |
| API báo lỗi validator hoặc thiếu index | Chưa chạy migration mới bằng `jotly_migrate` (bước 2.3) |
| `ServerSelectionTimeoutError` | Atlas Network Access chưa có `0.0.0.0/0`, hoặc sai mật khẩu trong `MONGODB_URI` |
| Jobs lỗi `OperationFailure` | Secret `MONGODB_URI` sai mật khẩu/user hoặc thiếu tham số; so với `.env.prod` (mục 8.2) |
| Web gọi `localhost:8000` | Bản build thiếu `VITE_API_URL`; build lại (mục 7.1) |
| Workflow Jobs không tự chạy | Lịch bị tắt sau 60 ngày không commit; hoặc cron GitHub trễ |
| CI job `api`/`e2e` lỗi "MongoDB cannot start … kernel 6.19" | Runner kernel mới (SERVER-121912); chạy lại job |
