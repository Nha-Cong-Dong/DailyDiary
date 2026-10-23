# DailyDiary – Kế hoạch xây dựng MVP theo từng bước

|                |                                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| **Trạng thái** | Đã duyệt; chốt Q1–Q3 (16/10/2026), Q11–Q13 (17/10/2026); xong bước 3 (21/10/2026) |
| **Ngày lập**   | 16/10/2026                                                                          |
| **Căn cứ**     | `docs/Project_Specs.md` v0.1 (mục 3–6), skill trong `.claude/` và `apps/*/.claude/` |

## Cách làm

- Mỗi bước là một **lát cắt dọc**, gồm đủ backend, frontend và test. Làm xong bước nào, app chạy được
  từ đầu đến cuối ở bước đó. Không làm hết backend rồi mới làm frontend.
- Xong mỗi bước thì **dừng lại để bạn duyệt** (xem demo, đọc tóm tắt) rồi mới sang bước sau. Mỗi bước
  làm trên một nhánh riêng (`step-NN-<tên>`). Chỉ commit hoặc merge khi bạn đồng ý.
- Mỗi bước ghi rõ: mục tiêu, phạm vi trong đặc tả, file chính, skill áp dụng, tiêu chí hoàn thành,
  và việc bạn cần chuẩn bị.
- Rate limit, kiểm tra quyền riêng tư và test truy cập chéo tài khoản làm **ngay trong bước viết endpoint**,
  không để dồn tới cuối.
- Cột "Ngày (mục 6.1)" chỉ để đối chiếu với kế hoạch 2 tuần trong đặc tả.

## Tổng quan

| Bước | Nội dung                                                                                        | Ngày (mục 6.1)  | Phụ thuộc |
| ---- | ----------------------------------------------------------------------------------------------- | --------------- | --------- |
| 0    | Chuẩn bị môi trường và chốt quyết định                                                          | trước ngày 1    | –         |
| 1    | Nền móng: monorepo, Docker, DB, khung API/web, CI                                               | 1–2             | 0         |
| 2    | Hướng giao diện và hệ thống thành phần                                                          | 1–2             | 1         |
| 3    | Đăng nhập Google, hồ sơ, múi giờ (F-04) — xong 21/10/2026                                      | 3               | 1         |
| 4    | *(Tùy chọn, khuyên làm)* Triển khai thử bản khung lên beta                                      | sớm hơn ngày 13 | 3         |
| 5    | Viết, sửa, xóa nhật ký (F-01, phần chữ và biểu tượng) — xong 21/10/2026                        | 4–5             | 3         |
| 6    | Tự động lưu và trạng thái đồng bộ (F-06) — xong 21/10/2026                                     | 4–5             | 5         |
| 7    | Ảnh: nén, presigned URL, xác nhận, sắp xếp, xóa (F-01, phần ảnh) — xong 23/10/2026             | 6–7             | 5         |
| 8    | Dòng thời gian (F-02, phần danh sách) — xong 23/10/2026                                        | 6–7             | 5, 7      |
| 9    | Lịch tháng và thống kê tháng (F-02) — xong 23/10/2026                                          | 8–9             | 5         |
| 10   | Year in Pixels (F-03) — xong 23/10/2026                                                         | 10              | 9         |
| 11   | Tìm kiếm theo từ khóa (F-05) — xong 23/10/2026                                                  | 11              | 5         |
| 11b  | Chia sẻ một trang qua link (F-10, ADR 0005; backend phần link làm sớm 21/10/2026)               | –               | 5, 7      |
| 12   | Xóa toàn bộ dữ liệu, xóa tài khoản, góp ý (F-07, F-09; bỏ xuất dữ liệu 21/10/2026)              | 11              | 7         |
| 13   | Vận hành: hạn mức dung lượng, Sentry, phân tích, tác vụ định kỳ, sao lưu                        | 12              | 7, 12     |
| 14   | Hoàn thiện giao diện, điện thoại, dữ liệu mẫu, chính sách quyền riêng tư, triển khai production | 13              | tất cả    |
| 15   | Kiểm thử phân quyền, thử khôi phục, tự dùng 2–3 ngày, chuẩn bị demo                             | 14              | 14        |

Những điểm khác với mục 6.1 và lý do:
- **F-06 tách khỏi F-01.** Tự động lưu (IndexedDB, thử lại, xử lý xung đột 409) đủ phức tạp để làm thành một bước riêng.
- **CI làm ngay ở bước 1**, để mọi bước sau đều có lint, test và build tự động.
- **Triển khai thử sớm (bước 4).** Cookie giữa hai tên miền, CORS, redirect OAuth và HTTPS là phần dễ hỏng nhất.
  Nếu đợi tới ngày 13 mới phát hiện thì sẽ quá muộn.
- **Rate limit không gom vào ngày 12.** Endpoint nào được viết thì gắn limit luôn. Bước 13 chỉ còn tinh chỉnh.
- **Bổ sung các việc đặc tả yêu cầu nhưng mục 6.1 chưa xếp lịch:** tác vụ dọn bài xóa mềm sau 30 ngày (kèm ảnh),
  sao lưu DB mỗi 8 giờ, sao lưu ảnh, trang chính sách quyền riêng tư, nhận ảnh HEIC, sắp xếp và xóa ảnh.

---

## Bước 0 – Chuẩn bị môi trường và chốt quyết định

Bước này không viết code. Mục tiêu là chốt các quyết định ảnh hưởng tới code ngay từ đầu.

**Môi trường hiện tại trên máy (đã kiểm tra 16/10/2026):**

| Công cụ          | Đang có                        | Cần                                                               |
| ---------------- | ------------------------------ | ----------------------------------------------------------------- |
| Python           | 3.13.12, 3.14 (không có 3.12)  | 3.12 theo đặc tả → `uv python install 3.12`, dự án dùng `uv` (Q1) |
| uv               | 0.12.5                         | ok                                                                |
| Node / npm       | 24.14.1 / 11.11.0              | ok                                                                |
| Docker / Compose | 29.8.1 / v5.5.1                | ok                                                                |
| WSL2             | chỉ có distro `docker-desktop` | không cần: phát triển thẳng trên Windows (Q1)                     |

**Đã chốt (16/10/2026):**

