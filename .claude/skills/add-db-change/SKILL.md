---
name: add-db-change
description: Quy trình thay đổi cấu trúc dữ liệu DailyDiary trên MongoDB (thêm/sửa collection, trường, validator, index) đồng bộ từ backend đến frontend.
disable-model-invocation: true
argument-hint: "[mô tả thay đổi]"
---

Thực hiện thay đổi dữ liệu: $ARGUMENTS

Làm lần lượt, không bỏ bước:

1. Cập nhật mô hình dữ liệu trong `docs/Project_Specs.md` mục 5.4 trước (collection, trường, index).
2. Tạo migration mới `apps/api/app/db/migrations/mNNNN_<mo_ta>.py` có `ID = "NNNN_<mo_ta>"` và `async def up(db)`,
   rồi thêm vào danh sách `MIGRATIONS` trong `app/db/migrate.py`. Không sửa migration đã chạy.
   - Migration phải **chạy lại được nhiều lần** mà không hỏng: `create_index` với tên cố định, `collMod` cho validator,
     cập nhật dữ liệu cũ bằng bộ lọc chỉ khớp document chưa được cập nhật.
   - Trường mới trên collection đã có dữ liệu: thêm vào validator dưới dạng không bắt buộc, điền giá trị cho
     document cũ, rồi mới đưa vào `required` ở migration sau.
   - Giới hạn độ dài/số lượng không đưa vào validator; chúng nằm trong `shared/limits.json`.
3. Chạy `cd apps/api && uv run python -m app.db.migrate` hai lần: lần hai phải báo "Không có migration mới".
4. Thêm test trong `apps/api/tests/db/`: index mới tồn tại, validator chặn dữ liệu sai.
5. Cập nhật schema Pydantic trong `apps/api/app/schemas/` và service/router liên quan. Truy vấn mới vẫn phải lọc
   theo `user_id`, và bộ lọc dựng từ trường đã kiểm tra kiểu.
6. Nếu thay đổi chạm tới giới hạn hoặc danh mục, cập nhật `shared/limits.json` / `shared/icons.json`.
7. Sinh lại kiểu dữ liệu frontend: `cd apps/web && npm run gen:api` (không cần chạy backend); commit cả `openapi.json` và `schema.d.ts`.
8. Sửa code frontend cho tới khi `npm run typecheck` không lỗi.
9. Cập nhật script dữ liệu mẫu `apps/api/scripts/seed_demo.py` nếu cần.
10. Chạy `uv run pytest` và `npm test`. Báo lại tóm tắt thay đổi và file migration đã tạo.
