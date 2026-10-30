# Jotly – Định hướng sản phẩm

|                 |                                                                                      |
| --------------- | ------------------------------------------------------------------------------------ |
| **Vai trò**     | Bối cảnh, lộ trình, kiếm tiền, rủi ro, ý tưởng và nhật ký quyết định. Hệ thống **đang chạy** mô tả ở [`Project_Specs.md`](Project_Specs.md) |
| **Cập nhật**    | 30/10/2026                                                  |

## 1. Bối cảnh

### 1.1. Vấn đề và giải pháp

Nhiều người muốn ghi lại cuộc sống và thay các nguồn "dopamine nhanh" bằng thói quen lành mạnh; điểm chung là cảm giác
tiến bộ khi nhìn lại hành trình. Sổ giấy khó mang theo, khó tìm lại; app ghi chú thì khô khan, không cho thấy sự thay
đổi theo thời gian. **Jotly** (tên mã DailyDiary): mỗi ngày một trang, chấm điểm trong một chạm, nhìn lại qua dòng thời
gian, lịch tháng, Year in Pixels. Mục tiêu giai đoạn 1: **ghi lại mỗi ngày thật dễ, và nhìn lại thì thấy vui.**

### 1.2. Đối tượng

Người viết nhật ký (giấy hoặc số), người thích trang trí sổ, người xây dựng lối sống lành mạnh hay theo dõi tâm trạng,
học sinh sinh viên, người thích du lịch, cha mẹ ghi lại quá trình con lớn, người đang trải qua thay đổi lớn; cặp đôi,
nhóm bạn, gia đình *(giai đoạn sau)*. Từ 16 tuổi.

### 1.3. Chỉ số thành công (chuyển sang giai đoạn 2)

| Chỉ số                                              | Cách đo                                              |
| --------------------------------------------------- | ---------------------------------------------------- |
| Còn hoạt động sau 7 ngày (D7) và 30 ngày (D30)       | Collection `entries`, phiên đăng nhập                |
| Số ngày được ghi trung bình mỗi tuần / người        | Collection `entries`                                 |
| Tỉ lệ "ghi đúng ngày" so với "cập nhật muộn"        | So `updated_at` (múi giờ người dùng) với `entry_date` |
| Thiết bị thường dùng để ghi                         | Phân tích sự kiện — hoãn cùng Umami                  |
| Mức sẵn sàng giới thiệu (NPS)                       | Khảo sát sau 2–4 tuần                                |

## 2. Lộ trình

### 2.1. Giai đoạn 1 — MVP

Chi tiết 15 bước và kết quả: [`MVP_Plan.md`](MVP_Plan.md). Trước khi mời người dùng thử: tự dùng app 2–3 ngày để bắt lỗi
múi giờ, tự động lưu, tải ảnh.

### 2.2. Giai đoạn 2 — hoàn thiện, tăng giữ chân

- PWA, nhắc viết nhật ký (thông báo đẩy, email dự phòng).
- Cá nhân hóa: chủ đề, theme, bộ biểu tượng mới; xác định phần **miễn phí vĩnh viễn** và phần trả phí mới.
- "Ngày này năm trước", tiến trình/mục tiêu với so sánh trước – sau, thư gửi tương lai.
- Đăng nhập Facebook; đánh giá lại trọng tâm nền tảng theo dữ liệu thiết bị.

### 2.3. Giai đoạn 3 — ra mắt và kiếm tiền

- Ứng dụng di động (Capacitor hoặc React Native).
- Cửa hàng gói cá nhân hóa, tiền ảo; cân nhắc thuê bao cho dung lượng ảnh, video tổng kết.
- Nhật ký chung, nhật ký trao đổi luân phiên; backend thanh toán, sổ cái giao dịch.

### 2.4. Kế hoạch 2 tuần ban đầu (tham khảo)

Lịch dự kiến lúc lập đặc tả (16/10/2026). `MVP_Plan.md` chia lại thành 15 bước và đối chiếu với bảng này ở cột "Ngày".