| Mã  | Quyết định                                                                                                               | Ảnh hưởng tới kế hoạch                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Phát triển trực tiếp trên Windows; cài Python 3.12 bằng `uv`                                                             | Bước 1 dùng `uv python install 3.12`, `uv sync`, `uv run`; Docker Desktop chạy MongoDB + MinIO cho local                                                                                                                           |
| Q2  | ~~Cơ sở dữ liệu là PostgreSQL~~ (thay bằng Q11). DB thật và các khóa (OAuth, kho ảnh, hosting) bạn đưa khi bước cần tới; Claude sẽ hỏi trước | Local dùng DB trong Docker Compose; mọi thông tin kết nối đọc từ biến môi trường. Nhà cung cấp kho ảnh và hosting chốt sau (trước bước 4 hoặc bước 7). Upload ảnh dùng presigned PUT nên chạy được với mọi kho tương thích S3 |
| Q3  | Ảnh thu nhỏ tạo ở trình duyệt                                                                                            | Frontend upload hai file: ảnh 1920 px và ảnh nhỏ 320 px. `POST /entries/{date}/photos` chỉ xác nhận hai file, không tạo ảnh thu nhỏ, nên MVP chưa cần Pillow. Mục 5.2 và 5.5 của đặc tả cần sửa cho khớp                            |
| Q11 | (17/10/2026) Đổi cơ sở dữ liệu sang **MongoDB** | Driver PyMongo async; nhật ký là một document, từ khóa và ảnh nhúng bên trong; migration tự viết (`python -m app.db.migrate`, chỉ tiến). Mô hình dữ liệu: đặc tả mục 5.4. Gói hosting phải có sao lưu tự động, nếu không thì bước 13 thêm tác vụ `mongodump` |
| Q12 | (17/10/2026) Cố định cây khung dự án | Cây chuẩn duy nhất ở `docs/Project_Structure.md` (ADR 0004); file mới phải đặt đúng chỗ, đổi cấu trúc thì sửa file đó cùng commit |
| Q13 | (17/10/2026) Gỡ CLI `shadcn` khỏi dự án (lỗ hổng `braces` không có bản vá) | CSS của shadcn được chép vào `src/styles/shadcn-tailwind.css`; thêm component bằng `npx shadcn@4.22.0 add <tên>`; không chạy `npm audit fix --force` |

**Quyết định còn mở** (★ là chặn bước 1):

| Mã   | Câu hỏi                                                                                                                                             | Đề xuất                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Q4 ★ | Duyệt các điểm thiết kế từ skill `fastapi-backend`: bảng `user_sessions`, mã lỗi `403 CSRF_FAILED`, cookie `dd_csrf`, biến `S3_PUBLIC_ENDPOINT_URL` | Đồng ý cả bốn, rồi bổ sung vào đặc tả mục 5.4 và `api-conventions`                             |
| Q5   | Số bộ biểu tượng chính, danh sách sub icon (mục 9) | Đã chốt (23/10/2026): giữ 6 bộ main icon hiện tại (`sprout` mặc định, `face`, `moon`, `sakura`, `sun`, `bean`) và danh sách 47 sub icon hiện tại trong `shared/icons.json`. Thêm main/sub icon mới sau khi sản phẩm hoàn thiện (xem Ngoài phạm vi MVP) |
| Q6   | Bảng màu cờ hiệu 8 hay 12 màu | Đã chốt (23/10/2026): giữ 8 màu pastel (`blush`…`lavender`, có `hex` và `hex_dark`) và cho người dùng thêm màu tùy chỉnh chọn từ bảng pha màu; nhật ký lưu `hex` (`#RRGGBB`), giao diện tối tra `hex_dark` cho màu có sẵn |
| Q7   | Cho đổi ảnh đại diện ở MVP không?                                                                                                                   | Không, chỉ dùng ảnh Google (bớt một luồng upload)                                              |
| Q8   | Phác thảo Figma (ngày 1–2): bạn tự làm, hay thay bằng bước 2 (Claude đề xuất hướng giao diện bằng skill `frontend-design`, bạn duyệt)?              | Dùng bước 2                                                                                    |
| Q9   | Skill `implement-feature` gọi `/verify`, nhưng lệnh này chưa tồn tại                                                                                | Thay bằng skill `run` (chạy app, chụp màn hình) cộng một bộ smoke test Playwright tạo ở bước 1 |
| Q10  | Làm bước 4 (triển khai thử sớm) không? Nếu có thì cần chốt hosting và kho ảnh trước bước 4                                                          | Có                                                                                             |

**Bạn cần chuẩn bị:**
- Google Cloud: OAuth client (Web), redirect URI `http://localhost:8000/auth/google/callback`, consent screen
  ở chế độ Testing, và danh sách email người dùng thử. *(Cần trước bước 3.)*
- MongoDB thật (vd. MongoDB Atlas, khu vực Singapore), tài khoản hosting và kho ảnh, kèm các khóa (Q2; Claude sẽ hỏi khi tới bước). *(Cần trước bước 4.)*
- Tài khoản Sentry, PostHog hoặc Umami. *(Cần trước bước 13.)*

---

## Bước 1 – Nền móng

**Mục tiêu:** `docker compose up -d` + chạy API + chạy web. Trang web gọi được `/health`, CI chạy xanh.

**Phạm vi:**
- Cây khung monorepo theo `docs/Project_Structure.md` (Q12), `.gitignore`, `.env.example`, `.editorconfig`.
- `docker-compose.yml`: MongoDB 8.0 (có xác thực), MinIO, job tạo bucket riêng tư.
- `shared/limits.json`, gồm cấp tài khoản `beta | free | premium`; mỗi cấp có rate limit (mục 4.4),
  số ảnh/ngày, kích thước ảnh, độ dài trường (F-01), hạn mức 500 MB và ngưỡng cảnh báo 80%.
  Kèm `icons.json` và `flag_colors.json` dạng tạm.
- **API:**
  - `core/config.py`, `core/limits.py`, `db/client.py` (AsyncMongoClient).
  - `core/errors.py`: định dạng lỗi chuẩn.
  - `core/rate_limit.py` cùng handler 429.
  - Middleware log gồm user, đường dẫn, mã trạng thái, thời gian; không log body.
  - `main.py` với lifespan, `/health`.
