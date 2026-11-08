import i18next from 'i18next'
import createClient from 'openapi-fetch'
import { currentLang, t } from '@/lib/i18n'
import { trackedFetch } from '@/lib/serverWake'
import type { paths } from './schema'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Token CSRF do backend đặt trong cookie `dd_csrf` (không HttpOnly); gửi lại qua header cho request ghi. */
export function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)dd_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** Client gọi API, kiểu dữ liệu sinh từ OpenAPI (`npm run gen:api`). Luôn gửi cookie phiên. */
export const api = createClient<paths>({
  baseUrl: API_URL,
  credentials: 'include',
  // Gọi globalThis.fetch lúc request (không giữ tham chiếu lúc tạo client) để test mock được.
  // trackedFetch theo dõi request chậm để báo "Đang đánh thức máy chủ…".
  fetch: (...args) => trackedFetch(() => globalThis.fetch(...args)),
})

api.use({
  onRequest({ request }) {
    if (!SAFE_METHODS.has(request.method)) {
      const token = csrfToken()
      if (token) request.headers.set('X-CSRF-Token', token)
    }
    return request
  },
})

/** Dạng lỗi thống nhất của backend: {"error": {"code", "message"}}. */
export type ApiErrorBody = { error: { code: string; message: string } }

/** Lỗi từ API kèm mã HTTP, để nơi gọi phân biệt 401 (chưa đăng nhập) với lỗi khác. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  /** `message` null: máy chủ không gửi thông báo, dùng câu chung theo ngôn ngữ đang dùng. */
  constructor(status: number, code: string, message: string | null) {
    super(message ?? '')
    this.status = status
    this.code = code
    // `message` tính lúc đọc để đổi ngôn ngữ giao diện thì mọi chỗ hiện `err.message` đổi theo.
    Object.defineProperty(this, 'message', { get: () => localizedMessage(code, message), configurable: true })
  }
}

/**
 * Thông báo lỗi theo ngôn ngữ đang dùng. Tiếng Việt: giữ nguyên thông báo của máy chủ (vốn đã tiếng Việt, có mã dùng
 * chung cho nhiều câu). Ngôn ngữ khác: dịch theo mã (`errors:api.<mã>`); mã chưa có bản dịch thì dùng thông báo gốc.
 * Số trong thông báo gốc (giới hạn) được lấy lại để điền vào bản dịch.
 */
function localizedMessage(code: string, original: string | null): string {
  if (original === null) return t('errors:generic')
  if (currentLang() === 'vi') return original
  const key = `errors:api.${code}`
  if (!i18next.exists(key)) return original
  const [first, second] = original.match(/\d+/g) ?? []
  return t(key as 'errors:generic', { n: first, min: first, max: second })
}

export function toApiError(response: Response, body: unknown): ApiError {
  const err = (body as Partial<ApiErrorBody> | undefined)?.error
  return new ApiError(response.status, err?.code ?? 'HTTP_ERROR', err?.message ?? null)
}

/**
 * Đường dẫn bắt đầu đăng nhập Google: mở trực tiếp (không fetch) để cookie dd_oauth đi trọn vòng.
 * `next`: quay về trang này sau khi đăng nhập (backend chỉ nhận "/profile": đăng nhập lại để xác nhận xóa tài khoản).
 */
export function googleLoginUrl(timeZone: string, next?: '/profile'): string {
  return `${API_URL}/auth/google/login?${new URLSearchParams({ tz: timeZone, ...(next ? { next } : {}) })}`
}
