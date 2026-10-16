---
name: deploy
description: Triển khai DailyDiary lên môi trường beta.
disable-model-invocation: true
---

Triển khai lên beta, dừng ngay nếu bước nào lỗi:

1. Xác nhận đang ở nhánh `main`, không có thay đổi chưa commit.
2. Chạy `pytest` (apps/api) và `npm run test && npm run typecheck && npm run build` (apps/web).
3. Chạy skill `privacy-check` trên các thay đổi kể từ lần triển khai trước.
4. Kiểm tra migration mới: liệt kê và hỏi tôi xác nhận trước khi chạy `alembic upgrade head` trên DB beta.
5. Đẩy code để hosting tự triển khai; chờ và kiểm tra endpoint `/health` của backend.
6. Mở web app beta, kiểm tra nhanh: đăng nhập, tạo nhật ký, tải ảnh, xem lịch.
7. Báo lại phiên bản đã triển khai và kết quả kiểm tra.