- **Migration MongoDB** (`python -m app.db.migrate`): tạo đủ các collection ở mục 5.4 kèm validator và index.
  Có `pytest` + `conftest.py` (MongoDB thật, DB `*_test` dọn sau mỗi test) và `ruff`.
- **Web:**
  - Vite + React + TS, Tailwind, shadcn/ui (không cài CLI, Q13), React Router, TanStack Query.
  - Phông Be Vietnam Pro.
  - Script `gen:api` (xuất OpenAPI bằng `apps/api/scripts/export_openapi.py`, không cần chạy server), `typecheck`, `test` (Vitest), `lint`; CI báo lỗi nếu kiểu API lệch với backend.
  - Playwright smoke test.
- **GitHub Actions:** ruff + migration + pytest (service MongoDB), lint + typecheck + test + build cho web, e2e.

**Skill:** `fastapi-backend`, `api-conventions`, `web-conventions`, `add-db-change` (quy trình migration), `privacy-check`.

**Hoàn thành khi:**
- `python -m app.db.migrate` chạy được; chạy lần hai báo không có migration mới.
- `pytest` xanh.
- `npm run typecheck && npm run test && npm run build` xanh.
- CI xanh trên nhánh.
- Trang web local hiển thị "API: ok".

---

## Bước 2 – Hướng giao diện

**Mục tiêu:** chốt giao diện trước khi làm nhiều màn hình.

**Phạm vi:** đề xuất 1–2 hướng giao diện (màu, kiểu chữ, khoảng cách), gồm:
- bộ token Tailwind;
- các thành phần nền: nút chọn điểm 1–5, sub icon (tỉ lệ `--sub-icon-ratio`), ô lịch, ô pixel, chip từ khóa, bảng chọn cờ;
- khung điều hướng cho máy tính và điện thoại từ 360 px.

Xem trực tiếp trên một trang `/dev/ui` trong app.

**Skill:** `frontend-design`, `web-conventions`.

**Hoàn thành khi:** bạn chọn một hướng; trang `/dev/ui` hiển thị ổn ở 360 px và 1440 px.

---

## Bước 3 – Đăng nhập Google và hồ sơ (F-04)

**Endpoint:** `GET /auth/google/login`, `GET /auth/google/callback`, `POST /auth/logout`, `GET/PATCH /me`.

**Phạm vi:**
- **Authlib:**
  - cookie `dd_session` (HttpOnly, Secure, Lax) có thời hạn 30 ngày và tự làm mới (sliding);
  - CSRF (kiểm tra `Origin`, `X-CSRF-Token`);
  - lấy múi giờ từ trình duyệt ở lần đăng nhập đầu;
  - `email_verified`.
- `PATCH /me`: tên 1–50 ký tự; múi giờ IANA hợp lệ, chỉ áp dụng cho các ngày sau đó; `icon_set_id` phải có
  trong `shared/icons.json` (mặc định `default_icon_set`), áp dụng cho mọi ngày. Cần migration thêm trường vào validator `users`.
- Rate limit đăng nhập 5/phút/IP.
- **Web:**
  - trang đăng nhập;
  - route yêu cầu đăng nhập: gặp 401 thì chuyển về `/login`;
  - trang hồ sơ;
  - `lib/date.ts`: "hôm nay" theo múi giờ hồ sơ.
- **Đã chốt khi làm (20/10/2026):**
  - `users.onboarded_at` (migration `m0002`): người mới đăng nhập vào `/onboarding`, người cũ vào `/today`;
    `PATCH /me` nhận `onboarded: true` (chỉ bật, không tắt).
  - `POST /auth/dev-login` để test và e2e không cần Google: chỉ có khi `ENV` là local/test và `DEV_LOGIN=true`,
    không có trong OpenAPI; ở production bật cờ này thì API từ chối khởi động.
  - Thiết kế chưa có màn đăng nhập riêng: trang `/login` ghép từ khung thẻ và nút Google của landing.

**Skill:** `/implement-feature F-04`, `fastapi-backend` (tham khảo `auth-google-cookie.md`), `date-timezone-rules`, `privacy-check`.

**Hoàn thành khi:**
- Đăng nhập và đăng xuất thật bằng Google trên localhost thành công.
- Có test cho: callback (mock Google), phiên hết hạn trả 401, request ghi thiếu CSRF trả 403,
  vượt 429 khi đăng nhập dồn dập, và người dùng A không đọc được `/me` của B.

**Bạn cần:** Google OAuth client và secret (bước 0).

**Kết quả (21/10/2026):** đăng nhập Google thật trên localhost thành công; 59 test backend và 48 test web xanh.

---

## Bước 4 – Triển khai thử bản khung (tùy chọn, khuyên làm)

**Mục tiêu:** đăng nhập chạy được trên môi trường beta thật, chung tên miền gốc (`app.` và `api.`), có HTTPS và HSTS.

**Phạm vi:**
- Kết nối MongoDB và kho ảnh thật do bạn cung cấp (ưu tiên khu vực Singapore).
- `apps/api/Dockerfile` (build từ gốc repo để mang theo `shared/`); biến môi trường trên hosting.
- Bước `python -m app.db.migrate` trong pipeline triển khai, chạy bằng **user migration riêng** (`dbAdmin` + `readWrite`
  trên `dailydiary`); API chạy bằng user chỉ có `readWrite` (user này không được `collMod`, nên không chạy migration được).
  Đã tạo DB beta trên Atlas M0 (Singapore, cluster0.auszmkf) ngày 21/10/2026; đã chạy đủ `0001`–`0004` bằng user
  `jotly_migrate` (chạy lại báo không có migration mới). User của app hiện là `readWriteAnyDatabase` — nên thu hẹp
  về `readWrite@dailydiary`.
- Máy dev có tên chứa emoji làm dnspython không tra được SRV: ở máy này dùng chuỗi `mongodb://` liệt kê 3 máy
  (xem `apps/api/.env.beta`, không commit); hosting dùng chuỗi `mongodb+srv://` gốc.
- Tự động triển khai khi merge vào `main`.
- Thêm redirect URI production vào Google Console.
- Kiểm tra cookie và CORS giữa hai subdomain.

**Skill:** `/deploy`, `privacy-check`.

**Hoàn thành khi:** đăng nhập trên URL beta thành công và `/health` trả về ok. Từ đây, mỗi bước sau có thể triển khai lên beta để bạn xem.

