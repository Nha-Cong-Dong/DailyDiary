# DailyDiary – Tài liệu đặc tả kỹ thuật

|                       |                                                           |
| --------------------- | --------------------------------------------------------- |
| **Phiên bản**         | 0.1 (bản nháp)                                            |
| **Ngày cập nhật**     | 16/10/2026                                                |
| **Phạm vi**           | Giai đoạn 1 – MVP (web app), kèm định hướng giai đoạn 2–3 |
| **Quy mô thử nghiệm** | Dưới 20 người dùng                                        |
| **Thời gian MVP**     | 2 tuần                                                    |

---

## 1. Tổng quan dự án

### 1.1. Vấn đề

Nhiều người có thói quen ghi lại cuộc sống của mình: viết nhật ký, lưu ảnh, trang trí sổ. Song song đó, ngày càng nhiều người muốn thay thế các nguồn "dopamine nhanh" (mạng xã hội, video ngắn) bằng các nguồn dopamine lành mạnh hơn như tập luyện, học tập, rèn thói quen tốt. Điểm chung là cảm giác tiến bộ khi nhìn lại hành trình của bản thân.

Tuy nhiên, sổ giấy khó mang theo, khó tìm lại, dễ thất lạc. Các ứng dụng ghi chú thông thường lại khô khan và không giúp người dùng thấy sự thay đổi của mình theo thời gian.

### 1.2. Giải pháp

**DailyDiary** là ứng dụng nhật ký giúp người dùng ghi lại suy nghĩ, tâm trạng và hình ảnh mỗi ngày: tiện lợi, trực quan, dễ chịu khi nhìn lại tiến trình, sự phát triển và biến động tâm trạng của chính mình.

### 1.3. Mục tiêu của MVP

MVP chứng minh một điều duy nhất: **ghi lại mỗi ngày thật dễ, và nhìn lại thì thấy vui.**

Mục tiêu cụ thể:
- Có web app chạy thật, người dùng thử truy cập được qua một đường link.
- Người dùng ghi được một ngày trong vài giây (chỉ cần chọn biểu tượng chấm điểm).
- Người dùng nhìn lại được hành trình qua dòng thời gian, lịch tháng và Year in Pixels.
- Thu thập dữ liệu sử dụng và góp ý để quyết định hướng phát triển.

### 1.4. Chỉ số thành công (tiêu chí chuyển sang giai đoạn 2)

| Chỉ số                                                          | Cách đo                                   |
| --------------------------------------------------------------- | ----------------------------------------- |
| Tỉ lệ người dùng còn hoạt động sau 7 ngày (D7) và 30 ngày (D30) | Sự kiện đăng nhập / tạo bài viết          |
| Số ngày được ghi trung bình mỗi tuần / người                    | Bảng `entries`                            |
| Tỉ lệ bài ghi "đúng ngày" so với "cập nhật muộn"                | So sánh `updated_at` với `entry_date`     |
| Thiết bị người dùng thường dùng để ghi                          | Phân tích sự kiện (máy tính / điện thoại) |
| Mức sẵn sàng giới thiệu cho người khác (NPS)                    | Khảo sát sau 2–4 tuần                     |

### 1.5. Đối tượng người dùng

- Người muốn viết nhật ký, lưu lại kỷ niệm trên thiết bị của mình.
- Người đang viết nhật ký giấy, muốn chuyển sang hoặc kết hợp thêm dạng số.
- Người yêu thích trang trí sổ (bullet journal, scrapbook).
- Người đang xây dựng lối sống lành mạnh hơn và muốn nhìn thấy sự tiến bộ.
- Học sinh, sinh viên muốn lưu lại hành trình học tập, ôn thi, du học.
- Người quan tâm sức khỏe tinh thần, muốn theo dõi tâm trạng.
- Cặp đôi, nhóm bạn, gia đình muốn lưu giữ kỷ niệm chung *(giai đoạn sau)*.
- Cha mẹ muốn ghi lại quá trình lớn lên của con.
- Người thích du lịch muốn lưu hành trình bằng chữ và ảnh.
- Người đang trải qua giai đoạn thay đổi lớn trong cuộc sống.

---

## 2. Phạm vi MVP

### 2.1. Trong phạm vi

- Trải nghiệm **cá nhân**: một người dùng, nhật ký riêng.
- Nền tảng: **web app**, ưu tiên trình duyệt trên máy tính (Chrome, Edge); giao diện responsive để dùng được trên điện thoại. Luồng "ghi nhanh" (chọn biểu tượng, thêm ảnh) phải mượt trên điện thoại.
- Đăng nhập bằng tài khoản Google.

### 2.2. Ngoài phạm vi MVP

- Tính năng nhiều người dùng: chia sẻ nhật ký, nhật ký chung, bình luận.
- Đăng nhập Facebook và các nhà cung cấp khác.
- Đổi chủ đề, theme, trang trí, sticker.
- AI, video tổng kết, thông báo đẩy.
- Ứng dụng desktop, ứng dụng di động.
- Thanh toán, tiền ảo.

---

## 3. Danh sách tính năng

Ký hiệu mức ưu tiên: **P0** bắt buộc · **P1** nên có nếu kịp · **P2** để giai đoạn sau.

