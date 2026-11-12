# 0007. Sổ chung và bạn bè: mở rộng Jotly sang nhiều người

- Trạng thái: Chấp nhận
- Ngày: 12/11/2026
- Liên quan: Project_Specs.md mục 2.1, 2.2, 4.1, 5.4 · `docs/Social_Plan.md` · thay thế một phần [ADR 0005](0005-share-in-mvp.md)

## Bối cảnh

Jotly là nhật ký **đơn người, riêng tư theo thiết kế**. ADR 0005 (21/10/2026) đưa "Chia sẻ một trang" vào MVP
nhưng ghi rõ: *"Không có nhật ký chung, bình luận, theo dõi người khác: những phần đó vẫn ngoài MVP"*.

Ngày 12/11/2026 người dùng đề xuất mở rộng theo hướng Locket + TikTok: kết bạn với tài khoản khác, ghi note
giữa hai người, mở rộng lên nhóm/tổ chức, và duy trì chuỗi ghi chung. Sau khi bàn bạc, người dùng chốt:

- làm **M1 (sổ chung 1–1) trước, từng bước**; nhóm/tổ chức để giai đoạn sau;
- mô hình M1 là **sổ chung**, không phải thẻ qua lại không đối xứng;
- chuỗi gồm **chuỗi ấm + badge đồng bộ**;
- trần quan hệ theo cấp tài khoản: `beta`/`free` **20 bạn, 10 sổ chung**; `premium` nhiều hơn.

`Roadmap.md` mục 2.3 vốn để "Nhật ký chung, nhật ký trao đổi luân phiên" ở giai đoạn 3; `Backlog.md` đã ghi
lối vào khóa "Nhật ký chung, sắp có" ở thanh điều hướng và Hồ sơ. Mô hình dữ liệu hiện tại **chưa hỗ trợ**:
`entries` có index unique `(user_id, entry_date)` và mỗi ngày là một document thuộc sở hữu riêng.

## Quyết định

- **Sổ chung là vật thể mới**, tách khỏi `entries`. Nhật ký cá nhân giữ nguyên: không ai đọc được `entries` của
  người khác, kể cả bạn bè.
- **Bốn chế độ, một loại vật thể** (`shared_journals`, `scope` + `mode`):
  - **M0 · Chia sẻ một trang** — đã có (ADR 0005), link công khai, người nhận không cần tài khoản. Giữ nguyên.
  - **M1 · Sổ chung "cùng ghi"** — 1–1, cả hai cùng viết. *Kế hoạch này.*
  - **M2 · Sổ chung "luân phiên"** — 1–1, mỗi ngày một người viết, đổi lượt. Sau M1.
  - **M3 · Sổ chung nhóm / tổ chức** — N thành viên, có vai trò. Sau M1, cần ADR riêng.
- **Mỗi người mỗi ngày tối đa một mục trong một sổ** — cùng bất biến "một ngày một trang" của `entries`.
- **Mục chung nhẹ hơn trang nhật ký**: tiêu đề ≤ 60, nội dung ≤ 500 ký tự, ≤ 2 ảnh, không có từ khóa. Mục chung
  là tín hiệu "tao vẫn ở đây", không phải nơi kể chuyện. Mọi giới hạn nằm trong `shared/limits.json`.
- **Chuỗi ấm** (chính): ngày nào sổ chung có ít nhất một mục của một trong hai thành viên. **Badge đồng bộ** (thành
  tích): số ngày cả hai cùng có mục. Chuỗi **không** nối qua mục ghi bù — tái dùng đúng logic
  `is_backfilled` / `current_streak` / `longest_run` đang chạy ở `services/calendar.py`.
- **Tìm bạn bằng mã bạn**, không tìm theo email. Mỗi tài khoản có một mã ngẫu nhiên 10 ký tự, **xoay được** bất
  cứ lúc nào; mã cũ và link mời theo mã cũ chết ngay (giống cách tắt link chia sẻ trong `share_links`).
  Lý do: tìm theo email tạo ra bản đồ quan hệ nhạy cảm và rò rỉ qua log.
- **Quan hệ phải được chấp nhận**: gửi mã → yêu cầu → người nhận chấp nhận → sinh sổ chung. Yêu cầu chờ hết
  hạn sau 30 ngày.
- **Kết thúc sổ chung**: ai cũng bấm được, hiệu lực tức thì. Người còn lại **không** thấy mục của người đã kết
  thúc; mỗi người **vẫn thấy mục của chính mình**. Không xóa gì.
- **Ảnh trong sổ chung** nằm dưới tiền tố `{user_id}/shared/` → tác vụ xóa tài khoản dọn được theo cơ chế
  `delete_prefix` sẵn có. Người khác xem qua link ký 1 giờ như mọi ảnh khác.
- **Không có feed công khai**, không khám phá, không theo dõi người lạ, không bình luận, không thả cảm xúc.
  Mượn từ Locket: cơ chế quan hệ 1–1 và đơn vị nhỏ mỗi ngày. Mượn từ TikTok: streak, nội dung ngắn, đều đặn —
  không mượn feed.
- **Mọi truy vấn chéo người dùng đi qua quan hệ đã được chấp nhận**, lọc theo `user_id` lấy từ phiên. Tài nguyên
  không thuộc người dùng → **404** (không phải 403, để không rò rỉ sự tồn tại). `author_id` luôn lấy từ phiên,
  không lấy từ body.
- **Không transaction nhiều document** (ADR 0001): thao tác nhiều collection chạy theo thứ tự và chạy lại được.
  Dùng `member_key` (hai uuid đã sắp xếp) + index unique để hai request cùng lúc chỉ tạo một sổ chung.
- **Chữ luôn được ghi miễn phí**: vượt hạn mức dung lượng ảnh thì vẫn ghi được mục chỉ có chữ (Roadmap mục 3.3).

## Hệ quả

- Thêm ba collection: `shared_journals`, `shared_entries`, `friendships`; thêm `users.friend_code` (unique, sparse).
  Migration `m0010` theo mẫu `m0005`/`m0006` (copy validator cũ rồi `collMod`).
- `deletion_log` thêm loại `"social"` — chỉ loại, thời điểm, số lượng; không `user_id`/email/nội dung.
- Xóa tài khoản phải dọn thêm `shared_journals` (mình là thành viên), `shared_entries` mình viết,
  `friendships` liên quan và ảnh dưới `{user_id}/shared/`.
- **Pháp lý**: `Project_Specs.md` mục 4.1 đã ghi rà soát chuyển dữ liệu xuyên biên là bắt buộc trước khi ra mắt
  công khai; tính năng này làm dữ liệu nhật ký có liên quan với người khác → phải rà soát **trước khi mở rộng**
  ra ngoài nhóm beta. `/privacy` mục "Ai xem được nhật ký" phải viết lại.
- Trần quan hệ theo cấp là **điểm kiếm tiền đầu tiên** của tính năng (`beta`/`free`: 20 bạn, 10 sổ).
- ADR 0005 giữ nguyên phần "chia sẻ một trang"; chỉ dòng *"Không có nhật ký chung, bình luận, theo dõi người khác"*
  bị thay thế bởi ADR này.
- Mọi chữ hiển thị mới phải có **cả hai** ngôn ngữ (ADR 0006); chữ tiếng Anh dài hơn → kiểm tra tràn ở 360 px.
- Chi phí: mỗi truy vấn đọc sổ chung là một lần đọc DB thêm (ADR 0002 ghi nhận chi phí này).
