import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfile } from '@/lib/profile'
import { clearDraftsFor } from '@/lib/storage'

/**
 * Số trang nhật ký và "Xóa toàn bộ dữ liệu" cho Hồ sơ. BẢN THỬ: chưa có API (Bước 12), nên ở dev đọc và xóa dữ liệu mẫu
 * (import động để dữ liệu mẫu không vào bản build); bản build không có số trang và chưa xóa gì.
 */
export function usePageCount(): number | undefined {
  const { data } = useQuery({
    queryKey: ['entries', 'count'],
    queryFn: async () => (import.meta.env.DEV ? (await import('@/lib/demo')).demoEntries().length : null),
  })
  return data ?? undefined
}

export function useWipeJournal(onWiped?: () => void) {
  const client = useQueryClient()
  const { email } = useProfile()
  return useMutation({
    mutationFn: async () => {
      if (import.meta.env.DEV) (await import('@/lib/demo')).wipeDemoData()
      // Nháp chưa đồng bộ cũng là dữ liệu nhật ký: xóa cùng lúc.
      await clearDraftsFor(email)
    },
    onSuccess: () => {
      onWiped?.()
      // Mọi màn đọc nhật ký (Hôm nay, Dòng thời gian, Cả năm, Tìm, Chia sẻ) đọc lại.
      client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    },
  })
}