| Mã   | Tính năng                                  | Ưu tiên      |
| ---- | ------------------------------------------ | ------------ |
| F-01 | Viết nhật ký trong ngày                    | P0           |
| F-02 | Dòng thời gian, lịch tháng, thống kê tháng | P0           |
| F-03 | Year in Pixels                             | P0           |
| F-04 | Đăng nhập Google, hồ sơ người dùng         | P0           |
| F-05 | Tìm kiếm theo từ khóa                      | P0           |
| F-06 | Tự động lưu, trạng thái đồng bộ            | P0           |
| F-07 | Xóa tài khoản và toàn bộ dữ liệu           | P1 (đề xuất) |
| F-08 | Xuất dữ liệu (JSON)                        | P1 (đề xuất) |
| F-09 | Nút góp ý trong app                        | P1 (đề xuất) |

### F-01. Viết nhật ký trong ngày

Mỗi người dùng có tối đa **1 nhật ký cho mỗi ngày**. Mỗi nhật ký gồm:

| Trường                       | Bắt buộc | Thông số                                                            |
| ---------------------------- | -------- | ------------------------------------------------------------------- |
| Tiêu đề                      | Không    | 0–100 ký tự                                                         |
| Nội dung                     | Không    | 0–20.000 ký tự, văn bản thuần, chuẩn hóa Unicode NFC                |
| Từ khóa                      | Không    | 0–10 từ khóa, mỗi từ 1–30 ký tự, không trùng lặp                    |
| Cờ hiệu                      | Không    | 1 màu từ bảng 8–12 màu cố định (lưu mã hex); có lựa chọn "không cờ" |
| Ảnh                          | Không    | 0–10 ảnh/ngày                                                       |
| Biểu tượng chính (main icon) | **Có**   | Điểm số nguyên 1–5, thuộc một bộ chủ đề (MVP có 1–3 bộ)             |
| Biểu tượng con (sub icon)    | Không    | 0–1 emoji, chọn từ danh sách khoảng 30–50 emoji gợi ý               |

Quy tắc:
- **Điều kiện "đã ghi"**: đã chọn biểu tượng chính. Mọi trường khác là tùy chọn, giúp giữ chân người dùng khi họ nhất thời chán nản.
- **Ngày được phép ghi**: hôm nay và các ngày trước; không cho ghi ngày tương lai. "Ngày" tính theo múi giờ của người dùng.
- **Thời gian khởi tạo và sửa cuối** được lưu lại. Bài có lần sửa cuối nằm trong chính ngày đó hiện nhãn **"ghi đúng ngày"**; ngược lại hiện **"cập nhật muộn"**, nhằm khuyến khích người dùng ghi ngay trong ngày.
- **Sửa, xóa**: cho phép. Xóa cần xác nhận và là **xóa mềm**, khôi phục được trong 30 ngày.
- **Hiển thị biểu tượng**: sub icon hiển thị nhỏ cạnh main icon, tỉ lệ kích thước sub/main khoảng 0,5–0,6 (đặt thành biến giao diện để dễ điều chỉnh).

Ảnh:
- Định dạng nhận vào: JPEG, PNG, WebP; tối đa 10 MB/ảnh gốc. Ảnh HEIC báo lỗi rõ ràng.
- Nén trên trình duyệt trước khi tải lên: cạnh dài tối đa 1920 px, WebP chất lượng khoảng 80% (khoảng 300–500 KB).
- Tạo ảnh thu nhỏ cạnh dài khoảng 320 px cho dòng thời gian và lịch.
- Không lưu ảnh gốc ở MVP; thông báo cho người dùng biết ảnh gốc vẫn nằm trên máy của họ.

### F-02. Dòng thời gian, lịch tháng, thống kê tháng

- **Danh sách bài gần đây**: 10–20 bài mỗi lần tải, cuộn để tải thêm, mới nhất ở trên.
- **Lịch tháng**: mỗi ngày hiển thị main icon và sub icon thu nhỏ. Dữ liệu cả tháng lấy trong **1 request**, chỉ gồm ngày, điểm, mã bộ biểu tượng, sub icon, màu cờ; không tải nội dung bài viết.
- **Thống kê tháng**: số ngày đã ghi / tổng số ngày; điểm trung bình; phân bố điểm 1–5; tổng số ảnh; chuỗi ngày ghi liên tiếp dài nhất; biểu đồ điểm theo ngày.
- Thời gian tải lịch + thống kê: dưới 1 giây.

### F-03. Year in Pixels

- Lưới 365/366 ô sắp theo 12 tháng, mỗi ô tô màu theo điểm 1–5; ngày chưa ghi dùng màu trung tính.
- Dữ liệu cả năm lấy trong **1 request** (chỉ ngày + điểm + màu cờ, vài KB).
- Rê chuột để xem nhanh, bấm để mở nhật ký ngày đó.
- Chọn năm: chỉ các năm có dữ liệu.
- (Tùy chọn) chế độ tô màu theo cờ hiệu.

### F-04. Đăng nhập và hồ sơ

- Đăng nhập bằng Google (OAuth 2.0). Trong giai đoạn thử nghiệm, để OAuth ở chế độ **Testing** và thêm email người dùng thử vào danh sách.
- Phiên đăng nhập 30 ngày, tự làm mới.
- Hồ sơ gồm:

