import createClient from 'openapi-fetch'
import type { paths } from './schema'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** Client gọi API, kiểu dữ liệu sinh từ OpenAPI (`npm run gen:api`). Luôn gửi cookie phiên. */
export const api = createClient<paths>({
  baseUrl: API_URL,
  credentials: 'include',
  // Gọi globalThis.fetch lúc request (không giữ tham chiếu lúc tạo client) để test mock được.
  fetch: (...args) => globalThis.fetch(...args),
})

/** Dạng lỗi thống nhất của backend: {"error": {"code", "message"}}. */
export type ApiErrorBody = { error: { code: string; message: string } }
