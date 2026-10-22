---
name: api-conventions
description: Quy ước code backend FastAPI của DailyDiary. Dùng khi viết hoặc sửa router, service, schema, model, migration, rate limit, xử lý ảnh hoặc test trong apps/api.
---

# Quy ước backend

## Cấu trúc
Cây thư mục chuẩn: `docs/Project_Structure.md` (không tạo thư mục ngoài cây đó; đổi cấu trúc thì sửa file đó cùng lúc).
- `routers/`: chỉ nhận request, gọi service, trả response. Không chứa truy vấn DB.
- `services/`: logic nghiệp vụ và truy vấn MongoDB. Mọi hàm nhận `user_id` làm tham số đầu tiên.
- `schemas/`: Pydantic v2; tách `XxxCreate`, `XxxUpdate`, `XxxOut`.
- `db/`: client MongoDB, tên collection, migration. `core/`: cấu hình, bảo mật, rate limit, logging.

## Bắt buộc
- Lấy người dùng bằng dependency `current_user = Depends(get_current_user)`; không đọc `user_id` từ body hay query.
- Giới hạn đọc từ `shared/limits.json` qua `core/limits.py`, không viết cứng con số.
- Rate limit bằng `slowapi` theo bảng trong mục 4.4 của đặc tả.
- Chuẩn hóa chuỗi người dùng nhập bằng Unicode NFC; từ khóa lưu thêm `keyword_norm` (chữ thường, bỏ dấu).
- Không log body request hay nội dung nhật ký.

## Lỗi
Trả dạng thống nhất:
```json
{"error": {"code": "ENTRY_LIMIT_PHOTOS", "message": "Mỗi ngày tối đa 10 ảnh"}}
```
- 401 chưa đăng nhập; 403 `CSRF_FAILED` khi request ghi thiếu/sai CSRF; 404 khi tài nguyên không tồn tại hoặc không thuộc người dùng; 409 xung đột `updated_at`; 422 dữ liệu sai; 429 vượt rate limit.

## Ảnh
- Upload qua presigned URL; endpoint xác nhận phải kiểm tra file tồn tại, đúng định dạng (JPEG/PNG/WebP), đúng kích thước, rồi mới tạo bản ghi `entry_photos`.

## Test
- pytest + httpx AsyncClient; mỗi endpoint có ít nhất: ca thành công, ca dữ liệu sai, ca truy cập chéo tài khoản.
