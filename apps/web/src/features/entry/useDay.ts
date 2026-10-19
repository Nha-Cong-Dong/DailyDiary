import { useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { demoEntry, type DemoEntry } from '@/lib/demo'

/**
 * Nhật ký của một ngày. Key theo web-conventions (['entries', date]).
 * Chưa có GET /entries/{date} (Bước 5) nên đọc dữ liệu mẫu; nối API chỉ cần đổi queryFn.
 */
export function useDay(date: DateString) {
  return useQuery<DemoEntry | null>({
    queryKey: ['entries', date],
    queryFn: async () => demoEntry(date),
  })
}
