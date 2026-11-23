# Jotly – Kế hoạch tính năng xã hội

|                 |                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Vai trò**     | Kế hoạch xây tính năng xã hội: bạn bè, sổ chung, chuỗi, nhóm. Bổ sung cho [`Roadmap.md`](Roadmap.md) và [`Project_Specs.md`](Project_Specs.md). |
| **Trạng thái**  | Giai đoạn 0 (giấy tờ + ADR 0007) đã xong 12/11/2026; sẵn sàng cho Giai đoạn 1 (code) theo mục 10 đã chốt |
| **Ngày lập**    | 12/11/2026                                                                                        |
| **Liên quan**   | Hệ thống hiện tại: [`Project_Specs.md`](Project_Specs.md) · Kiến trúc: [`adr/`](adr/) · Cây dự án: [`Project_Structure.md`](Project_Structure.md) · Việc tồn đọng: [`Backlog.md`](Backlog.md) |

## 0. Tóm tắt

Jotly hiện là nhật ký **đơn người, riêng tư theo thiết kế**. Kế hoạch này mở rộng nó thành nhật ký **vẫn riêng tư
nhưng có thể dùng chung với người thân**: bạn bè, một cuốn **sổ chung** cho mỗi cặp, và một **chuỗi (streak)** giữ
quan hệ ấm.

Ba nguyên tắc bất di bất dịch (lấy từ [`adr/0005`](adr/0005-share-in-mvp.md) và `PRODUCT.md`):

1. **Nhật ký cá nhân không đổi.** Không ai đọc được `entries` của người khác. Sổ chung là vật thể **riêng**,
   không phải "mở nhật ký ra".
2. **Không có feed công khai.** Không trào dâng, không khám phá, không thuật toán đề xuất. Chỉ những gì người
   dùng chủ động kết nối.
3. **Mọi truy vấn chéo người dùng đi qua quan hệ đã được chấp nhận**, lọc theo `user_id` lấy từ phiên. Không
   đưa nguyên dict từ request vào bộ lọc MongoDB.

## 1. Bối cảnh: mượn gì, không mượn gì

| Nguồn | Mượn | Không mượn |
| --- | --- | --- |
| **Locket** | Cơ chế quan hệ 1–1; đơn vị nhỏ, mỗi ngày một lần; cảm giác "có người nghĩ đến mình"; thẻ của tôi – thẻ của bạn | Chia sẻ ảnh công khai, widget trên màn hình chính, xếp hạng bạn bè |
| **TikTok** | **Chuỗi** (streak) giữ chân; nội dung ngắn; đều đặn hằng ngày | Feed, thuật toán khám phá, thước đo tương tác, biểu ngữ, nhạc trending, thả cảm xúc |
| **Day One** | "On This Day", khái niệm nhật ký chung | (đã nằm trong kho ý tưởng) |

**Vì sao Jotly phù hợp để làm phần này:** sổ chung là nơi duy nhất mà *hai người cùng có thời gian thật* — mỗi
người một ngày, một mục. Đó là đơn vị nhỏ nhất mà vẫn giữ được ý nghĩa nhật ký.

**Điều kiện để làm được:** mô hình dữ liệu hiện tại **chưa** hỗ trợ. `entries` có index unique
`(user_id, entry_date)` và mỗi ngày là một document thuộc sở hữu riêng. Sổ chung cần một loại vật thể mới, tách
khỏi `entries`. ADR 0005 hiện ghi *"Không có nhật ký chung, bình luận, theo dõi người khác: những phần đó vẫn
ngoài MVP"* → cần **ADR mới thay thế** (ADR 0007), không sửa ADR 0005.

## 2. Mô hình khái niệm

### 2.1 Bốn chế độ, một vật thể

Các "chế độ" trong ý tưởng gốc được gộp thành **một loại vật thể — sổ chung (`shared_journals`)** — với thuộc
tính `mode` và `scope`:

| Chế độ | Ai viết | Đơn vị | Chuỗi | Giai đoạn |
| --- | --- | --- | --- | --- |
| **M0 · Chia sẻ một trang** (đã có) | Chủ trang | 1 trang / ngày | không | xong — `share_links` |
| **M1 · Sổ chung "cùng ghi"** | Cả hai, **mỗi ngày mỗi người tối đa 1 mục** | 1 mục / người / ngày | ấm + badge đồng bộ | **kế hoạch này** |
| **M2 · Sổ chung "luân phiên"** | Một người mỗi ngày, đổi lượt | 1 mục / cặp / ngày | ấm | sau M1 |
| **M3 · Sổ chung nhóm / tổ chức** | N thành viên, có vai trò | 1 mục / người / ngày | ấm nhóm | sau M1 |

