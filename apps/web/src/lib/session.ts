import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

// Đăng xuất và đăng nhập thử: dùng ở cả trang đăng nhập (features/auth) lẫn Hồ sơ (features/profile).
import { API_URL, csrfToken, toApiError, api } from '@/api/client'
import { ME_KEY, type Me } from './profile'
import { clearDraftsFor } from './storage'

/**
 * Trạng thái điều hướng sau khi đăng xuất / xóa tài khoản: `navigate('/', { state: SIGNED_OUT })`. Trang chủ thấy cờ này
 * thì gọi `forgetSignedInUser` (routes/HomePage.tsx).
 *
 * Vì sao không bỏ dữ liệu ngay tại nút bấm: React Router chuyển trang trong một transition, cây cũ (vd. Hồ sơ, nằm trong
 * RequireAuth) còn hiển thị thêm một nhịp; nếu /me trả 401 đúng lúc đó, RequireAuth đưa sang /login thay vì trang chủ.
 */
export const SIGNED_OUT = { signedOut: true } as const

export function isSignedOutState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { signedOut?: unknown }).signedOut === true
}

/**
 * Bỏ mọi dữ liệu của người vừa đăng xuất / xóa tài khoản khỏi bộ nhớ trình duyệt.
 * Không dùng `client.clear()`: nó gỡ query khỏi cache nhưng KHÔNG báo cho màn đang mở, nên trang chủ (đăng xuất ngay
 * tại "/", không gắn lại màn) vẫn hiện tên và ảnh người cũ. `resetQueries` trên /me đưa hồ sơ về rỗng và báo cho màn
 * đang mở: /me tải lại → 401 → trang chủ đổi sang bản chưa đăng nhập.
 */
export function forgetSignedInUser(client: QueryClient) {
  client.getMutationCache().clear()
  // Dữ liệu nhật ký: gỡ hẳn (không tải lại, tránh một loạt 401 vô ích); các màn đọc chúng sẽ rời đi theo /me.
  client.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] })
  void client.resetQueries({ queryKey: ME_KEY })
}

/**
 * POST /auth/logout: xóa phiên phía máy chủ và nháp trong trình duyệt. Người gọi chuyển về trang chủ kèm `SIGNED_OUT`
 * để trang chủ bỏ nốt dữ liệu trong bộ nhớ (người sau dùng chung máy không thấy gì của người cũ).
 */
export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const email = client.getQueryData<Me>(ME_KEY)?.email
      try {
        const { error, response } = await api.POST('/auth/logout')
        if (error && response.status !== 401) throw toApiError(response, error)
      } finally {
        await clearDraftsFor(email)
      }
    },
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
