import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
  return useMutation({
    mutationFn: async () => {
      if (import.meta.env.DEV) (await import('@/lib/demo')).wipeDemoData()
    },
    onSuccess: () => {
      onWiped?.()
      // Mọi màn đọc nhật ký (Hôm nay, Dòng thời gian, Cả năm, Tìm, Chia sẻ) đọc lại.
      client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    },
  })
}