M0 giữ nguyên như hiện tại: link công khai, người nhận **không cần tài khoản**, chủ trang toàn quyền chọn bộ phận
được chia sẻ. M0 **không** sinh chuỗi và **không** cần quan hệ bạn bè.

### 2.2 "Mục chung" là gì

Một mục trong sổ chung **nhẹ hơn một trang nhật ký**, cố tình:

| Trường | Nhật ký cá nhân (`entries`) | Mục chung (`shared_entries`) |
| --- | --- | --- |
| `score` | bắt buộc 1–5 | bắt buộc 1–5 (dùng chính bộ icon của hồ sơ) |
| `title` | ≤ 100 ký tự | ≤ 60 ký tự |
| `content` | ≤ 20 000 ký tự | **≤ 500 ký tự** |
| `photos` | ≤ 10 ảnh/ngày | **≤ 2 ảnh** |
| `keywords` | ≤ 10 | không có |
| `flag_color`, `sub_icon` | có | có |

Lý do giới hạn: mục chung là **tín hiệu "tao vẫn ở đây"**, không phải nơi kể chuyện. Giới hạn cứng giữ cho
sổ chung là nơi giao tiếp, còn nhật ký cá nhân mới là nơi kể. Việc giới hạn nằm trong `shared/limits.json`
(nguyên tắc của dự án: **không viết cứng giới hạn**).

### 2.3 Chuỗi và badge

Tái dùng nguyên văn logic đang chạy ở `services/calendar.py` (`current_streak`, `longest_run`, `is_backfilled`)
thay vì viết lại:

- **Chuỗi ấm (chính)**: ngày nào sổ chung **có ít nhất một mục** của một trong hai thành viên. Đếm lùi từ
  "hôm nay" của người đang xem, dừng ở chỗ đứt. Tính theo múi giờ **người xem** (giống hết mọi mốc thời gian
  trong dự án).
- **Badge đồng bộ**: số ngày mà **cả hai** cùng có mục (cùng chuỗi ngày `YYYY-MM-DD`). Thành tích, không phải
  điều kiện giữ chuỗi.
- **Ghi bù không nối chuỗi**: mục viết cho ngày đã qua (`created_at` theo múi giờ người viết rơi sau `entry_date`)
  vẫn hiện trong sổ nhưng **không** tính vào chuỗi — đúng quy tắc `is_backfilled` sẵn có.
- **Khác múi giờ**: hai người ở múi khác nhau có thể thấy chuỗi lệch nhau 1 ngày. Đây là hệ quả tự nhiên của
  "hôm nay là ngày địa phương"; nói rõ trong giao diện, không ép bằng cách đổi quy tắc.

### 2.4 Tìm bạn bè — mã bạn, không tìm theo email

Jotly lưu email để đăng nhập. Tìm bạn theo email sẽ tạo ra một bản đồ nhạy cảm (email ↔ quan hệ) và rò rỉ qua
log. Thay vào đó:

- Mỗi tài khoản có một **mã bạn** ngẫu nhiên, in hoa, bảng chữ không nhầm (bỏ `0/O`, `1/I`), dạng
  `K7M2QP4R` — **10 ký tự ≈ 50 bit**.
- Người dùng **xoay mã** bất cứ lúc nào → mã cũ chết ngay, link mời cũng chết (giống cách tắt link chia sẻ
  trong `share_links`).
- Chia sẻ ngoài đời: copy mã, hoặc link `https://jotly.io.vn/f/K7M2QP4R`.
- Không tiết lộ mã trong log (xem mục 5.4) và giới hạn số lần thử tra cứu theo IP.

### 2.5 Vòng đời quan hệ

```
        gửi yêu cầu            chấp nhận                    mời mở sổ           chấp nhận
A ────────────────────► B ──────────────► bạn (chưa có sổ) ──────────────► sổ chung (active)
                          │                    │                                  │
                   từ chối / hết hạn     từ chối / hết hạn                   kết thúc (một bên bấm)
                                                                                   ▼
                                                                        sổ chung (ended)
```