| Trường         | Hiển thị | Thông số                                                                                                                                                                         |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ảnh đại diện   | Có       | Lấy từ Google; nếu cho đổi: tối đa 2 MB, cắt về 256×256 px                                                                                                                       |
| Tên người dùng | Có       | 1–50 ký tự, mặc định lấy từ Google                                                                                                                                               |
| Múi giờ        | Không    | Định dạng IANA (vd: `Asia/Ho_Chi_Minh`), tự nhận từ trình duyệt khi đăng ký, cho phép sửa. Dùng để xác định thời điểm kết thúc ngày. Đổi múi giờ chỉ áp dụng cho các ngày sau đó |

### F-05. Tìm kiếm

- Phạm vi: chỉ trường từ khóa.
- Không phân biệt hoa thường, không phân biệt dấu (`da lat` khớp `Đà Lạt`), khớp theo đầu từ.
- 20–50 kết quả/trang, mới nhất trước. Thời gian phản hồi dưới 500 ms.

### F-06. Tự động lưu

- Lưu nháp vào IndexedDB của trình duyệt sau 1 giây ngừng gõ.
- Đồng bộ lên máy chủ sau 3–5 giây ngừng gõ, khi rời trang hoặc chuyển tab; chỉ gửi khi nội dung thay đổi.
- Hiển thị 3 trạng thái: **Đang lưu / Đã lưu / Chưa đồng bộ (mất mạng)**.
- Khi lỗi: tự thử lại với thời gian chờ tăng dần (2, 4, 8... giây); cảnh báo khi đóng tab còn dữ liệu chưa đồng bộ.
- Mở cùng nhật ký ở 2 tab: gửi kèm thời gian sửa cuối; nếu máy chủ có bản mới hơn thì báo người dùng thay vì ghi đè.

### F-07 – F-09. Tính năng đề xuất bổ sung

- **Xóa tài khoản**: xóa toàn bộ nhật ký và ảnh của người dùng.
- **Xuất dữ liệu**: tải về toàn bộ nhật ký dạng JSON. Cam kết luôn miễn phí.
- **Góp ý**: form ngắn trong app, lưu vào bảng `feedback`.

---

## 4. Yêu cầu phi tính năng

### 4.1. Bảo mật và quyền riêng tư

| Yêu cầu             | Thông số                                                                                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kết nối             | HTTPS bắt buộc, TLS 1.2 trở lên, bật HSTS                                                                                                                                                                                              |
| Phân quyền          | Mỗi người chỉ đọc/ghi/sửa/xóa dữ liệu của mình. Mọi truy vấn ở backend đều lọc theo `user_id` lấy từ phiên đăng nhập, không lấy từ tham số người dùng gửi lên. (Tùy chọn) bật Row Level Security của PostgreSQL làm lớp bảo vệ thứ hai |
| Ảnh                 | Kho ảnh riêng tư; truy cập bằng link có thời hạn khoảng 1 giờ                                                                                                                                                                          |
| Phiên đăng nhập     | Lưu trong cookie `HttpOnly`, `Secure`, `SameSite=Lax`; có chống CSRF cho các request ghi                                                                                                                                               |
| Log                 | Chỉ ghi mã người dùng, API, mã trạng thái, thời gian xử lý. **Không ghi** tiêu đề, nội dung, từ khóa, ảnh. Giữ log 14–30 ngày                                                                                                          |
| Công cụ bắt lỗi     | Lọc bỏ nội dung nhật ký khỏi dữ liệu gửi về                                                                                                                                                                                            |
| Kiểm thử phân quyền | Dùng tài khoản A gọi API lấy/sửa dữ liệu của B phải bị từ chối                                                                                                                                                                         |
| Pháp lý             | Có trang chính sách quyền riêng tư ngắn gọn. Trước khi ra mắt công khai, rà soát quy định bảo vệ dữ liệu cá nhân của Việt Nam                                                                                                          |
| Quản trị máy chủ    | Nếu dùng SSH: chỉ đăng nhập bằng SSH key, tắt đăng nhập root, không đưa private key lên repo                                                                                                                                           |

### 4.2. Toàn vẹn dữ liệu

| Yêu cầu                   | Thông số                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Sao lưu cơ sở dữ liệu     | Mỗi 8 tiếng theo giờ cố định của hệ thống: 00:00, 08:00, 16:00 giờ Việt Nam           |
| Thời gian giữ bản sao lưu | 7 ngày (21 bản)                                                                       |
| Sao lưu ảnh               | Sao chép định kỳ sang nơi lưu trữ khác (sao lưu cơ sở dữ liệu không bao gồm file ảnh) |
| Kiểm tra khôi phục        | Thử khôi phục ít nhất 1 lần trước khi mời người dùng                                  |
| Múi giờ                   | `entry_date` là ngày địa phương của người dùng; mọi mốc thời gian khác lưu dạng UTC   |
| Xóa mềm                   | Bài xóa giữ 30 ngày rồi mới xóa hẳn (kèm ảnh)                                         |

### 4.3. Hiệu năng

| Chỉ số                   | Mục tiêu                         |
| ------------------------ | -------------------------------- |
| API đọc/ghi nhật ký      | p95 dưới 500 ms                  |
| Tải trang (LCP)          | Dưới 2,5 giây                    |
| Phản hồi tương tác (INP) | Dưới 200 ms                      |
| Độ ổn định bố cục (CLS)  | Dưới 0,1                         |
| Tải lên 1 ảnh đã nén     | Dưới 5 giây với mạng bình thường |
| Thời gian hoạt động      | Khoảng 99%                       |

### 4.4. Giới hạn tần suất (rate limit)

