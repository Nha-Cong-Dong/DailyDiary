---
name: implement-feature
description: Làm một tính năng DailyDiary theo mã trong đặc tả (F-01 … F-10; F-08 xuất dữ liệu đã bỏ), cả backend và frontend.
disable-model-invocation: true
argument-hint: "[mã tính năng, vd F-03]"
---

Làm tính năng $ARGUMENTS theo đặc tả.

1. Đọc mục $ARGUMENTS trong `docs/Project_Specs.md`, cùng mục 4 (phi tính năng) và 5.4–5.6 (mô hình dữ liệu, API, luồng chính). Liệt kê thông số cần đạt trước khi viết code.
2. Nếu cần đổi cấu trúc dữ liệu, làm theo các bước của skill `add-db-change`.
3. Backend: viết router + service + schema; áp dụng rate limit và giới hạn từ `shared/limits.json`; viết pytest, gồm cả ca tài khoản A cố truy cập dữ liệu của B (phải bị từ chối).
4. Frontend: viết trong `apps/web/src/features/<tên-tính-năng>/`; xử lý trạng thái đang tải, lỗi, rỗng.
5. Nếu tính năng liên quan đến ngày hoặc múi giờ, áp dụng skill `date-timezone-rules`.
6. Kiểm tra trên app đang chạy: dùng skill `run` (chạy app, chụp màn hình luồng vừa làm) và chạy `cd apps/web && npm run test:e2e`; thêm smoke test Playwright cho luồng chính của tính năng vào `apps/web/e2e/`.
7. Báo lại: đã làm gì, thông số nào đã đạt, thông số nào chưa và lý do.