**Bạn cần:** chuỗi kết nối DB, khóa kho ảnh, tài khoản hosting và tên miền (Claude sẽ hỏi khi bắt đầu bước này).

---

## Bước 5 – Viết, sửa, xóa nhật ký (F-01, chưa có ảnh)

**Endpoint:** `GET /entries/{date}`, `PUT /entries/{date}` (tạo hoặc cập nhật, có `updated_at` để phát hiện xung đột),
`DELETE /entries/{date}` (xóa mềm), `POST /entries/{date}/restore`.

**Phạm vi:**
- Các trường và giới hạn theo bảng F-01; bắt buộc có điểm (main icon).
- Nội dung chuẩn hóa NFC.
- Từ khóa: 0–10 từ, không trùng, kèm `keyword_norm`.
- Cờ hiệu lấy từ `flag_colors.json`; sub icon lấy từ `icons.json`.
- Không cho chọn ngày tương lai theo múi giờ người dùng.
- Bộ icon lấy theo hồ sơ cho mọi ngày: migration bỏ `icon_set_id` khỏi danh sách bắt buộc của `entries` (m0001 đang bắt buộc).
- Nhãn "ghi đúng ngày" / "cập nhật muộn".
- Khôi phục được trong 30 ngày.
- `updated_at` để phát hiện xung đột: BSON date lưu tới mili giây; frontend gửi lại đúng chuỗi nhận từ API.
- Rate limit: đọc 30/phút; tạo và xóa 10/phút.
- Web: màn hình ghi nhanh (chọn điểm trước, các trường khác tùy chọn), form đầy đủ, xác nhận khi xóa, hoàn tác.

**Skill:** `/implement-feature F-01`, `date-timezone-rules`, `privacy-check`.

**Hoàn thành khi:**
- Test ngày đủ các mốc: 23:59, 00:01, 06:00 giờ Việt Nam, múi giờ Los Angeles.
- Test ngày tương lai trả 422; xung đột trả 409.
- Test truy cập chéo tài khoản trả 404.
- Trên điện thoại 360 px, ghi được một ngày chỉ bằng 1–2 lần chạm.

**Bạn cần:** chốt Q5 và Q6 (đã chốt 23/10/2026).

**Bổ sung theo Q6 (23/10/2026) — màu cờ tùy chỉnh:**
- `users.custom_flag_colors` (migration `m0005`), sửa qua `PATCH /me` (thay cả danh sách); tối đa
  `profile.custom_flag_colors_max` = 8 trong `limits.json` (422 `FLAG_COLORS_LIMIT`); không trùng 8 màu có sẵn.
- `flag_color` của nhật ký nhận mọi `#RRGGBB` (gỡ màu khỏi danh sách thì bài cũ vẫn tự lưu được).
- Web: ô "+" trong `FlagPicker` mở bảng pha màu của hệ thống (`input type=color`), chọn xong thì thêm vào hồ sơ và
  gắn luôn; Hồ sơ › Nhật ký › "Màu cờ riêng" để gỡ. Giao diện tối: màu tùy chỉnh trừ 25 mỗi kênh (cách pha của 8 màu).
- Test: backend 140 xanh (thêm `/me`, nhật ký, `m0005`); Vitest 162; e2e 38/38 (`--workers=1`), có ca thêm màu → tải lại
  → gỡ trong Hồ sơ ở cả 2 khổ màn.

**Kết quả backend (21/10/2026):**
- `routers/entries.py`, `services/entries.py`, `schemas/entries.py`, `core/text.py` (NFC, `keyword_norm`), migration
  `m0004` (bỏ `icon_set_id` khỏi bắt buộc, thêm `title_norm`/`content_norm`), `entry.restore_days` trong `limits.json`.
- PUT dùng hạn mức `autosave` (20/phút) vì Bước 6 tự lưu qua đúng endpoint này; xóa/khôi phục dùng `write` (10/phút).
- Ngày tương lai → 422 `ENTRY_FUTURE_DATE` theo múi giờ hồ sơ; xung đột → 409 `ENTRY_CONFLICT` (cả khi tạo mới mà ngày
  đó vừa được tạo ở nơi khác); truy cập chéo → 404. Chia sẻ dùng chung hàm đọc nhật ký của service này.
- Sub icon (Q5): người dùng chốt 47 emoji hiện có trong `shared/icons.json` (21/10/2026); backend từ chối emoji
  ngoài danh sách. Đổi danh sách = sửa file đó (kiểm tra bài cũ còn dùng emoji bị bỏ).
- 128 test backend xanh (42 test mới: mốc 23:59/00:01/06:00 Việt Nam, Los Angeles, giới hạn, NFC, xóa/khôi phục,
  xung đột, truy cập chéo, CSRF, rate limit).
- Web nối API thật (137 test Vitest, e2e `entry.spec.ts`). Kiểm ở 360×740: **một lần chạm** vào điểm là đã lưu
  (PUT 200, tải lại vẫn còn); nút điểm 61×82 px, không cuộn ngang.

---

## Bước 6 – Tự động lưu và trạng thái đồng bộ (F-06)

**Phạm vi:**
- `lib/storage.ts` (IndexedDB, thư viện `idb`) và `lib/autosave.ts`.
- Lưu nháp sau 1 giây; đồng bộ sau 3–5 giây, khi rời trang hoặc chuyển tab; chỉ gửi khi có thay đổi.
- Ba trạng thái: Đang lưu / Đã lưu / Chưa đồng bộ.
- Thử lại sau 2, 4, 8… giây.
- Cảnh báo khi đóng tab mà còn dữ liệu chưa đồng bộ.
- Hộp thoại xung đột khi mở 2 tab.
- Rate limit cho autosave 15–20/phút.

**Skill:** `web-conventions`, `date-timezone-rules`.

**Hoàn thành khi:** có test Vitest cho logic autosave, và kiểm tra tay các tình huống:
- tắt mạng, gõ, bật mạng lại → dữ liệu tự đồng bộ;
- sửa ở 2 tab → hiện hộp thoại chọn bản;
- F5 khi chưa đồng bộ → không mất chữ.

**Kết quả (21/10/2026):**
- `lib/storage.ts`: nháp IndexedDB qua `idb` 8.0.4, khóa `SHA-256(email):ngày` (/me không trả id; không lưu email gốc);
  xóa khi đăng xuất và khi xóa dữ liệu; IndexedDB lỗi/bị chặn thì app vẫn chạy, chỉ mất lớp nháp.