| Loại thao tác       | Giới hạn                       |
| ------------------- | ------------------------------ |
| Đồng bộ tự động lưu | 15–20 request/phút/người       |
| Đọc dữ liệu         | 30 request/phút/người          |
| Tạo/xóa nhật ký     | 10 request/phút/người          |
| Tải ảnh lên         | 10 lần/phút, 50 lần/ngày/người |
| Đăng nhập           | 5 lần/phút/IP                  |

Các con số là mức trần chống lạm dụng, không phải mức sử dụng dự kiến. Điều chỉnh sau tuần thử nghiệm đầu tiên dựa trên log.

### 4.5. Dung lượng

| Hạng mục                     | Thông số                                                |
| ---------------------------- | ------------------------------------------------------- |
| Hạn mức mỗi người dùng       | 500 MB trong giai đoạn thử nghiệm; cảnh báo khi đạt 80% |
| Ước tính trường hợp xấu nhất | 10 ảnh × 0,5 MB × 365 ngày ≈ 1,8 GB/người/năm           |

Theo dõi tổng dung lượng ảnh hằng tuần và đối chiếu với giới hạn gói dịch vụ đang dùng.

### 4.6. Tương thích

- Bản mới của Chrome, Edge, Firefox, Safari trên máy tính.
- Responsive cho màn hình điện thoại (từ 360 px).
- Phông chữ hỗ trợ tốt tiếng Việt có dấu (vd: Be Vietnam Pro).

### 4.7. Theo dõi và đo lường

- Bắt lỗi: Sentry (frontend và backend).
- Phân tích hành vi ở mức sự kiện, không thu thập nội dung: PostHog hoặc Umami. Sự kiện chính: `login`, `entry_created`, `entry_updated`, `photo_uploaded`, `calendar_viewed`, `pixels_viewed`, `search_used`.

---

## 5. Kiến trúc hệ thống

### 5.1. Sơ đồ tổng thể

```mermaid
flowchart LR
    U[Trình duyệt người dùng] -->|HTTPS| FE[Frontend<br/>React + Vite<br/>static hosting/CDN]
    U -->|HTTPS + cookie phiên| API[Backend<br/>FastAPI]
    U -->|HTTPS, presigned URL| S3[(Object Storage<br/>kho ảnh riêng tư)]
    U --- IDB[(IndexedDB<br/>bản nháp)]
    API -->|OAuth 2.0| G[Google]
    API --> DB[(PostgreSQL)]
    API -->|tạo presigned URL| S3
    API --> SEN[Sentry]
    FE --> AN[PostHog / Umami]
    BK[Tác vụ định kỳ<br/>sao lưu, dọn xóa mềm] --> DB
    BK --> S3
```

### 5.2. Công nghệ sử dụng

**Frontend**

| Thành phần            | Công nghệ                                                  |
| --------------------- | ---------------------------------------------------------- |
| Ngôn ngữ, framework   | TypeScript, React, Vite                                    |
| Định tuyến            | React Router                                               |
| Gọi API, bộ nhớ đệm   | TanStack Query                                             |
| Giao diện             | Tailwind CSS, shadcn/ui, biểu tượng Lucide                 |
| Xử lý ngày, múi giờ   | date-fns + date-fns-tz                                     |
| Nén ảnh               | browser-image-compression                                  |
| Lưu nháp              | IndexedDB (thư viện `idb`)                                 |
| Biểu đồ               | Recharts                                                   |
| Kiểm tra dữ liệu form | Zod                                                        |
| Kiểu dữ liệu API      | Sinh tự động từ OpenAPI của FastAPI (`openapi-typescript`) |

**Backend**

| Thành phần                | Công nghệ                                                |
| ------------------------- | -------------------------------------------------------- |
| Ngôn ngữ, framework       | Python 3.12, FastAPI, Uvicorn                            |
| Kiểm tra dữ liệu          | Pydantic v2                                              |
| ORM, migration            | SQLAlchemy 2 (async) + asyncpg, Alembic                  |
| Đăng nhập Google          | Authlib (OAuth 2.0 Authorization Code)                   |
| Rate limit                | slowapi                                                  |
| Kho ảnh                   | boto3 (giao thức tương thích S3), tạo presigned URL      |
| Kiểm tra ảnh phía server  | Kiểm tra ảnh đã tải lên kho: tồn tại, định dạng (magic bytes), dung lượng. Không xử lý ảnh; ảnh thu nhỏ tạo trên trình duyệt (MVP không dùng Pillow) |
| Kiểm thử, chất lượng code | pytest, ruff                                             |

**Hạ tầng**

| Thành phần            | Lựa chọn đề xuất                                                        |
| --------------------- | ----------------------------------------------------------------------- |
| Cơ sở dữ liệu         | PostgreSQL 16 có quản lý (vd: Supabase, Neon), bật extension `unaccent` |
| Kho ảnh               | Object storage tương thích S3 (vd: Supabase Storage, Cloudflare R2)     |
| Hosting frontend      | Vercel, Netlify hoặc Cloudflare Pages                                   |
| Hosting backend       | Render, Railway hoặc Fly.io                                             |
| Khu vực máy chủ       | Singapore (gần Việt Nam)                                                |
| Môi trường phát triển | Windows + WSL2, Docker Compose (PostgreSQL + MinIO giả lập S3)          |
| CI                    | GitHub Actions: lint, test, build                                       |

