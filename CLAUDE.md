# DailyDiary

Ứng dụng nhật ký web. Đặc tả đầy đủ: `docs/Project_Specs.md` (đọc mục liên quan trước khi làm tính năng mới).

## Stack
- Frontend: `apps/web` — React + Vite + TypeScript, TanStack Query, Tailwind + shadcn/ui
- Backend: `apps/api` — Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic v2
- Dùng chung: `shared/` — `limits.json`, `icons.json`, `flag_colors.json`
- Local: `docker compose up -d` (PostgreSQL + MinIO)

## Quy tắc luôn áp dụng
- Mọi truy vấn dữ liệu người dùng phải lọc theo `user_id` lấy từ phiên đăng nhập.
- Không ghi tiêu đề, nội dung, từ khóa, ảnh nhật ký vào log hay Sentry.
- `entry_date` là ngày địa phương của người dùng; mọi mốc thời gian khác lưu UTC.
- Giới hạn (số ảnh, độ dài, rate limit) chỉ đọc từ `shared/limits.json`, không viết cứng.

## Tài liệu thư viện
- Khi viết code dùng FastAPI, SQLAlchemy, Alembic, Pydantic, Authlib, React, Vite, TanStack Query, Tailwind: luôn tra tài liệu phiên bản hiện tại qua Context7 trước khi viết.