- `lib/autosave.ts`: nháp sau 1 s, đồng bộ sau 4 s, khi chuyển tab (`visibilitychange`), `pagehide`, rời màn, nút Lưu;
  chỉ gửi khi khác bản đã đồng bộ; thử lại 2, 4, 8… s (tối đa 60 s), có mạng lại thì thử ngay; 422 dừng kèm câu báo;
  409 → hộp thoại chọn bản. Gửi dồn: gõ tiếp trong lúc đang gửi thì gửi bản mới ngay sau.
- `features/entry/useAutosave.ts` + `ConflictDialog` + `components/diary/SyncStatus.tsx`: Hôm nay và Ghi bù tự lưu;
  Sửa trang cũ chỉ ghi nháp, lên máy chủ khi bấm "Lưu thay đổi". Mở màn gặp nháp cùng gốc → nạp lại và lưu; nháp dựa
  trên bản cũ hơn máy chủ → hộp thoại chọn bản. Cảnh báo khi đóng tab còn thay đổi chưa đồng bộ.
- Lệnh lưu dùng `networkMode: 'always'` (mất mạng báo lỗi ngay để hiện "Chưa đồng bộ", không bị TanStack Query tạm dừng).
- Khôi phục câu "vẫn được giữ trên trình duyệt này và sẽ tự lưu khi có mạng" ở thanh ngoại tuyến và màn hết phiên;
  "Đã có mạng lại" báo số trang vừa tự lưu.
- Rate limit autosave giữ 20/phút (Bước 5); với 4 s ngừng gõ, một người gõ liên tục gửi tối đa ~15 lần/phút.
- Test: Vitest `autosave.test.ts` (12, fake timers), `storage.test.ts` (4, `fake-indexeddb`), màn Hôm nay/Sửa (tự lưu
  sau 4 s, khôi phục nháp, xung đột cả hai lựa chọn) — 156 test xanh. e2e `autosave.spec.ts` (4 ca × 2 khổ màn: mất
  mạng rồi có mạng lại, 2 tab, F5, F5 khi máy chủ chưa nhận) — cả bộ e2e 36/36 xanh với `--workers=1`.
- Đã gặp và sửa: React StrictMode (dev) gỡ rồi gắn lại effect làm tắt bộ máy (`attach()` khi gắn lại).

---

## Bước 7 – Ảnh (F-01, phần ảnh)

**Endpoint:** `POST /entries/{date}/photos/upload-url`, `POST /entries/{date}/photos`, `PATCH /entries/{date}/photos/order`, `DELETE /photos/{id}`.

**Phạm vi:**
- **Trình duyệt:**
  - nhận JPEG, PNG, HEIC, WebP tối đa 10 MB; HEIC chuyển sang WebP trên trình duyệt (thư viện giải mã HEIC dạng
    WebAssembly, tải lười chỉ khi gặp tệp HEIC) — đổi 21/10/2026 theo thiết kế B9;
  - nén về WebP cạnh dài 1920 px, chất lượng khoảng 80%;
  - tạo ảnh thu nhỏ 320 px ngay trên trình duyệt (Q3);
  - upload thẳng lên kho bằng presigned PUT.
- **Backend:**
  - kiểm tra số ảnh/ngày (10), hạn mức dung lượng, rate limit 10/phút và 50/ngày;
  - xác nhận file: tồn tại, đúng magic bytes, đúng kích thước;
  - link xem ảnh hết hạn sau khoảng 1 giờ;
  - đường dẫn bắt đầu bằng `user_id/`.
- Thông báo cho người dùng rằng ảnh gốc không được lưu.
- Ảnh đại diện (F-04): đổi/gỡ, tối đa `profile.avatar_max_bytes`, cắt vuông `profile.avatar_edge_px`, `PATCH /me`.
- Bật CORS cho bucket.

**Skill:** `fastapi-backend` (tham khảo `s3-presigned.md`), `privacy-check`, `securitymaxxing:api` (tùy chọn, phần upload).

**Hoàn thành khi:**
- Upload một ảnh đã nén mất dưới 5 giây.
- Có test cho: ảnh thứ 11 bị từ chối, file giả định dạng, file quá lớn, B không xác nhận hoặc xóa được ảnh của A.
- Ảnh không mở được nếu không có link ký.

**Kết quả (23/10/2026):**
- Backend: `core/storage.py` (boto3, hai client ký/gọi kho, I/O qua `anyio.to_thread`), `routers|schemas|services/photos.py`.
  Nhận `image/webp` (và `image/jpeg` khi trình duyệt không mã hóa được WebP); key do backend dựng
  `{user_id}/YYYY/MM/DD/{id}[_thumb].ext`. Xác nhận: tồn tại, ≤ `main_max_bytes`/`thumb_max_bytes`, magic bytes, cạnh
  ≤ 1920 px; sai thì xóa object. Mảng `photos` đổi bằng khóa lạc quan (so khớp nguyên mảng) nên hai lần xác nhận cùng
  lúc không vượt 10 ảnh. Hạn mức 500 MB tính cả trang đã xóa mềm. Upload-url và xác nhận dùng `photo_upload`
  (10/phút; 50/ngày), sắp xếp/xóa dùng `write`. Ảnh không đổi `updated_at` (tự lưu chữ không bị 409). Xóa ảnh bỏ luôn
  ảnh khỏi link chia sẻ; ghi đè ngày đã xóa mềm xóa ảnh cũ khỏi kho. Trang chia sẻ công khai trả link ký cho ảnh đã chọn.
- Ảnh đại diện: `POST /me/avatar/upload-url` + `PATCH /me {avatar_upload}`; `users.avatar_key` (migration `m0006`);
  thay/gỡ thì xóa ảnh cũ khỏi kho.
- Web: `preparePhoto` (lib/image.ts) — `browser-image-compression` (không dùng worker vì worker tải script từ CDN),
  HEIC giải mã bằng `heic-to` tải lười (Safari giải mã sẵn); `uploadPhoto.ts` PUT bằng XHR để có tiến độ.
  Hôm nay: nút Ảnh bật khi trang đã có, thêm/bỏ là lưu ngay, tải song song xong thì chốt lại thứ tự đã chọn.
  Sửa trang cũ: ảnh mới gắn ngay khi tải xong; bỏ ảnh/thứ tự chốt khi bấm Lưu thay đổi; Hủy/rời trang thì xóa ảnh vừa
  thêm. Trang ngày, trình xem ảnh, hộp thoại Chia sẻ, trang chia sẻ công khai hiện ảnh thật.
