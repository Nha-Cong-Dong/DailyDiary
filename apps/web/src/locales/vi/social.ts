export default {
  title: 'Bạn bè & sổ chung',
  intro: 'Viết cùng nhau, giữ những ngày ấm áp bên nhau.',
  friendCode: { title: 'Mã bạn của bạn', copy: 'Sao chép mã', copied: 'Đã sao chép', rotate: 'Đổi mã', confirmTitle: 'Đổi mã bạn?', confirmBody: 'Mã cũ sẽ ngừng hoạt động ngay lập tức.', cancel: 'Để sau', confirm: 'Đổi mã' },
  send: { title: 'Thêm bạn', placeholder: 'Nhập mã bạn của họ', submit: 'Gửi lời mời', sent: 'Đã gửi lời mời', limit: 'Bạn đã đạt giới hạn bạn bè.', invalid: 'Không tìm thấy mã bạn này.' },
  requests: { title: 'Lời mời kết bạn', incoming: 'Đến', outgoing: 'Đã gửi', accept: 'Chấp nhận', decline: 'Từ chối', pending: 'Đang chờ', empty: 'Chưa có lời mời nào.' },
  friends: { title: 'Bạn bè', count: '{{count}}/{{max}} bạn', empty: 'Danh sách bạn còn trống.', invite: 'Mời một người bạn bằng mã ở trên', journal: 'Mở sổ chung', noJournal: 'Chưa có sổ chung' },
  journals: { title: 'Sổ chung', count: '{{count}}/{{max}} sổ', empty: 'Chưa có sổ chung.', open: 'Mở sổ', active: 'Đang mở', ended: 'Đã kết thúc', warm: 'Chuỗi ấm', synced: 'Ngày đồng bộ', longest: 'Dài nhất' },
  detail: { back: 'Tất cả sổ chung', members: 'Thành viên', write: 'Viết mục hôm nay', score: 'Điểm hôm nay', title: 'Tiêu đề', content: 'Bạn muốn ghi gì?', save: 'Lưu mục', saved: 'Đã lưu', mine: 'Bạn', feed: 'Những ngày đã viết', empty: 'Chưa có mục nào trong sổ này.', ended: 'Sổ đã kết thúc · chỉ xem', loadMore: 'Xem thêm' },
  photos: { title: 'Ảnh trong ngày', add: 'Thêm ảnh', uploading: 'Đang tải ảnh…', limit: 'Tối đa {{count}} ảnh mỗi mục', remove: 'Xóa ảnh', failed: 'Tải ảnh chưa thành công.' },
  states: { loading: 'Đang mở sổ chung…', error: 'Chưa tải được dữ liệu Social.', retry: 'Thử lại', emptyTitle: 'Bắt đầu viết cùng nhau', emptyBody: 'Gửi mã bạn cho một người bạn để mở cuốn sổ đầu tiên.' },
} as const
