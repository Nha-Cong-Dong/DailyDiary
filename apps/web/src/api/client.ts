import createClient from 'openapi-fetch'
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
  fetch: (...args) => globalThis.fetch(...args),
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

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function toApiError(response: Response, body: unknown): ApiError {
  const err = (body as Partial<ApiErrorBody> | undefined)?.error
  return new ApiError(response.status, err?.code ?? 'HTTP_ERROR', err?.message ?? 'Có lỗi xảy ra, vui lòng thử lại')
}

/**
 * Đường dẫn bắt đầu đăng nhập Google: mở trực tiếp (không fetch) để cookie dd_oauth đi trọn vòng.
 * `next`: quay về trang này sau khi đăng nhập (backend chỉ nhận "/profile": đăng nhập lại để xác nhận xóa tài khoản).
 */
export function googleLoginUrl(timeZone: string, next?: '/profile'): string {
  return `${API_URL}/auth/google/login?${new URLSearchParams({ tz: timeZone, ...(next ? { next } : {}) })}`
}