| Ngày | Công việc                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------- |
| 1–2  | Phác thảo giao diện, dựng monorepo, Docker Compose, mô hình dữ liệu, migration đầu tiên         |
| 3    | Đăng nhập Google, hồ sơ, múi giờ                                                                |
| 4–5  | Viết/sửa/xóa nhật ký: các trường chữ, từ khóa, cờ hiệu, main icon, sub icon; tự động lưu        |
| 6–7  | Tải ảnh (nén, presigned URL, ảnh thu nhỏ); dòng thời gian                                       |
| 8–9  | Lịch tháng + thống kê tháng                                                                     |
| 10   | Year in Pixels                                                                                  |
| 11   | Tìm kiếm; xóa dữ liệu, xóa tài khoản; góp ý                                                    |
| 12   | Rate limit, hạn mức dung lượng, log, bắt lỗi, phân tích sự kiện                                 |
| 13   | Hoàn thiện giao diện, kiểm tra trên điện thoại, nạp dữ liệu mẫu, triển khai production          |
| 14   | Kiểm thử phân quyền, thử khôi phục sao lưu, sửa lỗi, chuẩn bị demo                              |

### 2.5. Lưu trữ dữ liệu theo giai đoạn

|                           | Giai đoạn 1                     | Giai đoạn 2                              | Giai đoạn 3                                         |
| ------------------------- | ------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| Thông tin ngày + nội dung | MongoDB                         | + bộ nhớ đệm IndexedDB các tháng gần đây | + SQLite trên điện thoại, đồng bộ hai chiều         |
| Ảnh                       | Kho riêng tư, bản nén + ảnh nhỏ | Có thể chuyển sang kho rẻ hơn            | Phân tầng nóng/lạnh; gói trả phí giữ chất lượng cao |
| Biểu tượng, chủ đề        | Đóng gói trong frontend         | CDN có đánh số phiên bản                 | CDN + cửa hàng vật phẩm                             |
| Bản nháp                  | IndexedDB                       | IndexedDB + hàng đợi đồng bộ ngoại tuyến | Cơ sở dữ liệu trên máy                              |
| Giao dịch                 | Chưa có (đã có `user_items`)    | Chưa có                                  | Sổ cái riêng, chỉ thêm, chỉ server được ghi         |
| Mã hóa                    | Mã hóa khi lưu của nhà cung cấp | Như giai đoạn 1                          | (Tùy chọn) mã hóa đầu cuối do người dùng bật        |

### 2.6. So sánh hướng nền tảng

| Tiêu chí               | Web app (+ PWA)          | Desktop app             | Mobile app                             |
| ---------------------- | ------------------------ | ----------------------- | -------------------------------------- |
| Tốc độ làm             | Nhanh nhất               | Trung bình              | Chậm nhất                              |
| Rào cản người dùng mới | Thấp nhất (gửi link)     | Cao                     | Trung bình                             |
| Bối cảnh viết nhật ký  | Tốt trên máy tính        | Hợp người viết dài      | Phù hợp nhất                           |
| Nhắc nhở               | Hạn chế (nhất là iPhone) | Chỉ khi máy bật         | Tốt nhất                               |
| Kiếm tiền              | Tự chọn cổng thanh toán  | Tự chọn cổng thanh toán | Thuận tiện nhưng chịu phí kho ứng dụng |
| Tiềm năng dài hạn      | Nền tảng kiểm chứng      | Thấp                    | Cao nhất                               |

Hướng chọn: web + PWA ở giai đoạn 1–2 → mobile khi đã chứng minh được giữ chân → desktop ưu tiên thấp.

## 3. Kiếm tiền và giới hạn

### 3.1. Nguyên tắc cam kết

- **Dữ liệu thuộc về người dùng**: viết, xem lại, tìm kiếm, xóa luôn miễn phí. (Xuất dữ liệu đã bỏ 21/10/2026; xem lại
  nếu luật bảo vệ dữ liệu yêu cầu quyền nhận bản sao.)
- **Không lấy lại những gì đã có**: ảnh đã tải lên luôn xem được; vật phẩm đã nhận luôn giữ.
- **Thu tiền cho cái mới, không thu tiền cho cái cũ.**
- **Minh bạch**: ghi rõ beta, giới hạn có thể đổi, công bố trước phần miễn phí vĩnh viễn.
- Không bán dữ liệu, không quảng cáo, không dùng nhật ký để huấn luyện AI.

