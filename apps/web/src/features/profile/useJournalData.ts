import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import { useProfile } from '@/lib/profile'
import { clearDraftsFor } from '@/lib/storage'

export type DataSummary = components['schemas']['DataSummaryOut']

/**
 * Những gì sẽ mất khi xóa (GET /me/data-summary): số trang, ảnh, link chia sẻ. Key dưới ['entries'] nên viết/xóa
 * một trang thì đếm lại.
 */
export function useDataSummary() {
  return useQuery<DataSummary>({
    queryKey: ['entries', 'data-summary'],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/me/data-summary')
      if (error || !data) throw toApiError(response, error)
      return data
    },
  })
}

/**
 * Xóa toàn bộ dữ liệu (DELETE /entries, gửi "XÓA"): mọi trang, link chia sẻ, ảnh nhật ký; giữ tài khoản và cài đặt.
 * Nháp chưa đồng bộ trong trình duyệt cũng là dữ liệu nhật ký: xóa cùng lúc.
 */
export function useWipeJournal(onWiped?: () => void) {
  const client = useQueryClient()
  const { email } = useProfile()
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.DELETE('/entries', { body: { confirm: 'XÓA' } })
      if (error || !data) throw toApiError(response, error)
      await clearDraftsFor(email)
      return data
    },
    onSuccess: () => {
      onWiped?.()
      // Mọi màn đọc nhật ký (Hôm nay, Dòng thời gian, Cả năm, Tìm, Chia sẻ) đọc lại; hồ sơ giữ nguyên.
      void client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    },
  })
}

/**
 * Xóa tài khoản (DELETE /me, gửi đúng email): máy chủ đăng xuất mọi thiết bị và xóa cookie. Ở đây chỉ xóa nháp; cache
 * xóa khi người dùng bấm "Về trang chủ" (xóa ngay thì các màn đang mở đọc lại, gặp 401 và chuyển trang trước khi kịp
 * thấy màn "Tài khoản đã được xóa").
 */
export function useDeleteAccount() {
  const { email } = useProfile()
  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.DELETE('/me', { body: { confirm_email: email } })
      if (error) throw toApiError(response, error)
      await clearDraftsFor(email)
    },
  })
}