- Yêu cầu phải được **chấp nhận** (không tự động kết bạn) — bắt buộc cho riêng tư.
- **Thành bạn chưa chắc đã có sổ** (hiệu đính 21/11/2026): chấp nhận chỉ tạo quan hệ bạn; sổ chung
  được tạo khi hai bên cùng chấp nhận một **lời mời mở sổ** (`journal_requests`). Không ai tự sinh sổ cho cặp khác.
- **Theo dõi lần hoạt động** (hiệu đính 21/11/2026): `users.last_active` cập nhật theo request; hiện
  "Lần hoạt động: …" ở danh sách bạn và thẻ sổ. Mốc: <5 phút "vừa xong"; 5–59 phút làm tròn xuống mốc 5 phút;
  ≥60 phút theo giờ ("lúc HH:mm" / "D/M").
- **Kết thúc sổ chung**: ai cũng bấm được, hiệu lực tức thì. Người còn lại **không** thấy các mục của người đã
  kết thúc nữa; mỗi người **vẫn thấy mục của chính mình** (dữ liệu thuộc về người viết). Không xóa gì;
  lời mời mở sổ đang chờ của cặp bị hủy.
- Yêu cầu chờ quá 30 ngày thì hết hạn (dọn bằng tác vụ định kỳ).

## 3. Mô hình dữ liệu

### 3.1 Collection mới

**`shared_journals`** — sổ chung (một bản ghi cho mỗi cặp):

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `_id` | binData (uuid4) | như mọi collection khác |
| `scope` | `"pair"` \| `"group"` | M1 chỉ `"pair"`; `"group"` để dành cho M3 |
| `member_key` | string | `"uuidA|uuidB"`, hai uuid **sắp xếp** → dùng cho index unique 1–1 |
| `members` | array | `[{user_id, role, joined_at}]`, `role` = `owner` \| `member` |
| `mode` | `"together"` \| `"alternating"` | M1 chỉ `"together"`; M2 thêm `"alternating"` |
| `status` | `"active"` \| `"ended"` | |
| `created_by` | binData | |
| `created_at`, `updated_at`, `ended_at` | date | `ended_at` = null khi còn active |

Index:

| Tên | Key | Ghi chú |
| --- | --- | --- |
| `uq_member_key_generation` | `member_key` ASC, `generation` ASC, **unique**, partial `{scope: "pair"}` | một sổ mỗi lần cho mỗi cặp; sổ cũ lưu trữ, sổ mới `generation` + 1 (tối đa `journals_per_pair_max`) — m0013 |
| `ix_journal_member` | `members.user_id` ASC | tìm sổ chung của một người |
| `ix_journal_status` | `status` ASC, `created_at` DESC | danh sách sổ chung đang active |

**`shared_entries`** — các mục ghi trong sổ chung:

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `_id` | binData (uuid4) | |
| `journal_id` | binData | trỏ tới `shared_journals._id` |
| `author_id` | binData | **luôn là một thành viên của sổ** |
| `entry_date` | string `^\d{4}-\d{2}-\d{2}$` | ngày địa phương **của người viết** |
| `score` | int 1–5 | bắt buộc |
| `title` | string \| null | ≤ 60 |
| `content` | string \| null | ≤ 500 |
| `sub_icon`, `flag_color` | string \| null | như `entries` |
| `photos` | array | cùng cấu trúc `photos` của `entries` (`id`, `storage_key`, `thumb_key`, `width`, `height`, `size_bytes`, `position`, `created_at`) |
| `created_at`, `updated_at` | date | |
| `deleted_at` | date \| null | xóa mềm, giống `entries` |

Index:

| Tên | Key | Ghi chú |
| --- | --- | --- |
| `uq_journal_author_day` | `journal_id` ASC, `author_id` ASC, `entry_date` DESC, **unique** | **mỗi người mỗi ngày tối đa 1 mục** |
| `ix_journal_date` | `journal_id` ASC, `entry_date` DESC | nguồn của chuỗi và badge |
| `ix_journal_author_date` | `journal_id` ASC, `author_id` ASC, `entry_date` DESC | lọc "mục của tôi" |