### 3.2. Gói miễn phí lâu dài (định hướng)

| Hạng mục                                | Chi phí vận hành | Gói miễn phí lâu dài                            |
| --------------------------------------- | ---------------- | ----------------------------------------------- |
| Trang, chữ, từ khóa                     | Rất thấp         | Không giới hạn                                  |
| Bộ biểu tượng cơ bản, sub icon, cờ hiệu | Không đáng kể    | Miễn phí                                        |
| Lịch, Year in Pixels, thống kê tháng    | Thấp             | Miễn phí; thống kê nâng cao có thể trả phí      |
| Ảnh                                     | Cao nhất         | Ví dụ 3–5 ảnh/ngày; nhiều hơn thuộc gói trả phí |
| Chủ đề, bộ biểu tượng mới               | Chi phí thiết kế | Nội dung trả phí trong cửa hàng                 |

### 3.3. Khi bật kiếm tiền

1. Ưu đãi người dùng sớm: giữ một phần quyền lợi beta, huy hiệu "Thành viên sáng lập".
2. Báo trước ít nhất 30 ngày, giải thích lý do; ưu đãi mở bán cho người dùng beta.
3. Chạm giới hạn nhẹ nhàng: không bao giờ chặn việc lưu chữ và biểu tượng.
4. Vật phẩm miễn phí theo **cột mốc** (30, 100 ngày), không thưởng theo từng trang.
5. Thu thập mức sẵn sàng chi trả trong beta (khảo sát, chủ đề được dùng nhiều).

Đã chuẩn bị trong code: giới hạn theo cấp tài khoản (`beta`/`free`/`premium`) trong `shared/limits.json`,
`users.account_tier`, collection `user_items`, `joined_at`.

## 4. Rủi ro

| Rủi ro                                                  | Biện pháp                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Trải nghiệm điện thoại kém làm giảm tỉ lệ quay lại      | Giao diện riêng từ 360 px, chấm điểm nhanh; e2e chạy cả kích thước điện thoại                 |
| Lỗi múi giờ làm trang rơi vào sai ngày                  | `entry_date` là ngày địa phương; test mốc 23:59, 00:01, múi giờ âm, năm nhuận                |
| Mất bài khi mất mạng                                    | Nháp IndexedDB + trạng thái đồng bộ + thử lại tăng dần                                       |
| Lộ dữ liệu nhật ký                                      | Lọc `user_id` mọi truy vấn, kho ảnh riêng tư, không log nội dung, test truy cập chéo          |
| Mất dữ liệu do sự cố nhà cung cấp                       | Sao lưu 3 lần/ngày sang nhà cung cấp khác; thử khôi phục định kỳ                             |
| Chi phí lưu ảnh vượt dự kiến                            | Nén ảnh, không lưu ảnh gốc, hạn mức theo người, theo dõi hằng tuần                           |
| API chạy trên máy cá nhân: máy tắt hoặc mất mạng là ngừng | Chấp nhận ở giai đoạn tự dùng; chuyển lên VPS hoặc nền tảng trả phí trước khi mời người dùng thật |
| Quy định bảo vệ dữ liệu cá nhân (chuyển dữ liệu ra nước ngoài) | Rà soát pháp lý trước khi ra mắt công khai                                            |
| Phản ứng tiêu cực khi bắt đầu thu phí                   | Nguyên tắc mục 3                                                                             |
| Tiền ảo phức tạp về kỹ thuật và pháp lý                 | Sổ cái riêng; tìm hiểu quy định trước giai đoạn 3                                            |
| Tên trùng với app khác                                  | Kiểm tra tên miền, kho ứng dụng, khả năng đăng ký nhãn hiệu "Jotly"                          |

## 5. Kho ý tưởng

