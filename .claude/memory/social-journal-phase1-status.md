---
name: social-journal-phase1-status
description: Trạng thái Social_Plan trên feat/social-journal — giai đoạn 1–2 xong code, còn lỗi riêng tư phải sửa trước khi mở PR/merge
metadata:
  type: project
---

Nhánh `feat/social-journal` (F-11, ADR-0007) — trạng thái 2026-11-27:

- Giai đoạn 1 (bạn bè, sổ chung, ảnh chung) và 2 (luân phiên, mốc 30/100) **xong code**; thêm "Ngày này năm trước",
  thư gửi tương lai, mở lại sổ, hủy kết bạn. Giai đoạn 3 (nhóm, ADR 0008) chưa bắt đầu.
- Chưa có PR, chưa phát hành; production mới chạy migration 0001–0009 (cần 0010–0013 trước khi merge).
- Kiểm tra local 2026-11-27: pytest 398 đạt; ruff, oxlint, tsc, build đạt; e2e 53 đạt, 5 bỏ qua; Vitest chập chờn
  (lần tốt nhất 237/239, hai ca Landing đạt khi chạy riêng lại). Chưa có e2e cho social và thư.
- privacy-check tìm ra lỗi **chưa sửa** (danh sách ở `docs/Backlog.md` mục 6; file này bị `.gitignore`). Nặng nhất:
  "Xóa toàn bộ dữ liệu" xóa luôn file ảnh sổ chung.

**How to apply:** e2e local phải ép SMTP về Mailpit (`SMTP_HOST=127.0.0.1 SMTP_PORT=1025 SMTP_STARTTLS=false`, user và
mật khẩu rỗng) vì `apps/api/.env` dùng Gmail thật; đặt `VITE_API_URL=http://localhost:8000` vì `.env` /
`.env.development.local` trỏ nơi khác.