**`friendships`** — yêu cầu kết bạn:

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `_id` | binData (uuid4) | |
| `requester_id`, `addressee_id` | binData | |
| `status` | `"pending"` \| `"accepted"` \| `"declined"` \| `"ended"` | |
| `journal_id` | binData \| null | sổ chung (sinh khi lời mời mở sổ được hai bên chấp nhận; hiệu đính 21/11/2026) |
| `created_at`, `responded_at` | date | hết hạn sau 30 ngày khi còn `pending` |

Index: `ix_friend_request_addressee` (`addressee_id`, `status`), `ix_friend_request_requester`, `ix_friend_status`.

**`journal_requests`** (hiệu đính 21/11/2026, migration `m0011`) — lời mời mở sổ chung giữa hai người bạn:

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `_id` | binData (uuid4) | |
| `requester_id`, `addressee_id` | binData | người mời / người được mời |
| `status` | `"pending"` \| `"accepted"` \| `"declined"` | chỉ người được mời phản hồi |
| `journal_id` | binData \| null | sổ sinh ra khi `accepted` |
| `created_at`, `responded_at` | date | hết hạn theo `shared.request_expires_days` khi còn `pending` |

Index: `ix_addressee_status`, `ix_requester`, `uq_pair_directed` (unique `requester_id` + `addressee_id`).

**Thay đổi `users`:** thêm `friend_code` (string, unique, sparse) và `last_active` (date, nullable —
hiệu đính 21/11/2026, cập nhật theo request, throttling 60 giây). Migration `m0011` dùng `collMod` + `create_index`
theo đúng mẫu `m0005_user_custom_flag_colors.py` (sao chép validator cũ rồi thêm trường).

### 3.2 Ảnh trong sổ chung

Tái dùng `core/storage.py` (presigned PUT + xác nhận + link ký 1 giờ). Key theo mẫu hiện có nhưng dưới nhánh
riêng để dọn theo tiền tố vẫn đúng:

```
{user_id}/shared/{photo_id}.webp
{user_id}/shared/{photo_id}_thumb.webp
```

Tiền tố `{user_id}/` vẫn được `delete_prefix` của `services/account.py` xóa khi xóa tài khoản → không rò rỉ ảnh.
Người bạn đọc ảnh qua `storage.view_url()` — cùng cơ chế link ký, không có URL công khai.

### 3.3 Không dùng transaction (đúng ADR 0001)

Mọi thao tác nhiều collection chạy **theo thứ tự và chạy lại được**:

1. Chấp nhận yêu cầu → tạo `shared_journals` (`$setOnInsert` theo `member_key` để hai request cùng lúc chỉ tạo
   một sổ) → cập nhật `friendships.status` → trả về.
2. Nếu bước 3 hỏng, chạy lại vẫn ra cùng kết quả (`member_key` unique loại trùng).

## 4. API

Đặt tên theo quy ước dự án: `routers/`, `services/`, `schemas/` cùng tên; `services` nhận `user_id` làm tham số
đầu tiên.

### 4.1 Bạn bè

| Method | Đường dẫn | Viết | Rate limit |
| --- | --- | --- | --- |
| `GET` | `/friends` | danh sách bạn bè (tên, avatar, sổ chung, lần hoạt động, cờ mời mở sổ) | `read` |
| `GET` | `/friends/requests` | yêu cầu đến / đi | `read` |
| `POST` | `/friends/requests` | `{ code }` → gửi yêu cầu | `friend_request` (IP + user) |
| `POST` | `/friends/requests/{id}/accept` | chấp nhận → thành bạn (chưa có sổ) | `write` |
| `POST` | `/friends/requests/{id}/decline` | từ chối | `write` |
| `POST` | `/friends/{friend_id}/journal-invite` | mời mở sổ chung (hiệu đính 21/11/2026) | `journal_invite` (10/ngày) |
| `DELETE` | `/friends/{journal_id}` | kết thúc sổ chung (hủy luôn lời mời đang chờ) | `write` |
| `GET` | `/me/friend-code` | mã bạn của tôi | `me` |
| `POST` | `/me/friend-code/rotate` | xoay mã | `write` |

### 4.2 Sổ chung

