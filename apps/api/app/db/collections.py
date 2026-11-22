"""Tên collection. Dùng hằng số này thay vì gõ chuỗi để tránh sai chính tả."""

USERS = "users"
USER_SESSIONS = "user_sessions"
ENTRIES = "entries"  # keywords và photos nhúng trong từng entry
USER_ITEMS = "user_items"
FEEDBACK = "feedback"
SHARE_LINKS = "share_links"  # link chia sẻ công khai một ngày nhật ký
DELETION_LOG = "deletion_log"  # mỗi lần xóa: loại, thời điểm, số lượng — không có dữ liệu cá nhân
MIGRATIONS = "_migrations"
# ADR 0007 (Giai đoạn 1): sổ chung và bạn bè
SHARED_JOURNALS = "shared_journals"  # một cuốn sổ cho mỗi cặp
SHARED_ENTRIES = "shared_entries"  # một mục = một người, một ngày, trong một cuốn sổ
FRIENDSHIPS = "friendships"  # yêu cầu kết bạn → chấp nhận (thành bạn)
JOURNAL_REQUESTS = "journal_requests"  # lời mời mở sổ chung giữa hai người bạn (ADR 0007)
# GĐ2 giữ chân: thư gửi tương lai — nội dung chỉ mở ra được từ `reveal_date`, tối đa 1 thư/1 ngày ghi.
LETTERS = "letters"

ALL = (
    USERS,
    USER_SESSIONS,
    ENTRIES,
    USER_ITEMS,
    FEEDBACK,
    SHARE_LINKS,
    DELETION_LOG,
    SHARED_JOURNALS,
    SHARED_ENTRIES,
    FRIENDSHIPS,
    JOURNAL_REQUESTS,
    LETTERS,
)
