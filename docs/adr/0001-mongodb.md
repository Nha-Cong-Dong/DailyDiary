# 0001. Dùng MongoDB thay PostgreSQL

- Trạng thái: Chấp nhận
- Ngày: 17/10/2026
- Liên quan: MVP_Plan.md Q2, Q11 · Project_Specs.md mục 5.4

## Bối cảnh

Bản đầu của bước 1 dùng PostgreSQL + SQLAlchemy + Alembic. Chủ dự án quyết định đổi sang cơ sở dữ liệu
phi quan hệ vì tính chất dữ liệu: mỗi ngày là một bản ghi tự chứa (chữ, biểu tượng, từ khóa, tối đa 10 ảnh),
hầu như luôn được đọc/ghi trọn một ngày.

## Quyết định

- MongoDB 8.0; local chạy bằng Docker Compose, production dùng dịch vụ có quản lý (vd. MongoDB Atlas, Singapore).
- Driver PyMongo async (`AsyncMongoClient`). Không dùng Motor (ngừng phát triển), không dùng ODM.
- Một nhật ký là một document; từ khóa và ảnh nhúng bên trong. `_id` là UUID; `entry_date` là chuỗi `YYYY-MM-DD`.
- Không dùng transaction trong MVP. Thao tác nhiều collection (xóa tài khoản) chạy theo thứ tự, chạy lại được.
- Validator `$jsonSchema` + index quản lý bằng migration tự viết (`python -m app.db.migrate`, chỉ tiến).

## Hệ quả

- Ghi một ngày là một thao tác nguyên tử; giới hạn số ảnh, phát hiện xung đột đều nằm trong filter.
- Không có khóa ngoại: xóa dữ liệu liên quan phải làm bằng code.
- Tìm kiếm không dấu tính trong app (`keyword_norm`) thay vì extension `unaccent`.
- Mất lựa chọn Row Level Security; bảo vệ dữ liệu dựa vào bộ lọc `user_id` trong service và test truy cập chéo.
- Phải chống NoSQL injection: không đưa dict từ request vào filter/update.
- Sao lưu mỗi 8 giờ (mục 4.2): gói hosting phải có sao lưu tự động, nếu không thì thêm tác vụ `mongodump` ở bước 13.