| Method | Đường dẫn | Viết | Rate limit |
| --- | --- | --- | --- |
| `GET` | `/journals` | các sổ chung của tôi + trạng thái chuỗi + lần hoạt động của bạn | `read` |
| `GET` | `/journals/invites` | lời mời mở sổ đến / đi (hiệu đính 21/11/2026) | `read` |
| `POST` | `/journals/invites/{id}/accept` | chấp nhận → tạo sổ (chỉ người được mời) | `write` |
| `POST` | `/journals/invites/{id}/decline` | từ chối lời mời | `write` |
| `GET` | `/journals/{id}` | chi tiết: thành viên, chuỗi ấm, badge đồng bộ, mốc dài nhất | `read` |
| `GET` | `/journals/{id}/entries` | `?cursor=` — mục của cả hai, mới nhất trước | `read` |
| `PUT` | `/journals/{id}/entries/{date}` | viết mục của **tôi** cho ngày đó | `journal_write` |
| `DELETE` | `/journals/{id}/entries/{date}` | xóa mềm mục của tôi | `write` |
| `POST` | `/journals/{id}/photos/upload-url` | yêu cầu link tải ảnh | `photo_upload` |
| `POST` | `/journals/{id}/photos` | xác nhận ảnh | `photo_upload` |
| `PATCH` | `/journals/{id}/photos/order` | sắp xếp ảnh | `write` |
| `DELETE` | `/photos/{id}` | xóa ảnh (thuộc sổ chung nào cũng phải kiểm tra quyền) | `write` |

### 4.3 Quy tắc bắt buộc

- **Mọi endpoint `journal` kiểm tra `journal_id` có chứa `user_id` của phiên không**; không thuộc → **404**
  (không phải 403 — không rò rỉ sự tồn tại).
- **Mọi endpoint `entries`/`photos` lấy `author_id` từ phiên**, không lấy từ body. `journal_id` và `date` là
  tham số đường dẫn đã kiểm tra kiểu.
- `PUT` dùng mẫu xung đột lạc quan của `services/entries.py`: gửi `updated_at` đã biết; server mới hơn → **409
  `ENTRY_CONFLICT`**.
- Ngày tương lai → **422 `ENTRY_FUTURE_DATE`** theo múi giờ hồ sơ.
- `GET /journals/{id}/entries` chỉ trả `entry_date`, `score`, `title`, `content`, `photos` đã ký, `author` (tên +
  avatar), `created_at`, `updated_at` — **không** trả `author_id`, `storage_key`, `journal_id` nội bộ.
- Người xem chỉ thấy mục **của người khác** khi `journal.status == "active"`; khi `ended` chỉ thấy mục của chính
  mình.

## 5. Riêng tư, an toàn, vận hành

### 5.1 Ma trận ai thấy gì

| Dữ liệu | Chủ sở hữu | Bạn bè (sổ chung active) | Người khác | Đã kết thúc |
| --- | --- | --- | --- | --- |
| Nhật ký cá nhân (`entries`) | ✓ | ✗ | ✗ | ✗ |
| Mục chung của tôi | ✓ | ✓ (người đồng sổ) | ✗ | ✓ (chỉ mục của tôi) |
| Mục chung của họ | ✓ | ✓ | ✗ | ✗ |
| Ảnh trong sổ chung | ✓ | ✓ (qua link ký 1 giờ) | ✗ | ✗ |
| Mã bạn | ✓ | ✗ | ✗ | ✗ |

### 5.2 Xóa dữ liệu và xóa tài khoản

Phải bổ sung vào `services/account.py` (hiện xóa `entries`, `share_links`, `user_sessions`, `user_items`):

- Xóa tài khoản → xóa `shared_journals` mà tôi là thành viên, xóa `shared_entries` tôi viết, xóa `friendships` liên
  quan, xóa ảnh dưới `{user_id}/shared/` (nền, qua `delete_prefix` sẵn có).
- Xóa nhật ký / xóa dữ liệu → **giữ** sổ chung và mục chung (không phải dữ liệu nhật ký cá nhân) — nhưng phải nói
  rõ trong hộp thoại xác nhận, và cân nhắc cho người dùng chọn "kèm sổ chung".
- `deletion_log` (`additionalProperties: false`) thêm loại `"social"` — chỉ loại, thời điểm, số lượng, **không** có
  `user_id`/email/nội dung.

### 5.3 Nội dung không vào log

