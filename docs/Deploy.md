# Triển khai Jotly lên production (beta)

|                 |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| **Mục đích**    | Hướng dẫn từng bước dựng hạ tầng production lần đầu, và việc làm định kỳ sau đó            |
| **Cập nhật**    | 25/10/2026                                                                               |
| **Liên quan**   | Đặc tả mục 5.2 (hạ tầng), 5.7 (môi trường), 6 (vận hành) · `render.yaml` · `.github/workflows/jobs.yml` |

> [!IMPORTANT]
> Khóa bí mật (mật khẩu DB, khóa R2/B2, OAuth secret, App Password) chỉ dán vào **dashboard của dịch vụ** hoặc
> **GitHub Secrets**, không dán vào chat, issue, commit hay file trong repo.

## Sơ đồ

| Thành phần        | Dịch vụ                   | Địa chỉ                         | Chi phí |
| ----------------- | ------------------------- | ------------------------------- | ------- |
| Web               | Cloudflare Pages          | `https://jotly.io.vn`           | 0       |
| API               | Render (Free, Singapore)  | `https://api.jotly.io.vn`       | 0 (ngủ sau 15 phút) |
| Cơ sở dữ liệu     | MongoDB Atlas M0          | Singapore                       | 0       |
| Kho ảnh           | Cloudflare R2             | bucket `jotly-photos`           | 0 tới 10 GB (cần thẻ thanh toán) |
| Kho sao lưu       | Backblaze B2              | bucket đã tạo ở Bước 13         | 0 tới 10 GB |
| Tác vụ định kỳ    | GitHub Actions            | workflow `Jobs`, mỗi giờ        | 0       |
| Email             | Gmail SMTP                | App Password                    | 0       |
| DNS               | Cloudflare                | zone `jotly.io.vn`              | 0       |

Web và API cùng tên miền gốc `jotly.io.vn` (`io.vn` nằm trong Public Suffix List) nên cookie `SameSite=Lax` hoạt động.

## Thứ tự

```
1 DNS → 2 Atlas → 3 R2 → 4 Google OAuth → 5 merge vào main → 6 Render → 7 Cloudflare Pages
      → 8 GitHub Secrets + chạy thử tác vụ → 9 kiểm tra production → 10 sao lưu chính thức + thử khôi phục
```

---

## 1. DNS: chuyển `jotly.io.vn` về Cloudflare

1. Cloudflare Dashboard → **Add a domain** → `jotly.io.vn` → gói **Free**.
2. Cloudflare đưa 2 nameserver (dạng `xxx.ns.cloudflare.com`). Vào trang quản lý tên miền ở nhà đăng ký `.io.vn`
   → đổi nameserver sang 2 địa chỉ đó.
3. Chờ Cloudflare báo **Active** (vài phút tới vài giờ).
4. SSL/TLS → Overview → chế độ **Full (strict)**. SSL/TLS → Edge Certificates → bật **Always Use HTTPS**.

## 2. MongoDB Atlas

1. Tạo project `Jotly` → **Create cluster** → **M0 (Free)** → provider **AWS**, region **Singapore (ap-southeast-1)**.
   Nếu M0 không có Singapore, chọn vùng gần nhất có M0 rồi báo lại để sửa trang `/privacy` và đặc tả.
2. **Database Access** → Add user `jotly-app`, mật khẩu dài (tạo ngẫu nhiên), quyền **Specific privileges**:
   `readWrite` trên DB `jotly` **và** `dbAdmin` trên DB `jotly` (migration dùng `collMod` để cập nhật validator).
3. **Network Access** → Add IP → `0.0.0.0/0`. Render Free và GitHub Actions không có IP cố định; bù lại bằng user riêng,
   mật khẩu dài, quyền chỉ trên DB `jotly`.
4. **Connect → Drivers** → chép chuỗi `mongodb+srv://jotly-app:<password>@…/?retryWrites=true&w=majority&appName=…`
   (thay `<password>`). Đây là `MONGODB_URI`. Tên DB không nằm trong chuỗi: đặt bằng `MONGODB_DB=jotly`.

M0 không có sao lưu tự động: tác vụ `backup_db` lo việc này (mục 8, 10).

## 3. Cloudflare R2 (kho ảnh)