- Kiểm tra: backend 171 test (ảnh thứ 11 — cả khi xác nhận chen ngang, file giả định dạng, quá lớn, quá rộng, chưa
  tải, hạn mức, B không xác nhận/xóa/sắp xếp ảnh của A); Vitest 166; e2e 41/41 (`--workers=1`) có ca trên MinIO
  thật: ảnh 2400 px → 1920 px, tải xong < 5 s, link ký 200, link không ký 403, bỏ ảnh thì kho trả 404.
- Chưa kiểm tra: tệp HEIC thật từ iPhone (không tạo được trong test) và trên điện thoại thật.

---

## Bước 8 – Dòng thời gian (F-02, phần danh sách)

**Endpoint:** `GET /entries?cursor=&limit=`.

> **Đổi theo thiết kế B8 (21/10/2026):** Dòng thời gian xem **theo tháng**, gộp danh sách trang, nhịp điểm, lịch và
> thống kê tháng vào một trang (`/timeline?m=YYYY-MM`); danh sách hiện 7 trang rồi "Xem thêm", không cuộn vô hạn.
> Khi làm bước này cùng Bước 9, cân nhắc thêm `GET /entries?month=YYYY-MM` (tóm tắt trang trong tháng) thay cho con trỏ.
> Giao diện đã dựng trên dữ liệu mẫu ở `features/timeline/`.

**Phạm vi:**
- Phân trang theo con trỏ, 10–20 bài mỗi lần, mới nhất trước, cuộn để tải thêm.
- Hiện ảnh thu nhỏ có kích thước cố định để CLS dưới 0,1.
- Hiện nhãn "ghi đúng ngày" / "cập nhật muộn".
- Có trạng thái đang tải, lỗi, rỗng.

**Hoàn thành khi:** có test phân trang (không trùng, không sót bài, bỏ qua bài đã xóa mềm) và test truy cập chéo tài khoản; Lighthouse cho LCP dưới 2,5 giây.

**Kết quả (23/10/2026):**
- Làm theo thiết kế B8: `GET /entries?month=YYYY-MM` (thay `?cursor=&limit=`). Một aggregate theo index
  `(user_id, entry_date)`, mới nhất trước, bỏ bài xóa mềm; không trả nội dung đầy đủ — `excerpt` 300 ký tự cắt ngay trong
  MongoDB, `photo_count` thay cho mảng ảnh. Rate limit `read`. Tháng sai dạng → 422.
- Web: `useMonth` đọc API (tháng nhỏ nhất = tháng của `joined_at` theo múi giờ hồ sơ); chấm điểm nhanh trên Dòng thời
  gian dùng PUT/DELETE thật; dải "7 ngày qua" ở Hôm nay đọc cùng endpoint (thêm tháng trước khi vắt tháng).
  `/timeline` vào bản build (trước đây chỉ có ở dev). Thẻ trang hiện số ảnh, không hiện ảnh thu nhỏ (theo thiết kế B8).
- Test: "phân trang" theo tháng — đi qua 36 tháng không trùng, không sót (ngày 29/2, đầu/cuối tháng, cuối năm), bỏ bài
  xóa mềm, B không thấy tháng của A, tháng sai dạng; backend 183 test; Vitest 166; e2e 43/43 (`--workers=1`).
- Lighthouse trên bản build (`vite preview`), tài khoản 23 trang: **máy tính LCP 1,1 s, CLS 0,005 — đạt**. Cấu hình di
  động mô phỏng (CPU ×4, 4G chậm): LCP 4,7 s; màn Hôm nay 4,6 s và Hồ sơ 4,7 s cũng vậy, nên đây là phần khởi động của
  cả app (JS chính ~186 KB, chuỗi tải nối tiếp JS → /me → trang → API, 5 tệp phông), chưa tối ưu ở bước này.
- Để lại cho Bước 9 (đã làm, xem Bước 9): chuỗi ngày chưa áp quy tắc ghi bù và chuỗi vắt qua tháng.

---

## Bước 9 – Lịch tháng và thống kê tháng (F-02)

**Endpoint:** `GET /calendar/{year}/{month}`.

**Phạm vi:**
- Một request trả về các ngày của tháng (ngày, điểm, bộ biểu tượng, sub icon, cờ), không kèm nội dung bài.
- Thống kê: số ngày đã ghi trên tổng số ngày, điểm trung bình, phân bố điểm 1–5, tổng số ảnh,
  chuỗi ngày ghi liên tiếp dài nhất, biểu đồ điểm theo ngày (Recharts).
- Sau khi lưu bài, invalidate cache lịch của tháng đó.

**Skill:** `date-timezone-rules`, `backend-performance-review` (kiểm tra truy vấn).

**Hoàn thành khi:**
- Lịch và thống kê tải dưới 1 giây.
- Test chuỗi liên tiếp kéo qua ranh giới tháng, test tháng 2 năm nhuận.
- Payload không chứa `content` hay `title`.

**Kết quả (23/10/2026):**
- `GET /calendar/{year}/{month}` (`routers|schemas|services/calendar.py`): ngày, điểm, sub icon, cờ, số ảnh, `backfilled`
  + thống kê (số ngày đã ghi, trung bình, phân bố 1–5, ảnh, chuỗi dài nhất trong tháng, chuỗi hiện tại). Không có
  tiêu đề, nội dung, từ khóa. Rate limit `read`; tháng/năm sai → 422.
- Ghi bù = `created_at` theo múi giờ hồ sơ rơi sau `entry_date`: vẫn tô màu, không nối chuỗi. Chuỗi hiện tại tính lùi từ
  hôm nay (chưa ghi thì từ hôm qua), vắt qua tháng, đọc lần lượt và dừng ở chỗ đứt đầu tiên. Chốt: "dài nhất" tính
  trong tháng đang xem (thiết kế ghi "Dài nhất tháng").
- Hai truy vấn đều dùng index `uq_user_date`, không sắp xếp trong bộ nhớ (đã `explain`). Thời gian xử lý ~18 ms với
  tháng 23 trang.