Mọi quy tắc của `CLAUDE.md` giữ nguyên: **không ghi tiêu đề, nội dung, từ khóa, ảnh nhật ký vào log hay Sentry**.
Bổ sung: **mã bạn không vào log** (nó là định danh người dùng). Log chỉ ghi mã người dùng nội bộ, phương thức,
đường dẫn, mã trạng thái, thời gian.

### 5.4 Riêng tư và pháp lý (bắt buộc trước khi mở rộng)

- `apps/web/src/features/legal/PrivacyPolicy.tsx` mục **"Ai xem được nhật ký"** phải viết lại: không còn chỉ "Chỉ
  bạn" — thêm "người bạn đã kết bạn, chỉ phần bạn gửi vào sổ chung, và không thấy nhật ký cá nhân của bạn".
- Danh sách nhà cung cấp và chuyển dữ liệu ra nước ngoài: không đổi (vẫn Atlas Singapore / B2 Canada), nhưng phải
  cập nhật ngày cập nhật chính sách.
- `Project_Specs.md` mục 4.1 hàng "Pháp lý": rà soát chuyển dữ liệu xuyên biên giờ **chạm** vào tính năng này →
  phải rà soát **trước khi mở rộng** ra ngoài nhóm beta.
- Đăng ký lại dữ liệu người dùng với cơ quan chức năng không thuộc nhu cầu ghi nhật ký và không bị công khai →
  không phát sinh nghĩa vụ ghi nhật; dữ liệu sẵn có **không được** dùng để xác định danh tính.

### 5.5 An toàn cho người dùng 16 tuổi và nhóm (M3)

M3 có người ngoài và trẻ vị thành niên → cần thêm: chặn tìm kiếm theo email (đã chọn mã bạn), báo cáo nội dung,
chặn người dùng, giới hạn số bạn bè, và chính sách điều phối. **M3 không nằm trong kế hoạch này.**

## 6. Hạn mức và rate limit

Mọi giá trị nằm trong `shared/limits.json`, không viết cứng. Nhóm mới:

| Nhóm | Phạm vi | Giá trị đề xuất | Ghi chú |
| --- | --- | --- | --- |
| `friend_request` | gửi yêu cầu kết bạn | `10/day` (user) + `20/hour` (IP) | chặn dò mã |
| `journal_write` | ghi mục chung | `40/day` (user) | cao hơn vì 1 mục/ngày/người/sổ + sửa lại |
| `journal_read` | đọc sổ chung | `60/minute` (user) | tách khỏi `read` để không cạn trần chung |

Số bạn bè / sổ chung theo cấp tài khoản — xem bảng ở mục 6.

Giới hạn nội dung (mới, trong `shared/limits.json` → `tiers.*.shared`):

```json
"shared": {
  "title_max": 60,
  "content_max": 500,
  "photos_per_entry_max": 2,
  "request_expires_days": 30
}
```

Giới hạn số quan hệ theo cấp tài khoản (`tiers.*.shared`, chốt 12/11/2026):

| Cấp | Bạn bè (`friends_max`) | Sổ chung (`journals_max`) |
| --- | --- | --- |
| `beta` / `free` | **20** | **10** |
| `premium` | **100** | **50** (chờ chốt cùng gói premium, `Roadmap.md` §3.3) |

Vượt trần: chặn với thông báo rõ + lối vào gói premium; **không bao giờ chặn việc ghi chữ** vào sổ đã có
(`Roadmap.md` §3.3).

Ảnh trong sổ chung **tính vào hạn mức 500 MB** của tài khoản. Nhưng **chữ luôn được ghi miễn phí** (nguyên tắc
`Roadmap.md` mục 3.3: "không bao giờ chặn việc lưu chữ và biểu tượng") → nếu hết hạn mức ảnh thì vẫn ghi được mục
chỉ có chữ.

## 7. Giao diện

Ngôn ngữ giao diện giữ nguyên Jotly 1.1 (Neo Brutalism, Commissioner, viền mực 1,5px, bóng cứng). Sổ chung dùng
lại `components/diary/NotebookPage.tsx` — mỗi mục có dòng kẻ vở và tên người viết ở góc.

- **Thanh điều hướng**: thêm mục **"Bạn bè"** — hiện mỗi bạn là một thẻ (giống Locket): avatar, tên, số ngày
  chuỗi, và dấu chấm nhỏ khi hôm nay đã có mục của họ.
