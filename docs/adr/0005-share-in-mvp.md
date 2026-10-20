# 0005. Đưa "Chia sẻ một trang" vào MVP

- Trạng thái: Chấp nhận
- Ngày: 21/10/2026
- Liên quan: Project_Specs.md mục 2.2, F-10, 5.4, 5.5 · MVP_Plan.md Bước 11b · thiết kế B8

## Bối cảnh

Đặc tả v0.1 xếp chia sẻ nhật ký ngoài MVP (mục 2.2); giao diện chỉ hiện nút "Chia sẻ" khóa, ghi "Sắp có".
Thiết kế B8 vẽ đầy đủ luồng chia sẻ một trang qua link: chọn từng phần người nhận thấy, trang xem công khai,
danh sách link đang bật, màn link đã tắt. Ngày 21/10/2026 người dùng chọn làm cả giao diện lẫn backend trong MVP.

## Quyết định

- Chỉ chia sẻ **một trang (một ngày) qua link chỉ xem**. Không có nhật ký chung, bình luận, theo dõi người khác:
  những phần đó vẫn ngoài MVP.
- Mỗi ngày có tối đa một link đang bật. Link mang token ngẫu nhiên khó đoán; người viết chọn từng phần được hiện
  (tên, điểm, sub icon, cờ, tiêu đề, nội dung, từ khóa, từng ảnh). Ngày viết luôn hiện.
- Tắt link là thu hồi vĩnh viễn; bật lại tạo token mới. Trang bị xóa mềm hoặc tài khoản bị xóa thì link không mở được.
- Trang công khai không cần đăng nhập, có rate limit theo IP, không cho máy tìm kiếm lập chỉ mục, mọi lỗi trả
  chung một màn "Trang này không mở được" để không lộ lý do.
- Backend phần link làm sớm (trước Bước 5) vì không phụ thuộc giao diện; nối giao diện thật sau khi có API nhật ký
  (Bước 5) và ảnh (Bước 7).

## Hệ quả

- Thêm collection `share_links`, nhóm endpoint chủ sở hữu và một endpoint công khai; thêm trang `/s/:token`
  ngoài khung app.
- Mặc định riêng tư vẫn giữ: không bật link thì không ai xem được. Nhưng nay có dữ liệu nhật ký rời khỏi tài khoản,
  nên `privacy-check` và test truy cập chéo phải phủ cả các endpoint này.
- Xuất dữ liệu (F-08) và xóa tài khoản (F-07) phải tính tới link chia sẻ.
- Kế hoạch thêm Bước 11b; tổng khối lượng MVP tăng.