1. Cloudflare Dashboard → **R2** → bật R2 (Cloudflare yêu cầu thẻ thanh toán dù dùng trong hạn mức miễn phí).
2. **Create bucket** → tên `jotly-photos`, Location: **Automatic** với hint **Asia-Pacific (APAC)**. Không bật Public access.
3. Bucket → **Settings → CORS policy** → dán:
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

## 4. Google OAuth (client production)

1. Google Cloud Console → chọn project → **APIs & Services → OAuth consent screen**:
   - User type **External**, trạng thái **Testing**; thêm email người dùng thử vào **Test users** (tối đa 100).
   - App domain: `https://jotly.io.vn`; Privacy policy: `https://jotly.io.vn/privacy`; Authorized domain: `jotly.io.vn`.
2. **Credentials → Create credentials → OAuth client ID** → loại **Web application**, tên `Jotly production`:
   - Authorized redirect URIs: `https://api.jotly.io.vn/auth/google/callback` (khớp tuyệt đối).
3. Chép **Client ID** và **Client secret** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

## 5. Đưa code lên `main`

Render và Cloudflare Pages đọc `render.yaml`, `apps/api/Dockerfile`, `apps/web/public/_headers` từ nhánh `main`.
Merge nhánh đang làm vào `main` và chờ CI xanh trước khi sang bước 6.

## 6. Render (API)

1. Render Dashboard → **New → Blueprint** → kết nối GitHub, chọn repo `Nha-Cong-Dong/DailyDiary`, nhánh `main`.
   Render đọc `render.yaml` và tạo service `jotly-api` (Docker, Free, Singapore).
2. Điền các biến `sync: false` Render hỏi:

   | Biến | Lấy ở |
   | --- | --- |
   | `MONGODB_URI` | Bước 2.4 |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Bước 4.3 |
   | `S3_ENDPOINT_URL`, `S3_PUBLIC_ENDPOINT_URL` | Bước 3.5 (cùng một giá trị) |
   | `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Bước 3.4 |
   | `SMTP_USER`, `SMTP_PASSWORD` | Gmail và App Password (như `apps/api/.env` ở máy bạn) |
   | `MAIL_FROM` | Thường bằng `SMTP_USER` |
   | `FEEDBACK_TO_EMAIL` | Hộp thư nhận góp ý |

   `SESSION_SECRET` Render tự sinh. Các biến còn lại đã có giá trị trong `render.yaml`.
3. **Apply** → chờ build và deploy. Log phải có dòng migration và `Application startup complete`.
   Kiểm tra `https://jotly-api.onrender.com/health` → `{"status":"ok","db":"ok"}`.
4. Service → **Settings → Custom Domains**: `api.jotly.io.vn` đã có sẵn từ `render.yaml`; Render cho một đích CNAME.
   Cloudflare DNS → **Add record**: `CNAME` · tên `api` · đích `jotly-api.onrender.com` · **Proxy status: DNS only**
   (mây xám, để Render tự cấp chứng chỉ). Chờ Render báo **Verified / Certificate issued**.
5. Kiểm tra `https://api.jotly.io.vn/health`.

## 7. Cloudflare Pages (web)

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → repo `Nha-Cong-Dong/DailyDiary`.
2. Cấu hình build:

   | Mục | Giá trị |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | Vite |
   | Root directory | `apps/web` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Biến môi trường | `VITE_API_URL=https://api.jotly.io.vn`, `NODE_VERSION=24` |

3. **Save and Deploy**. Trang `*.pages.dev` mở được nhưng **chưa đăng nhập được** (khác tên miền với API) — bình thường.
4. Project → **Custom domains** → thêm `jotly.io.vn`, rồi thêm `www.jotly.io.vn`.
   Chuyển `www` về tên miền chính: Rules → **Redirect Rules** → `www.jotly.io.vn/*` → `https://jotly.io.vn/${1}` (301).

Không có `404.html` nên Pages tự phục vụ `index.html` cho mọi đường dẫn (SPA). Header bảo mật lấy từ `_headers`.

## 8. GitHub Secrets và chạy thử tác vụ

1. **Xóa bản sao lưu thử** trong bucket B2 (thư mục `db/` và `photos/` tạo lúc thử trên máy local 24/10/2026), để không
   trộn với bản production và để `BACKUP_KEEP` đếm đúng.
