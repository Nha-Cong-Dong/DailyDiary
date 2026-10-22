import { useMutation, useQueryClient } from '@tanstack/react-query'

// Đăng xuất và đăng nhập thử: dùng ở cả trang đăng nhập (features/auth) lẫn Hồ sơ (features/profile).
import { API_URL, csrfToken, toApiError, api } from '@/api/client'
import { ME_KEY, type Me } from './profile'

/** POST /auth/logout: xóa phiên phía máy chủ, rồi xóa toàn bộ cache (dữ liệu của người vừa đăng xuất). */
export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.POST('/auth/logout')
      if (error && response.status !== 401) throw toApiError(response, error)
    },
    onSettled: () => client.clear(),
  })
}

export type DevLoginResult = { next: string; me: Me }

/**
 * Đăng nhập thử không cần Google (chỉ khi chạy dev và backend bật DEV_LOGIN; route không có trong OpenAPI
 * nên gọi bằng fetch thường).
 */
export function useDevLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (email: string): Promise<DevLoginResult> => {
      const token = csrfToken()
      const response = await globalThis.fetch(`${API_URL}/auth/dev-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-CSRF-Token': token } : {}) },
        body: JSON.stringify({ email }),
      })
      const body = await response.json().catch(() => undefined)
      if (!response.ok) throw toApiError(response, body)
      return body as DevLoginResult
    },
    onSuccess: ({ me }) => client.setQueryData(ME_KEY, me),
  })
}