- Web: Dòng thời gian lấy chuỗi từ `/calendar` (song song với `/entries?month`); dải "7 ngày qua" ở Hôm nay đọc
  `/calendar` (nhẹ hơn, không có đoạn nội dung). Biểu đồ "Nhịp tháng" vẽ tay theo thiết kế B8, không dùng Recharts.
- Test: 17 test lịch (chuỗi vắt tháng, 29/2/2024, ghi bù, 23:59 / 00:01 / 06:00 giờ Việt Nam, Los Angeles, hôm nay
  chưa ghi, xóa mềm, truy cập chéo, payload không có tiêu đề/nội dung); backend 200; Vitest 166; e2e 43/43.

---

## Bước 10 – Year in Pixels (F-03)

**Endpoint:** `GET /pixels/{year}`, cùng danh sách các năm có dữ liệu.

**Phạm vi:**
- Lưới 365/366 ô theo 12 tháng, tô màu theo điểm; ngày chưa ghi dùng màu trung tính.
- Rê chuột để xem nhanh, bấm để mở bài của ngày đó.
- Chế độ tô theo màu cờ.
- Payload chỉ vài KB.

**Hoàn thành khi:** có test năm nhuận 366 ô, test chỉ trả các năm có dữ liệu, kích thước payload dưới 10 KB, dùng được trên điện thoại.

**Kết quả (23/10/2026):**
- `GET /pixels/{year}` (`routers|schemas|services/pixels.py`) dạng gọn: `scores` là chuỗi 365/366 ký tự, `flags`
  (chỉ số ngày → hex) và `backfilled` chỉ liệt kê ngày có, `years` là các năm có trang chưa xóa, `stats` chuỗi dài
  nhất trong năm và chuỗi hiện tại (quy tắc ghi bù như Bước 9). Không có tiêu đề/nội dung. Rate limit `read`.
- Web: `usePixels` đọc API và giải dạng gọn; xem nhanh ngày đọc `GET /entries/{day}`; `/pixels` vào bản build.
  Ô có trang luôn hiện kể cả trước ngày bắt đầu dùng (giống Dòng thời gian).
- Chế độ tô theo màu cờ (người dùng chọn, 23/10/2026): nút "Tô ô theo: Điểm | Cờ hiệu" trên bảng (thiết kế B7 chưa có,
  thêm theo yêu cầu). Ô có cờ mang màu cờ (bản tối khi giao diện tối), có trang mà không cờ là ô viền; chú thích liệt kê
  cờ dùng trong năm + số ngày (màu riêng kèm mã màu); bộ lọc theo điểm ẩn ở chế độ này. Nhớ lựa chọn trên trình duyệt
  (`localStorage`, như chế độ sáng/tối).
- Test: năm nhuận 366 ký tự (29/2 là ngày thứ 60), chỉ năm có trang chưa xóa của chính người dùng, cả năm ghi đủ + cờ mỗi
  ngày + nửa năm ghi bù vẫn dưới 10 KB, chuỗi bỏ qua ghi bù, truy cập chéo; backend 209; Vitest 167; e2e 45/45
  (có ca 360 px: chạm ô mở bảng xem nhanh).

---

## Bước 11 – Tìm kiếm (F-05)

**Endpoint:** `GET /search?q=&score=&period=&has_photo=&cursor=`, `GET /keywords/top`.

**Phạm vi:**
- Tìm trong tiêu đề, nội dung và từ khóa (theo thiết kế B7).
- Khớp chuỗi con, không phân biệt hoa thường; `q` không dấu thì so trên `title_norm`, `content_norm`, `keywords.norm`;
  `q` có dấu thì so đúng dấu. Thoát ký tự đặc biệt của regex trước khi tìm.
- Migration thêm `title_norm`, `content_norm` (điền lại cho bài cũ); luôn lọc `user_id` trước.
- Bộ lọc điểm, khoảng thời gian (tháng này / 3 tháng / năm nay / mọi lúc), chỉ ngày có ảnh. 20–50 kết quả mỗi trang, mới nhất trước.
- Không ghi `q` vào log, Sentry, analytics; frontend không đưa từ khóa lên URL của trang.

**Skill:** `privacy-check`, `date-timezone-rules` (khoảng thời gian theo múi giờ người dùng).

**Hoàn thành khi:** có test tiếng Việt có dấu và không dấu, test chuỗi con, test ký tự regex, test truy cập chéo tài khoản;
p95 dưới 500 ms với dữ liệu mẫu.

**Kết quả (23/10/2026):**
- `GET /search` + `GET /keywords/top` (`routers|schemas|services/search.py`). Có dấu → regex `i` trên `title`, `content`,
  `keywords.keyword` (đã thử: MongoDB gập hoa/thường đúng cho chữ có dấu); không dấu → `title_norm`, `content_norm`,
  `keywords.norm`. `q` qua `re.escape`, bộ lọc luôn có `user_id` của phiên. Trả `excerpt` 240 ký tự quanh chỗ khớp (không trả
  cả nội dung), `matched` (trước bộ lọc), `total` (sau bộ lọc), `next_cursor`; 30 kết quả/trang. Khoảng thời gian theo
  "hôm nay" của người dùng. Rate limit mới `search` 60/phút (limits.json).
- Migration `m0007`: điền `title_norm`/`content_norm` cho trang còn thiếu (chạy lại không đổi gì).
- **Quyền riêng tư:** phát hiện log DEBUG của PyMongo ghi nguyên câu lệnh và kết quả (từ khóa, tiêu đề) → `configure_logging`
  luôn để logger `pymongo` ở WARNING; có test bật DEBUG mà log không chứa từ khóa hay tiêu đề. Đã kiểm tra log thật của API sau
  e2e: có dòng `GET /search`, không có từ khóa. Frontend giữ từ khóa trong state, không lên URL.
- Web: `useSearch` (useInfiniteQuery, chờ ngừng gõ 300 ms, "Xem thêm N kết quả cũ hơn"), từ khóa hay dùng, trang gần đây,
  màn trống người mới đều đọc API; `/search` vào bản build. Bỏ hàm tìm phía trình duyệt (`searchEntries.ts` chỉ còn bộ lọc).
