"""Tên collection. Dùng hằng số này thay vì gõ chuỗi để tránh sai chính tả."""

USERS = "users"
USER_SESSIONS = "user_sessions"
ENTRIES = "entries"  # keywords và photos nhúng trong từng entry
USER_ITEMS = "user_items"
FEEDBACK = "feedback"
SHARE_LINKS = "share_links"  # link chia sẻ công khai một ngày nhật ký
DELETION_LOG = "deletion_log"  # mỗi lần xóa: loại, thời điểm, số lượng — không có dữ liệu cá nhân
MIGRATIONS = "_migrations"

ALL = (USERS, USER_SESSIONS, ENTRIES, USER_ITEMS, FEEDBACK, SHARE_LINKS, DELETION_LOG)