- Year in Pixels bằng ảnh thu nhỏ, viền màu theo tâm trạng; slide/video tổng kết tháng, năm.
- Trò chơi hóa nhẹ nhàng (cây, căn phòng lớn dần theo hành trình); sổ tay trang trí số (sticker, washi tape, chữ tay).
- Nhật ký trao đổi luân phiên; thư gửi tương lai gắn với mục tiêu; so sánh "trước – sau".
- Đối chiếu thời gian dùng mạng xã hội với tâm trạng (có sự đồng ý).
- Bản địa hóa: âm lịch, ngày lễ, tổng kết dịp Tết.
- "Chương đời": AI tóm tắt mỗi tháng (tùy chọn, minh bạch về dữ liệu); in nhật ký thành sách ảnh.

**Sản phẩm tham khảo:** Day One ("On This Day", nhật ký chung), Daylio (ghi bằng 2 chạm, Year in Pixels),
1 Second Everyday (video tổng kết), Finch (thú cưng ảo theo thói quen), Reflectly/Rosebud/Stoic/Mindsera (câu hỏi gợi
ý, AI phân tích cảm xúc).

## 6. Nhật ký quyết định

| Ngày | Quyết định | Nguồn |
| --- | --- | --- |
| 16/10/2026 | Phát triển trên Windows với uv; ảnh thu nhỏ tạo ở trình duyệt | MVP_Plan Q1, Q3 |
| 17/10/2026 | Đổi DB từ PostgreSQL sang **MongoDB**; một cây dự án chuẩn; không cài CLI shadcn; phiên lưu trong DB + CSRF double-submit | ADR 0001–0004 |
| 20/10/2026 | Tìm kiếm tiêu đề + nội dung + từ khóa, có "Mọi lúc"; bộ biểu tượng áp cho mọi ngày; cho đổi ảnh đại diện | Thiết kế B7 |
| 21/10/2026 | Chia sẻ một trang vào MVP; bỏ xuất dữ liệu; dòng thời gian theo tháng; ghi bù không nối chuỗi; ảnh gốc 10 MB, nhận HEIC; DB beta Atlas Singapore | ADR 0005, thiết kế B8–B9, Bước 4 |
| 23/10/2026 | Giữ 6 bộ main icon + 47 sub icon; 8 màu cờ + màu tự thêm; góp ý qua Gmail SMTP | MVP_Plan Q5, Q6 |
| 23–24/10/2026 | Xóa tài khoản: góp ý ẩn danh, đăng nhập lại tạo tài khoản mới, cần đăng nhập trong 10 phút, email xác nhận; Thùng rác; `deletion_log` | Bước 12 |
| 24/10/2026 | Hạn mức ảnh 500 MB, cảnh báo 80%; nhóm rate limit mới; tác vụ dọn dẹp/sao lưu; Sentry và Umami làm rồi **tạm gỡ** | Bước 13 |
| 24/10/2026 | Kho sao lưu Backblaze B2; chính sách quyền riêng tư `/privacy`, từ 16 tuổi; tối ưu LCP | Bước 13–14 |
| 25/10/2026 | Hạ tầng: Render Free (Singapore, Docker), Cloudflare Pages + R2, GitHub Actions cron, `jotly.io.vn`; dùng lại DB beta, migration chạy tay bằng user riêng; header bảo mật | Bước 14 |
| 25/10/2026 | Đặc tả chỉ mô tả hệ thống hiện tại (bản 2.0); bối cảnh và định hướng tách sang file này | – |
| 29/10/2026 | API chuyển từ Render sang Docker trên máy cá nhân + Cloudflare Tunnel; web dùng Pages Direct Upload; `COOKIE_DOMAIN=jotly.io.vn` | Bước 14, `Deploy.md` |
| 30/10/2026 | OAuth Google In production (thương hiệu đã xác minh); **chốt bản 1.0**, việc còn lại gom vào `Backlog.md` | Bước 14–15 |
| 30/10/2026 | Hệ thiết kế 1.1: giữ Neo Brutalism, màu sáng lấy từ logo trên nền `#FFFCF8`, font Commissioner thay Be Vietnam Pro và Lora; chuyển cảnh nối component bằng View Transitions; bản 1.1 làm B1, B2, B5, bỏ mục Tính năng và Riêng tư cũ của trang chủ | `DESIGN.md` |
