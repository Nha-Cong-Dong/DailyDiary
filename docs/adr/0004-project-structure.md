# 0004. Một cây dự án chuẩn ở `docs/Project_Structure.md`

- Trạng thái: Chấp nhận
- Ngày: 17/10/2026
- Liên quan: MVP_Plan.md Q12

## Bối cảnh

Cây thư mục từng được chép ở nhiều nơi (đặc tả, skill, CLAUDE.md) và lệch dần với thực tế: thiếu file cấu hình,
quy tắc thư mục feature không khớp code, `seed/` ở gốc repo không dùng được môi trường Python của API.

## Quyết định

- `docs/Project_Structure.md` là nguồn chuẩn duy nhất; nơi khác chỉ link tới.
- Đổi cấu trúc thì sửa file đó trong cùng commit với code, ghi lịch sử thay đổi; đổi lớn thì thêm ADR.
- File chưa tạo được ghi nhãn `(Bn)` theo bước trong `MVP_Plan.md`; tạo xong thì bỏ nhãn.
- `CLAUDE.md` yêu cầu Claude đối chiếu cây trước khi tạo/di chuyển/xóa file.

## Hệ quả

- Một chỗ để xem và review cấu trúc; giảm trùng lặp.
- Mỗi thay đổi cấu trúc thêm một bước cập nhật tài liệu, được nhắc trong `CLAUDE.md`.