**Lưu ý tên miền:** để cookie phiên hoạt động ổn định, đặt frontend và backend chung tên miền gốc, ví dụ `app.dailydiary.xxx` và `api.dailydiary.xxx`, hoặc dùng proxy để frontend gọi API qua cùng tên miền.

### 5.3. Cấu trúc repo (monorepo)

```
dailydiary/
├── apps/
│   ├── web/                    # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── api/            # client sinh từ OpenAPI
│   │   │   ├── features/       # entry, timeline, pixels, search, profile
│   │   │   ├── components/
│   │   │   └── lib/            # date, image, autosave, storage (IndexedDB)
│   │   └── vite.config.ts
│   └── api/                    # FastAPI
│       ├── app/
│       │   ├── routers/        # auth, me, entries, photos, calendar, pixels, search
│       │   ├── models/         # SQLAlchemy
│       │   ├── schemas/        # Pydantic
│       │   ├── services/       # logic nghiệp vụ, storage, giới hạn
│       │   └── core/           # cấu hình, bảo mật, rate limit, logging
│       ├── alembic/            # migration
│       └── tests/
├── shared/
│   ├── limits.json             # giới hạn: số ảnh, độ dài, rate limit theo cấp tài khoản
│   ├── icons.json              # danh mục bộ biểu tượng, sub icon gợi ý
│   └── flag_colors.json        # bảng màu cờ hiệu
├── seed/                       # dữ liệu mẫu 3 tháng để demo
├── docs/                       # tài liệu ý tưởng, đặc tả, quyết định kỹ thuật
├── docker-compose.yml          # PostgreSQL + MinIO cho môi trường local
└── .github/workflows/
```

`shared/` chứa các giới hạn và danh mục dùng chung cho cả frontend và backend. Khi đổi giới hạn (vd: khi bắt đầu kiếm tiền), chỉ sửa một nơi.

### 5.4. Mô hình dữ liệu

```
users
  id                uuid PK
  google_sub        text UNIQUE         -- định danh Google
  email             text
  display_name      varchar(50)
  avatar_url        text
  timezone          text                -- IANA, vd Asia/Ho_Chi_Minh
  account_tier      text                -- beta | free | premium
  joined_at         timestamptz
  deleted_at        timestamptz NULL

entries
  id                uuid PK
  user_id           uuid FK -> users
  entry_date        date                -- ngày địa phương của người dùng
  title             varchar(100) NULL
  content           text NULL           -- tối đa 20.000 ký tự
  score             smallint            -- 1..5, bắt buộc
  icon_set_id       text                -- mã bộ biểu tượng
  sub_icon          text NULL           -- 1 emoji
  flag_color        char(7) NULL        -- #RRGGBB
  created_at        timestamptz
  updated_at        timestamptz
  deleted_at        timestamptz NULL    -- xóa mềm
  UNIQUE (user_id, entry_date)

entry_keywords
  entry_id          uuid FK -> entries
  keyword           varchar(30)
  keyword_norm      varchar(30)         -- chữ thường, không dấu
  PRIMARY KEY (entry_id, keyword_norm)
  INDEX (keyword_norm)

entry_photos
  id                uuid PK
  entry_id          uuid FK -> entries
  storage_key       text                -- user_id/YYYY/MM/DD/<id>.webp
  thumb_key         text
  width, height     int
  size_bytes        int
  position          smallint            -- thứ tự 0..9
  created_at        timestamptz

user_items                              -- chuẩn bị cho giai đoạn 2–3
  user_id           uuid FK -> users
  item_id           text                -- mã bộ biểu tượng, chủ đề...
  source            text                -- beta | free | purchase | reward
  acquired_at       timestamptz

feedback
  id, user_id, message, created_at
```

Nguyên tắc:
- Cơ sở dữ liệu chỉ lưu **mã** biểu tượng, chủ đề; hình biểu tượng là file tĩnh của frontend.
- Ảnh không lưu trong cơ sở dữ liệu; chỉ lưu đường dẫn trong kho ảnh.
- Đường dẫn ảnh đặt theo `user_id` để dễ phân quyền, tính dung lượng và xóa khi người dùng xóa tài khoản.

### 5.5. Danh sách API (MVP)

| Phương thức | Đường dẫn                           | Mô tả                                                                  |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------- |
| GET         | `/auth/google/login`                | Chuyển hướng sang Google                                               |
| GET         | `/auth/google/callback`             | Nhận kết quả, tạo/cập nhật người dùng, đặt cookie phiên                |
| POST        | `/auth/logout`                      | Đăng xuất                                                              |
| GET         | `/me`                               | Lấy hồ sơ                                                              |
| PATCH       | `/me`                               | Sửa tên, ảnh đại diện, múi giờ                                         |
| DELETE      | `/me`                               | Xóa tài khoản và toàn bộ dữ liệu                                       |
| GET         | `/entries?cursor=&limit=`           | Danh sách bài gần đây (phân trang theo con trỏ)                        |
| GET         | `/entries/{date}`                   | Nhật ký của một ngày                                                   |
| PUT         | `/entries/{date}`                   | Tạo hoặc cập nhật (gửi kèm `updated_at` đã biết để phát hiện xung đột) |
| DELETE      | `/entries/{date}`                   | Xóa mềm                                                                |
| POST        | `/entries/{date}/restore`           | Khôi phục bài đã xóa mềm                                               |
| POST        | `/entries/{date}/photos/upload-url` | Xin presigned URL để tải ảnh trực tiếp lên kho                         |
| POST        | `/entries/{date}/photos`            | Xác nhận ảnh chính và ảnh thu nhỏ đã tải (do trình duyệt tạo), lưu thông tin |
| PATCH       | `/entries/{date}/photos/order`      | Sắp xếp lại ảnh                                                        |
| DELETE      | `/photos/{id}`                      | Xóa ảnh                                                                |
| GET         | `/calendar/{year}/{month}`          | Dữ liệu lịch tháng + thống kê tháng                                    |
| GET         | `/pixels/{year}`                    | Dữ liệu Year in Pixels                                                 |
| GET         | `/search?q=&cursor=`                | Tìm kiếm theo từ khóa                                                  |
| GET         | `/export`                           | Xuất toàn bộ dữ liệu dạng JSON                                         |
| POST        | `/feedback`                         | Gửi góp ý                                                              |

