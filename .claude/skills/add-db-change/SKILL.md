---
name: add-db-change
description: Quy trình thay đổi cấu trúc dữ liệu DailyDiary (thêm/sửa bảng, cột, chỉ mục) đồng bộ từ backend đến frontend.
disable-model-invocation: true
argument-hint: "[mô tả thay đổi]"
---

Thực hiện thay đổi dữ liệu: $ARGUMENTS

Làm lần lượt, không bỏ bước:

1. Sửa model SQLAlchemy trong `apps/api/app/models/`.
2. Tạo migration: `cd apps/api && alembic revision --autogenerate -m "<mô tả ngắn>"`. Đọc lại file migration, sửa nếu autogenerate sai (đặc biệt chỉ mục, ràng buộc UNIQUE, giá trị mặc định cho cột mới trên bảng đã có dữ liệu).
3. Chạy `alembic upgrade head` trên DB local, rồi `alembic downgrade -1` và `upgrade head` lại để chắc chắn migration đảo ngược được.
4. Cập nhật schema Pydantic trong `apps/api/app/schemas/` và service/router liên quan. Truy vấn mới vẫn phải lọc theo `user_id`.
5. Nếu thay đổi chạm tới giới hạn hoặc danh mục, cập nhật `shared/limits.json` / `shared/icons.json`.
6. Sinh lại kiểu dữ liệu frontend: chạy backend, rồi `cd apps/web && npm run gen:api`.
7. Sửa code frontend cho tới khi `npm run typecheck` không lỗi.
8. Cập nhật dữ liệu mẫu trong `seed/` nếu cần.
9. Chạy `pytest` và `npm run test`. Báo lại tóm tắt thay đổi và file migration đã tạo.
