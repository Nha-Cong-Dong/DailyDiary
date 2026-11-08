// Bản dịch tiếng Việt, nhóm "auth" (nguồn chuẩn: khóa ở đây quyết định khóa của mọi ngôn ngữ khác).
export default {
  login: {
    homeAria: 'Jotly, trang chủ',
    idle: {
      title: 'Đăng nhập vào Jotly',
      text: 'Dùng tài khoản Gmail, không cần nhớ thêm mật khẩu nào.',
      button: 'Tiếp tục với Google',
    },
    waking: {
      title: 'Đang đánh thức máy chủ…',
      text: 'Máy chủ nghỉ khi vắng người nên lần đầu có thể mất tới một phút. Bạn không cần bấm lại.',
    },
    redirecting: { title: 'Đang đăng nhập', text: 'Đang chuyển sang trang đăng nhập của Google.' },
    error: { title: 'Chưa đăng nhập được', button: 'Thử lại với Google' },
    expired: {
      title: 'Phiên đăng nhập đã hết hạn',
      text: 'Đăng nhập lại để tiếp tục. Những gì bạn đang viết vẫn được giữ trên trình duyệt này.',
      button: 'Đăng nhập lại với Google',
    },
    waitingServer: 'Đang chờ máy chủ…',
    waitingGoogle: 'Đang chờ Google…',
    cancel: 'Hủy',
    termsPrefix: 'Khi tiếp tục, bạn đồng ý với',
    terms: '[Điều khoản sử dụng]',
    and: 'và',
    privacy: 'Chính sách quyền riêng tư',
    devLogin: 'Đăng nhập thử (chỉ khi chạy dev)',
    devLoginFailed: 'Chưa đăng nhập thử được. Bật DEV_LOGIN=true trong apps/api/.env rồi chạy lại API.',
  },
  loginErrors: {
    oauth: 'Google chưa hoàn tất đăng nhập: có thể bạn đã bấm Hủy ở trang Google, hoặc trang bị đóng giữa chừng.',
    email_unverified:
      'Email Google này chưa được xác minh, nên chưa đăng nhập được. Xác minh email với Google rồi thử lại.',
    account_deleted: 'Tài khoản này đang chờ xóa nên không đăng nhập lại được.',
    not_configured: 'Máy chủ chưa cấu hình đăng nhập Google. Báo cho người quản trị Jotly nhé.',
    unknown: 'Đăng nhập chưa thành công vì một lỗi không rõ.',
  },
} as const
