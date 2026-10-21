import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { clearDemoShares, demoGetShare, demoListShares, demoPublicShare, demoRevokeShare, demoSaveShare } from './demoShares'
import type { ShareSettings } from './shares'

/**
 * Chia sẻ (thiết kế B8). Chưa có API nên đọc/ghi dữ liệu mẫu; nối API chỉ cần đổi queryFn/mutationFn:
 * GET/PUT/DELETE /entries/{date}/share, GET /shares, GET /public/shares/{token}.
 */
export const SHARES_KEY = ['shares'] as const

/** Link đang bật của một ngày, null khi chưa chia sẻ. */
export function useShare(date: DateString) {
  return useQuery({ queryKey: ['shares', date], queryFn: async () => demoGetShare(date) })
}

/** Mọi trang đang chia sẻ, mới nhất trước. */
export function useShares() {
  return useQuery({ queryKey: SHARES_KEY, queryFn: async () => demoListShares() })
}

/** Số trang đang mở link (Hồ sơ dùng để nhắc trong hộp thoại xóa tài khoản). */
export function useShareCount(): number {
  return useShares().data?.length ?? 0
}

/** Bật link hoặc đổi phần chia sẻ; lưu ngay mỗi lần đổi. */
export function useSaveShare(date: DateString) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (settings: ShareSettings) => demoSaveShare(date, settings),
    onSuccess: (link) => {
      client.setQueryData(['shares', date], link)
      client.invalidateQueries({ queryKey: SHARES_KEY, exact: true })
    },
  })
}

/** Tắt link của một ngày. */
export function useRevokeShare() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (date: DateString) => demoRevokeShare(date),
    onSuccess: (_, date) => {
      client.setQueryData(['shares', date], null)
      client.invalidateQueries({ queryKey: SHARES_KEY, exact: true })
    },
  })
}

/**
 * Tắt mọi link (Hồ sơ: xóa toàn bộ dữ liệu / xóa tài khoản). Bản thử trên dữ liệu mẫu; backend xóa `share_links`
 * cùng lúc với dữ liệu (Bước 12). Trả về hàm gọi đồng bộ để Hồ sơ gọi ngay khi xóa xong.
 */
export function useClearShares(): () => void {
  const client = useQueryClient()
  return () => {
    clearDemoShares()
    client.invalidateQueries({ queryKey: SHARES_KEY })
  }
}

/** Trang người nhận xem; null khi link không tồn tại hoặc đã tắt. Không thử lại khi lỗi. */
export function usePublicShare(token: string) {
  return useQuery({ queryKey: ['public-share', token], queryFn: async () => demoPublicShare(token), retry: false })
}
