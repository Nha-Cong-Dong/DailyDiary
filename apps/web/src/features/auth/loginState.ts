import { t } from '@/lib/i18n'
import { vi } from '@/locales/vi'

/** State gửi kèm khi chuyển sang /login (RequireAuth → Login). */
export type LoginState = {
  /** Trang đang mở trước khi bị chuyển. */
  from?: string
  /** Có khi phiên vừa hết hạn: hiện lại tên và email để người dùng biết đăng nhập lại tài khoản nào. */
  expired?: { name: string; email: string; avatarUrl: string | null }
}

const { unknown, ...known } = vi.auth.loginErrors

/** Lỗi backend gửi về qua ?error= sau khi Google chuyển hướng (apps/api/app/routers/auth.py): mã → câu tiếng Việt. */
export const LOGIN_ERRORS: Record<string, string> = known

export const UNKNOWN_LOGIN_ERROR = unknown

/** Câu lỗi đăng nhập theo ngôn ngữ đang dùng. */
export function loginErrorMessage(code: string): string {
  return code in LOGIN_ERRORS ? t(`auth:loginErrors.${code as keyof typeof known}`) : t('auth:loginErrors.unknown')
}