### 5.6. Các luồng chính

**Đăng nhập**
1. Người dùng bấm "Đăng nhập với Google", trình duyệt chuyển đến `/auth/google/login`.
2. Google xác thực và gọi lại `/auth/google/callback`.
3. Backend xác minh token, tạo hoặc cập nhật bản ghi `users` (lấy múi giờ từ trình duyệt ở lần đầu), đặt cookie phiên `HttpOnly`.

**Tải ảnh**
1. Frontend nén ảnh và tạo bản thu nhỏ trên trình duyệt.
2. Frontend gọi `/photos/upload-url`; backend kiểm tra giới hạn (số ảnh/ngày, dung lượng, rate limit) rồi trả presigned URL.
3. Frontend tải ảnh trực tiếp lên kho ảnh (không đi qua backend).
4. Frontend gọi `/photos` để xác nhận; backend kiểm tra file thực sự tồn tại, đúng định dạng, đúng kích thước rồi lưu `entry_photos`.

**Tự động lưu**
1. Mỗi thay đổi ghi vào IndexedDB sau 1 giây.
2. Sau 3–5 giây không gõ (hoặc khi rời trang), gửi `PUT /entries/{date}` kèm `updated_at` đã biết.
3. Máy chủ có bản mới hơn: trả lỗi xung đột, giao diện hỏi người dùng giữ bản nào.
4. Mất mạng: giữ trong IndexedDB, hiện "Chưa đồng bộ", thử lại tăng dần.

**Xác định ngày**
- Frontend tính `entry_date` theo múi giờ trong hồ sơ người dùng.
- Backend kiểm tra `entry_date` không lớn hơn "hôm nay" theo múi giờ đó.
- Nhãn "ghi đúng ngày": `updated_at` (đổi sang múi giờ người dùng) có cùng ngày với `entry_date`.

### 5.7. Môi trường và triển khai

| Môi trường        | Mục đích                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Local             | Docker Compose (PostgreSQL + MinIO), Google OAuth với `localhost`                                                       |
| Production (beta) | Frontend trên static hosting, backend trên dịch vụ PaaS, cơ sở dữ liệu + kho ảnh có quản lý, tất cả ở khu vực Singapore |

- Triển khai tự động khi đẩy code lên nhánh `main` (sau khi CI chạy qua).
- Migration cơ sở dữ liệu chạy bằng Alembic trong bước triển khai.
- Bí mật (khóa OAuth, khóa kho ảnh, chuỗi kết nối) lưu trong biến môi trường của dịch vụ hosting, không đưa vào repo.

### 5.8. Lưu trữ dữ liệu theo giai đoạn

|                           | Giai đoạn 1                       | Giai đoạn 2                              | Giai đoạn 3                                         |
| ------------------------- | --------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| Thông tin ngày + nội dung | PostgreSQL                        | + bộ nhớ đệm IndexedDB các tháng gần đây | + SQLite trên điện thoại, đồng bộ hai chiều         |
| Ảnh                       | Kho riêng tư, bản nén + ảnh nhỏ   | Có thể chuyển sang kho rẻ hơn            | Phân tầng nóng/lạnh; gói trả phí giữ chất lượng cao |
| Biểu tượng, chủ đề        | Đóng gói trong frontend           | CDN có đánh số phiên bản                 | CDN + cửa hàng vật phẩm                             |
| Bản nháp                  | IndexedDB                         | IndexedDB + hàng đợi đồng bộ ngoại tuyến | Cơ sở dữ liệu trên máy                              |
| Giao dịch                 | Chưa có (đã có bảng `user_items`) | Chưa có                                  | Sổ cái riêng, chỉ thêm, chỉ server được ghi         |
| Mã hóa                    | Mã hóa khi lưu của nhà cung cấp   | Như giai đoạn 1                          | (Tùy chọn) mã hóa đầu cuối do người dùng bật        |

---

## 6. Kế hoạch triển khai

### 6.1. Kế hoạch 2 tuần cho MVP

