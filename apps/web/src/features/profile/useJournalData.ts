import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import { useProfile } from '@/lib/profile'
import { clearDraftsFor } from '@/lib/storage'

/**
 * Những gì sẽ mất khi xóa (GET /me/data-summary): số trang, ảnh, link chia sẻ, kèm dung lượng ảnh. Hook nằm ở lib/usage.ts
 * vì ô ảnh (components/diary) cũng dùng.
 */
export { useDataSummary, type DataSummary } from '@/lib/usage'

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