- Test: 26 test tìm kiếm (có dấu/không dấu, hoa thường, chuỗi con, 7 chuỗi ký tự regex, đoạn trích, bộ lọc, phân trang 35
  trang không trùng không sót, xóa mềm, truy cập chéo, log, tham số sai, từ khóa hay dùng, m0007); backend 235; Vitest 164;
  e2e 47/47.
- Hiệu năng: 365 trang (~620 ký tự/trang), 55 lần tìm trộn từ khóa và bộ lọc: **p50 33 ms, p95 61 ms**; `/keywords/top` 46 ms.

---

## Bước 11b – Chia sẻ một trang (F-10)

Thêm ngày 21/10/2026 (ADR 0005). Giao diện theo thiết kế B8: hộp thoại Chia sẻ trong trang một ngày, trang người
nhận xem `/s/:token`, "Trang đang chia sẻ" trong Hồ sơ, màn "Trang này không mở được".

**Đã làm sớm (21/10/2026):** giao diện trên dữ liệu mẫu (chỉ chạy ở dev) và backend phần link: collection
`share_links`, endpoint chủ sở hữu và endpoint công khai, kèm test.

**Còn lại, làm sau Bước 5 và 7:**
- Nối giao diện với API thật; đưa các route chia sẻ vào bản build.
- Ảnh trong trang công khai: link ký có hạn, chỉ ảnh được chọn.
- Xóa toàn bộ dữ liệu và xóa tài khoản (Bước 12) xóa luôn `share_links`.

**Skill:** `privacy-check`, `securitymaxxing:authz`, `securitymaxxing:api`.

**Hoàn thành khi:** người nhận chỉ thấy đúng phần được chọn; tắt link, xóa mềm trang hoặc xóa tài khoản thì link trả
màn chung; có test truy cập chéo và test rate limit cho trang công khai.

---

## Bước 12 – Xóa toàn bộ dữ liệu, xóa tài khoản, góp ý (F-07, F-09)

**Endpoint:** `DELETE /entries` (xóa toàn bộ dữ liệu, giữ tài khoản), `DELETE /me`, `POST /feedback`.
Xuất dữ liệu (`GET /export`) đã bỏ theo thiết kế Hồ sơ ngày 21/10/2026.

**Phạm vi:**
- **Xóa toàn bộ dữ liệu:** xóa mọi trang, ảnh, link chia sẻ; giữ tài khoản và cài đặt; xác nhận gõ "XÓA".
- **Xóa tài khoản:**
  - xác nhận bằng gõ đúng email của tài khoản; xong hiện màn "Tài khoản đã được xóa";
  - xóa phiên, nhật ký, từ khóa, link chia sẻ (`share_links`);
  - xóa ảnh theo tiền tố `user_id/` bằng tác vụ nền.
- **Góp ý:** form ngắn, có rate limit.

**Skill:** `privacy-check`, `securitymaxxing:authz`.

**Hoàn thành khi:** sau khi xóa tài khoản, DB không còn document nào của user và kho ảnh không còn object nào; sau khi xóa toàn bộ dữ liệu, tài khoản vẫn đăng nhập được và không còn trang, ảnh, link nào.

---

## Bước 13 – Vận hành

**Phạm vi:**
- Hạn mức 500 MB, cảnh báo khi đạt 80%.
- Sentry cho frontend và backend, có `before_send` lọc nội dung nhật ký.
- PostHog hoặc Umami với 7 sự kiện ở mục 4.7, không gửi nội dung.
- Tác vụ định kỳ:
  - dọn bài xóa mềm sau 30 ngày, kèm ảnh và link chia sẻ của bài đó;
  - sao lưu DB lúc 00:00, 08:00, 16:00 giờ Việt Nam, giữ 7 ngày (sao lưu của gói hosting, hoặc tác vụ `mongodump`);
  - sao chép ảnh sang kho khác.
- Rà lại và tinh chỉnh toàn bộ rate limit.

**Skill:** `privacy-check`, `securitymaxxing:secrets`.

**Hoàn thành khi:** gây lỗi thử, sự kiện Sentry không chứa nội dung bài; tác vụ dọn dẹp có test; sao lưu đầu tiên đã chạy.

**Bạn cần:** tài khoản Sentry và công cụ phân tích.

---

## Bước 14 – Hoàn thiện và triển khai production

**Phạm vi:**
- Rà giao diện trên Chrome, Edge, Firefox, Safari và điện thoại 360 px.
- Đạt LCP, INP, CLS theo mục 4.3.
- Trang chính sách quyền riêng tư (mục 4.1).
- Dữ liệu mẫu 3 tháng.
- Triển khai production beta.

**Skill:** `/seed-demo-data 3` (script ở `apps/api/scripts/seed_demo.py`), `/deploy`, `securitymaxxing:ship-check`.

**Hoàn thành khi:** Lighthouse đạt chỉ tiêu; checklist `/deploy` qua hết; không còn lỗi chặn từ `ship-check`.

---

## Bước 15 – Kiểm thử cuối và chuẩn bị demo

**Phạm vi:**
- Kiểm thử phân quyền toàn bộ API: tài khoản A gọi vào dữ liệu của B.
- Thử khôi phục từ một bản sao lưu.
- Bạn tự dùng app viết nhật ký thật 2–3 ngày; ghi lại lỗi múi giờ, autosave, upload ảnh.
- Sửa lỗi; chuẩn bị kịch bản demo và danh sách email mời dùng thử.

**Skill:** `securitymaxxing:authz`, `securitymaxxing:redteam` (chỉ trên môi trường của mình).

**Hoàn thành khi:** khôi phục từ sao lưu thành công, không còn lỗi P0, sẵn sàng mời dưới 20 người dùng thử.

---

## Ngoài phạm vi MVP

Theo mục 2.2 của đặc tả: nhật ký chung và bình luận (chia sẻ một trang qua link đã vào MVP ở Bước 11b), đăng nhập Facebook, theme và sticker, AI, PWA và thông báo đẩy,
ứng dụng di động, thanh toán. Mọi việc thuộc giai đoạn 2–3 (mục 6.2) chỉ được chuẩn bị qua dữ liệu
(`user_items`, `account_tier`, `joined_at`), không xây giao diện.

Thêm main icon (bộ mới) và sub icon mới: làm sau khi sản phẩm hoàn thiện (chốt Q5, 23/10/2026).