| Ngày | Công việc                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------- |
| 1–2  | Phác thảo giao diện (Figma), dựng monorepo, Docker Compose, mô hình dữ liệu, migration đầu tiên |
| 3    | Đăng nhập Google, hồ sơ, múi giờ                                                                |
| 4–5  | Viết/sửa/xóa nhật ký: các trường chữ, từ khóa, cờ hiệu, main icon, sub icon; tự động lưu        |
| 6–7  | Tải ảnh (nén, presigned URL, ảnh thu nhỏ); dòng thời gian                                       |
| 8–9  | Lịch tháng + thống kê tháng                                                                     |
| 10   | Year in Pixels                                                                                  |
| 11   | Tìm kiếm; xuất dữ liệu; xóa tài khoản; góp ý                                                    |
| 12   | Rate limit, hạn mức dung lượng, log, Sentry, phân tích sự kiện                                  |
| 13   | Hoàn thiện giao diện, kiểm tra trên điện thoại, nạp dữ liệu mẫu, triển khai production          |
| 14   | Kiểm thử phân quyền, thử khôi phục sao lưu, sửa lỗi, chuẩn bị demo                              |

Trước khi mời người dùng thử: tự dùng app viết nhật ký thật 2–3 ngày để phát hiện lỗi múi giờ, tự động lưu, tải ảnh.

### 6.2. Lộ trình các giai đoạn

**Giai đoạn 1 – MVP:** kiểm chứng thói quen ghi chép. Web app, trải nghiệm cá nhân, dưới 20 người dùng thử.

**Giai đoạn 2 – Hoàn thiện, tăng giữ chân:**
- PWA (cài lên màn hình chính điện thoại), nhắc nhở viết nhật ký (thông báo đẩy, email dự phòng).
- Cá nhân hóa: chủ đề, theme, bộ biểu tượng. Xác định rõ phần **miễn phí vĩnh viễn** và phần sẽ là nội dung trả phí mới.
- Tính năng mở rộng: "ngày này năm trước", tiến trình/mục tiêu với so sánh trước – sau, thư gửi tương lai.
- Đăng nhập thêm Facebook.
- Đánh giá lại trọng tâm nền tảng dựa trên dữ liệu thiết bị của giai đoạn 1.

**Giai đoạn 3 – Ra mắt và kiếm tiền:**
- Ứng dụng di động (bọc web bằng Capacitor hoặc viết bằng React Native).
- Cửa hàng gói cá nhân hóa, tiền ảo; cân nhắc thêm gói thuê bao cho dung lượng ảnh, video tổng kết.
- Tính năng chia sẻ: nhật ký chung, nhật ký trao đổi luân phiên.
- Backend xử lý thanh toán, sổ cái giao dịch.

### 6.3. So sánh hướng nền tảng

| Tiêu chí               | Web app (+ PWA)          | Desktop app             | Mobile app                             |
| ---------------------- | ------------------------ | ----------------------- | -------------------------------------- |
| Tốc độ làm             | Nhanh nhất               | Trung bình              | Chậm nhất                              |
| Rào cản người dùng mới | Thấp nhất (gửi link)     | Cao                     | Trung bình                             |
| Bối cảnh viết nhật ký  | Tốt trên máy tính        | Hợp người viết dài      | Phù hợp nhất                           |
| Nhắc nhở               | Hạn chế (nhất là iPhone) | Chỉ khi máy bật         | Tốt nhất                               |
| Kiếm tiền              | Tự chọn cổng thanh toán  | Tự chọn cổng thanh toán | Thuận tiện nhưng chịu phí kho ứng dụng |
| Tiềm năng dài hạn      | Nền tảng kiểm chứng      | Thấp                    | Cao nhất                               |

Hướng chọn: web + PWA ở giai đoạn 1–2 → mobile khi đã chứng minh được giữ chân → desktop ưu tiên thấp.

---

## 7. Chiến lược kiếm tiền và giới hạn

### 7.1. Nguyên tắc cam kết từ giai đoạn 1

- **Dữ liệu thuộc về người dùng**: viết, xem lại, tìm kiếm, xuất nhật ký luôn miễn phí.
- **Không lấy lại những gì đã có**: ảnh đã tải lên luôn xem được; vật phẩm đã nhận luôn giữ.
- **Thu tiền cho cái mới, không thu tiền cho cái cũ.**
- **Minh bạch**: ghi rõ bản beta, giới hạn có thể thay đổi, công bố trước những gì miễn phí vĩnh viễn.

### 7.2. Định hướng gói miễn phí lâu dài

| Hạng mục                                | Chi phí vận hành | Gói miễn phí lâu dài                            |
| --------------------------------------- | ---------------- | ----------------------------------------------- |
| Bài viết, chữ, từ khóa                  | Rất thấp         | Không giới hạn                                  |
| Bộ biểu tượng cơ bản, sub icon, cờ hiệu | Không đáng kể    | Miễn phí                                        |
| Lịch, Year in Pixels, thống kê tháng    | Thấp             | Miễn phí; thống kê nâng cao có thể trả phí      |
| Ảnh                                     | Cao nhất         | Ví dụ 3–5 ảnh/ngày; nhiều hơn thuộc gói trả phí |
| Chủ đề, bộ biểu tượng mới               | Chi phí thiết kế | Nội dung trả phí trong cửa hàng                 |

### 7.3. Biện pháp khi bật chế độ kiếm tiền

1. Ưu đãi người dùng sớm: giữ vĩnh viễn một phần quyền lợi beta, huy hiệu "Thành viên sáng lập".
2. Báo trước ít nhất 30 ngày, giải thích lý do.
3. Ưu đãi mở bán cho người dùng beta.
4. Chạm giới hạn nhẹ nhàng: không bao giờ chặn việc lưu chữ và biểu tượng.
5. Có đường kiếm vật phẩm miễn phí theo **cột mốc** (30, 100 ngày), không thưởng theo từng bài, để giữ động lực "nhìn lại bản thân".
6. Thu thập dữ liệu sẵn sàng chi trả trong beta (khảo sát, thống kê chủ đề được dùng nhiều).

