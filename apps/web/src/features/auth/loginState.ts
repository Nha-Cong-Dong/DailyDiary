/** State gửi kèm khi chuyển sang /login (RequireAuth → Login). */
export type LoginState = {
  /** Trang đang mở trước khi bị chuyển. */
  from?: string
  /** Có khi phiên vừa hết hạn: hiện lại tên và email để người dùng biết đăng nhập lại tài khoản nào. */
  expired?: { name: string; email: string; avatarUrl: string | null }
}

/** Lỗi backend gửi về qua ?error= sau khi Google chuyển hướng (apps/api/app/routers/auth.py). */
export const LOGIN_ERRORS: Record<string, string> = {
  oauth: 'Google chưa hoàn tất đăng nhập: có thể bạn đã bấm Hủy ở trang Google, hoặc trang bị đóng giữa chừng.',
  email_unverified: 'Email Google này chưa được xác minh, nên chưa đăng nhập được. Xác minh email với Google rồi thử lại.',
  account_deleted: 'Tài khoản này đang chờ xóa nên không đăng nhập lại được.',
  not_configured: 'Máy chủ chưa cấu hình đăng nhập Google. Báo cho người quản trị Jotly nhé.',
}

export const UNKNOWN_LOGIN_ERROR = 'Đăng nhập chưa thành công vì một lỗi không rõ.'

export function loginErrorMessage(code: string): string {
  return LOGIN_ERRORS[code] ?? UNKNOWN_LOGIN_ERROR
}