- **Màn "Bạn bè"** (`/friends`): danh sách thẻ + sổ chung + hàng yêu cầu đến/đi + mã bạn của tôi (nút xoay mã).
- **Màn sổ chung** (`/journals/{id}`): hai cột (mục của tôi / mục của họ) trên máy tính, một cột xếp dọc trên
  điện thoại; đầu màn là chuỗi ấm + badge đồng bộ; dưới cùng là ô viết mục hôm nay.
- **Trạng thái rỗng** phải nói rõ sẽ có gì và làm sao thêm.
- **i18n (ADR 0006)**: mọi chuỗi mới phải có **cả `vi` và `en`**, thiếu khóa là lỗi biên dịch. Chữ tiếng Anh dài
  hơn → kiểm tra tràn ở 360 px.
- **Không dùng emoji làm dấu mốc** (quy tắc của dự án) — badge chuỗi cần một hình vẽ riêng trong
  `components/diary/`, sẽ bàn khi làm.

## 8. Lộ trình

Mỗi giai đoạn là một PR, người dùng duyệt rồi mới làm giai đoạn sau (nhịp của `MVP_Plan.md`).

### Giai đoạn 0 — Quyết định và giấy tờ (chưa viết code) · **xong 12/11/2026**

| Việc | File | Trạng thái |
| --- | --- | --- |
| ADR mới thay thế phần "không có nhật ký chung" của ADR 0005 | `docs/adr/0007-shared-journal.md` | ✅ đã viết |
| Ghi `Thay thế bởi: 0007` vào ADR 0005 (theo quy tắc trong `adr/README.md`, **không** sửa nội dung quyết định cũ) | `docs/adr/0005-share-in-mvp.md` | ✅ đã đánh dấu |
| Sửa `Project_Specs.md`: §2.2; thêm F-11; §3.0 màn; §4.1; §5.4; §5.5 | `docs/Project_Specs.md` | ✅ đã sửa |
| Sửa `Roadmap.md`: §1.2; §2.2; §2.3; §3.2; §6 | `docs/Roadmap.md` | ✅ đã sửa |
| Cập nhật mục "Ngoài phạm vi MVP" + Backlog | `docs/MVP_Plan.md`, `docs/Backlog.md` | ✅ đã sửa |
| Bảng index ADR + dòng lịch sử thư mục | `docs/adr/README.md`, `docs/Project_Structure.md` | ✅ đã sửa |

### Giai đoạn 1 — Bạn bè (backend rồi frontend)

1. **Migration `m0010`**: `shared_journals`, `shared_entries`, `friendships`; thêm `users.friend_code` + index unique
   sparse. Theo đúng mẫu `m0005`/`m0006` (copy validator cũ rồi `collMod`).
2. **`routers|schemas|services/friendships.py`**: mã bạn, gửi/nhận/chặn yêu cầu, kết thúc sổ chung.
3. **`routers|schemas|services/shared_journals.py`**: đọc/ghi mục chung, chuỗi ấm, badge đồng bộ, xác nhận ảnh.
4. **Tái dùng logic chuỗi**: rút `longest_run` / `is_backfilled` ra chỗ dùng chung (hiện nằm trong
   `services/calendar.py`) — hoặc gọi lại từ đó, **không** copy.
5. **Test backend**: truy cập chéo (A không đọc được sổ của B, không đọc được mục của người thứ ba), 404 cho tài
   khoản khác, CSRF, rate limit, xung đột 409, ngày tương lai 422, xóa tài khoản dọn sạch, `deletion_log` không có
   dữ liệu cá nhân, mã bạn không vào log.
6. **Web**: `features/friends/` (danh sách bạn, yêu cầu, mã bạn), `features/journals/` (màn sổ chung, ô viết mục).
   Theo quy ước feature phẳng của `Project_Structure.md`.
7. **i18n**: thêm nhóm `friends` và `journal` vào cả `vi` và `en`.
8. **Chạy `npm run gen:api`** và commit `openapi.json` + `schema.d.ts`.
9. **Cập nhật `/privacy`** (mục "Ai xem được nhật ký").
10. **Cập nhật `docs/Project_Structure.md`**: cây + một dòng ở "Lịch sử thay đổi".

### Giai đoạn 2 — Chế độ luân phiên + chuỗi nâng cao

