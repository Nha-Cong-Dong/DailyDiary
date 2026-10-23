import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { DateString } from '@/lib/date'
import type { PublicShare, ShareLink, ShareListItem, ShareSettings } from './shares'

/**
 * Chia sẻ (thiết kế B8, F-10) qua API: GET/PUT/DELETE /entries/{day}/share, GET /shares, GET /public/shares/{token}.
 */
export const SHARES_KEY = ['shares'] as const

/** Link đang bật của một ngày, null khi chưa chia sẻ. */
export function useShare(date: DateString) {
  return useQuery({
    queryKey: ['shares', date],
    queryFn: async (): Promise<ShareLink | null> => {
      const { data, error, response } = await api.GET('/entries/{day}/share', { params: { path: { day: date } } })
      if (error) throw toApiError(response, error)
      return data ?? null
    },
  })
}

/** Mọi trang đang chia sẻ, mới nhất trước. `enabled` = false khi chưa đăng nhập (trang chủ). */
export function useShares(enabled = true) {
  return useQuery({
    queryKey: SHARES_KEY,
    enabled,
    queryFn: async (): Promise<ShareListItem[]> => {
      const { data, error, response } = await api.GET('/shares')
      if (error || !data) throw toApiError(response, error)
      return data
    },
  })
}

/** Số trang đang mở link (Hồ sơ, menu tài khoản). */
export function useShareCount(enabled = true): number {
  return useShares(enabled).data?.length ?? 0
}

/** Bật link hoặc đổi phần chia sẻ; lưu ngay mỗi lần đổi. */
export function useSaveShare(date: DateString) {
  const client = useQueryClient()
  return useMutation({
    // Đổi phần rồi tắt link ngay: hai lệnh chạy đúng thứ tự, bản lưu đến muộn không bật lại link trên màn.
    scope: { id: `share:${date}` },
    mutationFn: async (settings: ShareSettings): Promise<ShareLink> => {
      const { data, error, response } = await api.PUT('/entries/{day}/share', {
        params: { path: { day: date } },
        body: settings,
      })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: (link) => {
      client.setQueryData(['shares', date], link)
      void client.invalidateQueries({ queryKey: SHARES_KEY, exact: true })
    },
  })
}

/** Tắt link của một ngày. `date` (nếu biết) xếp lệnh tắt sau các lần lưu đang chờ của ngày đó. */
export function useRevokeShare(date?: DateString) {
  const client = useQueryClient()
  return useMutation({
    scope: date ? { id: `share:${date}` } : undefined,
    mutationFn: async (date: DateString) => {
      const { error, response } = await api.DELETE('/entries/{day}/share', { params: { path: { day: date } } })
      if (error) throw toApiError(response, error)
    },
    onSuccess: (_, date) => {
      client.setQueryData(['shares', date], null)
      void client.invalidateQueries({ queryKey: SHARES_KEY, exact: true })
    },
  })
}

/**
 * Sau khi Hồ sơ xóa toàn bộ dữ liệu / xóa tài khoản: đọc lại danh sách link.
 * Backend xóa `share_links` cùng lúc với dữ liệu ở Bước 12; tới lúc đó Hồ sơ vẫn là bản thử.
 */
export function useClearShares(): () => void {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: SHARES_KEY })
  }
}

/** Trang người nhận xem; null khi link không mở được (mọi lý do đều là 404). Không thử lại khi lỗi. */
export function usePublicShare(token: string) {
  return useQuery({
    queryKey: ['public-share', token],
    retry: false,
    queryFn: async (): Promise<PublicShare | null> => {
      const { data, error, response } = await api.GET('/public/shares/{token}', { params: { path: { token } } })
      if (response.status === 404) return null
      if (error || !data) throw toApiError(response, error)
      return data
    },
  })
}