### 7.4. Chuẩn bị kỹ thuật

- Giới hạn lưu trong `shared/limits.json` theo **cấp tài khoản** (`beta`, `free`, `premium`).
- Bảng `user_items` có từ MVP để ghi nhận vật phẩm theo nguồn.
- Lưu `joined_at` để xác định người dùng beta.

---

## 8. Rủi ro và lưu ý

| Rủi ro                                                  | Biện pháp                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Trải nghiệm trên điện thoại kém làm giảm tỉ lệ quay lại | Tối ưu luồng ghi nhanh trên điện thoại ngay từ MVP; theo dõi thiết bị sử dụng                |
| Lỗi múi giờ làm bài viết rơi vào sai ngày               | `entry_date` là ngày địa phương; kiểm thử với các mốc gần nửa đêm                            |
| Mất bài viết khi mất mạng                               | IndexedDB + trạng thái đồng bộ rõ ràng + thử lại                                             |
| Lộ dữ liệu nhật ký                                      | Lọc theo `user_id` ở mọi truy vấn, kho ảnh riêng tư, không log nội dung, kiểm thử phân quyền |
| Chi phí lưu ảnh vượt dự kiến                            | Nén ảnh, không lưu ảnh gốc, hạn mức theo người, theo dõi hằng tuần                           |
| Phản ứng tiêu cực khi bắt đầu thu phí                   | Các nguyên tắc tại mục 7                                                                     |
| Tiền ảo phức tạp về kỹ thuật và pháp lý                 | Thiết kế sổ cái riêng; tìm hiểu quy định trước giai đoạn 3                                   |
| Tên "DailyDiary" trùng với nhiều app khác               | Kiểm tra tên miền, tên trên kho ứng dụng, khả năng đăng ký nhãn hiệu                         |

---

## 9. Câu hỏi mở / quyết định chưa chốt

- Nhà cung cấp cụ thể cho cơ sở dữ liệu, kho ảnh, hosting backend.
- Số bộ biểu tượng chính và danh sách sub icon cho MVP.
- Bảng màu cờ hiệu (8 hay 12 màu).
- Có cho đổi ảnh đại diện ở MVP hay chỉ dùng ảnh Google.
- Mốc thời gian và ngân sách cho giai đoạn 2 và 3.
- Hình thức kiếm tiền cuối cùng: chỉ bán vật phẩm, hay kết hợp thuê bao.

---

## Phụ lục A. Sản phẩm tham khảo

| Sản phẩm                            | Điểm nổi bật có thể học hỏi                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Day One                             | Tự gắn vị trí, thời tiết; "On This Day"; nhật ký chung có bình luận, tách biệt với nhật ký riêng           |
| Daylio                              | Ghi một ngày bằng 2 lần chạm; Year in Pixels; thống kê liên hệ hoạt động – tâm trạng; dữ liệu lưu trên máy |
| 1 Second Everyday                   | Tự ghép clip mỗi ngày thành video tổng kết; khuyến khích người dùng tìm trải nghiệm mới                    |
| Finch                               | Thú cưng ảo lớn lên theo thói quen tốt (lưu ý rủi ro dùng app quá lâu)                                     |
| Reflectly, Rosebud, Stoic, Mindsera | Câu hỏi gợi ý, quy trình sáng – tối, AI phân tích cảm xúc                                                  |

## Phụ lục B. Kho ý tưởng cho các giai đoạn sau

- Year in Pixels bằng ảnh thu nhỏ, viền màu theo tâm trạng.
- Slide/video tổng kết tháng, năm tự động.
- Trò chơi hóa nhẹ nhàng (cây, căn phòng lớn dần theo hành trình).
- Sổ tay trang trí số: sticker, washi tape, chữ viết tay.
- Nhật ký trao đổi luân phiên giữa hai người hoặc một nhóm.
- Thư gửi tương lai gắn với mục tiêu.
- So sánh "trước – sau" cho một tiến trình.
- Đối chiếu thời gian dùng mạng xã hội với tâm trạng (có sự đồng ý của người dùng).
- Bản địa hóa: âm lịch, ngày lễ, mẫu tổng kết dịp Tết.
- "Chương đời": AI tóm tắt mỗi tháng thành một chương (tùy chọn, minh bạch về dữ liệu).
- In nhật ký thành sách ảnh vật lý.

## Phụ lục C. Tài liệu và công cụ tham khảo

- **Tài liệu chính thức**: React, Vite, FastAPI, SQLAlchemy, Alembic, Authlib, PostgreSQL, MDN Web Docs.
- **Đăng nhập**: Google Cloud Console (OAuth client, consent screen).
- **Hiệu năng, bảo mật**: web.dev (Core Web Vitals), Lighthouse, PageSpeed Insights, OWASP Top 10.
- **Thiết kế**: Figma Community, Mobbin, Dribbble, Lucide, unDraw, Google Fonts.
- **Kiểm thử, góp ý**: pytest, Playwright, Google Forms, Tally.
- **Cộng đồng**: Viblo, Stack Overflow, các nhóm lập trình Việt Nam.