- `mode: "alternating"` — tính năng **opt-in** (hiệu đính 21/11/2026): một người mỗi ngày, đổi lượt theo
  chẵn/lẻ tính stateless từ `created_at` (ngày 0 = `members[0]`, không thêm trường DB). Ai cũng đổi
  chế độ được; chỉ sổ đang hoạt động đổi được; sai lượt → `422 TURN_NOT_YOURS` (chỉ chặn tạo mục mới,
  sửa/xóa mục cũ của mình vẫn được).
- **Xong 21/11/2026:** endpoint `POST /journals/{journal_id}/mode`, field `my_turn` trên `JournalOut`,
  guard trong `save_entry`, toggle "Cùng viết / Luân phiên" + banner lượt trong UI, mốc 30/100 ngày
  (badge theo `warm_streak`, phía frontend).

### Giai đoạn 3 — Nhóm / tổ chức

- `scope: "group"`, thêm `groups` + `group_members` (vai trò), `shared_entries` nhận `group_id`.
- An toàn: báo cáo nội dung, chặn người dùng, giới hạn thành viên, điều phối.
- Cần ADR riêng (`0008`) vì có bổ sung vai trò và chính sách.

## 9. Ngoài phạm vi

- **Feed công khai, khám phá, theo dõi người lạ, bình luận, thả cảm xúc** — không làm.
- **Nhật ký chung 1:1 với người chưa kết bạn** — không; phải qua bước chấp nhận.
- **Video, giọng nói, sticker, vòng tròn (circle) kiểu Instagram** — không.
- **Đồng bộ nhật ký cá nhân hai chiều giữa hai người** — không; chỉ mục chung trong sổ chung.
- **Sổ chung với nhóm > 2 người ở giai đoạn 1** — để giai đoạn 3.
- **Kiếm tiền từ tính năng này** — để giai đoạn kiếm tiền (Roadmap §3.3): chỉ thu tiền cho phần *mới*, không thu tiền
  lại phần đã có. **Trần số bạn / số sổ chung là điểm kiếm tiền đầu tiên**: `beta`/`free` có 20 bạn / 10 sổ chung,
  `premium` nhiều hơn — đã chốt 12/11/2026.

## 10. Việc đã chốt (12/11/2026)

Các quyết định dưới đây đã được người dùng chốt và là căn cứ cho Giai đoạn 0.

| # | Câu hỏi | Quyết định |
| --- | --- | --- |
| 1 | Khi kết thúc sổ chung, người kia có thấy mục cũ của tôi không? | **Không.** Mỗi người giữ mục của mình; không xóa gì. |
| 2 | Có cho phép ghi nhiều mục trong một ngày không? | **Không** — 1 mục/người/ngày, giống hạt nhật ký `entries` và giống Locket. |
| 3 | Chuỗi tính theo múi giờ người xem hay theo múi giờ cặp? | **Theo người xem** (đồng nhất với mọi mốc thời gian khác); chênh 1 ngày khi hai bên ở múi khác nhau. |
| 4 | Mỗi tài khoản tối đa bao nhiêu bạn bè / sổ chung? | **`beta`/`free`: 20 bạn, 10 sổ chung. `premium`: nhiều hơn** (chốt cùng gói premium, `Roadmap.md` §3.3 — đề xuất 100 bạn / 50 sổ). |
| 5 | Sổ chung có bắt buộc điểm tâm trạng (score) không? | **Có** — giữ đúng "một chạm" là đơn vị ghi chép chính. |
| 6 | Có cần chế độ "ẩn" (không ai thấy mục của tôi trong sổ chung) không? | **Không ở giai đoạn 1**; thêm sau nếu người dùng thấy áp lực. |
| 7 | Có mở cho nhóm ở giai đoạn 1 không? | **Không** — 1:1 trước, nhóm để giai đoạn 3. |

Quyết định đã chốt khác (12/11/2026):

| # | Nội dung | Quyết định |
| --- | --- | --- |
| A | Trình tự các chế độ | **M1 trước, từng bước** (nghiệm thu rồi mới lên M2, M3) |
| B | Định nghĩa chuỗi | **Chuỗi ấm + badge đồng bộ** |
| C | Mô hình M1 | **Sổ chung** (không phải thẻ qua lại không đối xứng kiểu Locket) |
| D | Nhóm / tổ chức | **Để giai đoạn sau**, không gộp vào giai đoạn 1 |
