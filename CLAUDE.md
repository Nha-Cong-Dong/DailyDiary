# DailyDiary

Ứng dụng nhật ký web. Đặc tả đầy đủ: `docs/Project_Specs.md` (đọc mục liên quan trước khi làm tính năng mới).
Kế hoạch theo bước: `docs/MVP_Plan.md`. Quyết định kiến trúc: `docs/adr/`.

## Cây dự án — bắt buộc tuân theo

Cây thư mục chuẩn **duy nhất**: `docs/Project_Structure.md`. Mọi việc xây dựng phải theo cây này.

- **Trước khi tạo, di chuyển, đổi tên hoặc xóa file/thư mục:** đọc `docs/Project_Structure.md` và đặt file đúng chỗ,
  đúng quy ước đặt tên trong đó. Không tạo thư mục ngoài cây.
- **Khi cần chỗ mới mà cây chưa có, hoặc thấy cây không còn khớp với code:** cập nhật `docs/Project_Structure.md`
  **trong cùng thay đổi** (cùng commit), thêm một dòng vào mục "Lịch sử thay đổi" của file đó. Thay đổi lớn (thư mục
  cấp cao, cách chia tầng) thì viết thêm ADR trong `docs/adr/` và hỏi người dùng trước.
- **Khi hoàn thành một bước tạo ra file đang ghi nhãn `(Bn)`:** bỏ nhãn đó trong cây.
- **Trước khi báo xong một bước:** đối chiếu cây với thư mục thật (`apps/`, `shared/`, `docs/`) và sửa chỗ lệch.
- Không chép cây sang tài liệu hay skill khác; chỉ link tới `docs/Project_Structure.md`.

## Stack
- Frontend: `apps/web` — React + Vite + TypeScript, TanStack Query, Tailwind + shadcn/ui
- Backend: `apps/api` — Python 3.12 (uv), FastAPI, Pydantic v2, MongoDB qua PyMongo async
- Dùng chung: `shared/` — `limits.json`, `icons.json`, `flag_colors.json`
- Local: `docker compose up -d` (MongoDB, MinIO + bucket ảnh/sao lưu, Mailpit bắt email). Mô hình dữ liệu: `docs/Project_Specs.md` mục 5.4.
- Kiểm tra như CI: `apps/api`: `uv run ruff check . && uv run ruff format --check . && uv run pytest -q`;
  `apps/web`: `npm run lint && npm run typecheck && npm test && npm run build`; e2e: `npm run test:e2e`.

## Quy tắc luôn áp dụng
- Tao một bản tóm tắt những nội dung đã thêm vào, sửa đổi
- Đề xuất các hướng đi tiếp theo
- Gợi ý về version control nhưng không tự động thao tác về version control.
- Đề xuất nội dung commit sau mỗi lần chỉnh sửa bằng cả tiếng Anh lẫn tiếng Việt. Sử dụng git conventions. 
- Mọi truy vấn dữ liệu người dùng phải lọc theo `user_id` lấy từ phiên đăng nhập.
- Không đưa nguyên dict từ request vào bộ lọc hoặc lệnh cập nhật MongoDB; luôn dựng từ trường đã kiểm tra kiểu.
- Không ghi tiêu đề, nội dung, từ khóa, ảnh nhật ký vào log hay Sentry.
- `entry_date` là ngày địa phương của người dùng (chuỗi `YYYY-MM-DD`); mọi mốc thời gian khác lưu UTC.
- Giới hạn (số ảnh, độ dài, rate limit) chỉ đọc từ `shared/limits.json`, không viết cứng.
- Đổi API backend thì chạy `cd apps/web && npm run gen:api` và commit cả `src/api/openapi.json` lẫn `schema.d.ts`
  (CI báo lỗi nếu lệch).
- Không cài CLI `shadcn` vào dự án và không chạy `npm audit fix --force`; thêm component bằng `npx shadcn@4.22.0 add <tên>`.

## Tài liệu thư viện
- Khi viết code dùng FastAPI, PyMongo, Pydantic, Authlib, React, Vite, TanStack Query, Tailwind: luôn tra tài liệu phiên bản hiện tại qua Context7 trước khi viết.