2. Repo → **Settings → Secrets and variables → Actions → New repository secret**:

   | Secret | Giá trị |
   | --- | --- |
   | `MONGODB_URI` | như Render |
   | `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | như Render |
   | `BACKUP_S3_ENDPOINT_URL`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY` | như `apps/api/.env` (B2) |
   | `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `FEEDBACK_TO_EMAIL` | như Render |

3. **Actions → Jobs → Run workflow** → chạy lần lượt `purge_accounts`, `backup_db`, `backup_photos`. Mỗi lần phải xanh;
   vào B2 thấy file `db/YYYY/MM/DD/dailydiary-….tar.gz`.

Lịch tự chạy mỗi giờ (phút 17). Repo công khai: không có commit 60 ngày thì GitHub tắt lịch — bật lại ở tab Actions.

## 9. Kiểm tra production

- `https://jotly.io.vn` → **Tiếp tục với Google** (bằng email trong Test users) → onboarding → viết trang hôm nay →
  tải 1 ảnh → xem Dòng thời gian, Year in Pixels → tìm kiếm → bật/tắt chia sẻ, mở link ở cửa sổ ẩn danh → gửi góp ý.
- DevTools → Console: không có lỗi CORS; ghi lại các dòng `[Report Only] … Content Security Policy` nếu có.
- Header: `curl -sI https://jotly.io.vn` và `curl -sI https://api.jotly.io.vn/health` có `strict-transport-security`.
- Hiệu năng: <https://pagespeed.web.dev/> với `https://jotly.io.vn` (mobile). Lần đầu sau khi API ngủ sẽ chậm.
- Trang `https://api.jotly.io.vn/docs` phải trả 404 (tắt ở production).

## 10. Sao lưu chính thức và thử khôi phục

1. Chạy `backup_db` + `backup_photos` (mục 8.3) sau khi đã có dữ liệu thật đầu tiên.
2. Thử khôi phục **vào MongoDB local** (không đụng production), ở máy bạn:
   ```powershell
   cd apps/api
   docker compose up -d mongo   # nếu chưa chạy
   # .env đang trỏ MongoDB local và BACKUP_S3_* của B2 → restore đọc bản mới nhất trên B2, ghi vào DB local
   uv run python -m app.jobs.run restore_db --target jotly_restore_check
   ```
   So số document với production (Atlas → Collections), rồi xóa DB `jotly_restore_check`.
3. Ghi kết quả vào `MVP_Plan.md` (Bước 13: "sao lưu đầu tiên đã chạy").

## Việc định kỳ

| Khi | Việc |
| --- | --- |
| Mỗi tuần | Xem tab Actions (Jobs có đỏ không), dung lượng R2/B2, Atlas (giới hạn 512 MB của M0) |
| Mỗi tháng | Thử khôi phục một bản sao lưu vào DB local |
| Khi đổi khóa | Cập nhật đồng thời Render và GitHub Secrets |
| Khi có người dùng thật | Cân nhắc Render Starter (không ngủ) và Atlas có sao lưu tự động |

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp |
| --- | --- |
| Đăng nhập xong quay về trang chủ nhưng vẫn chưa đăng nhập | Web mở bằng `*.pages.dev` thay vì `jotly.io.vn`; hoặc `FRONTEND_ORIGINS` không khớp |
| `redirect_uri_mismatch` ở Google | `GOOGLE_REDIRECT_URI` khác URI đã khai ở Google Console |
| Tải ảnh lỗi "CORS" | CORS của bucket R2 thiếu `https://jotly.io.vn` hoặc phương thức `PUT` |
| Ảnh lỗi `SignatureDoesNotMatch` | `S3_PUBLIC_ENDPOINT_URL` sai, hoặc đồng hồ máy lệch |
| Render deploy lỗi ở migration | User DB thiếu quyền `dbAdmin` trên `jotly` |
| `ServerSelectionTimeoutError` | Atlas Network Access chưa có `0.0.0.0/0`, hoặc sai mật khẩu trong `MONGODB_URI` |
| API chậm ~1 phút lần đầu | Render Free đang ngủ — bình thường với gói này |
| Workflow Jobs không tự chạy | Lịch bị tắt sau 60 ngày không commit; hoặc cron GitHub trễ |
