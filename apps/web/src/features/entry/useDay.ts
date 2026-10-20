import { useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { readDay } from './localDays'

/**
 * Nhật ký của một ngày. Key theo web-conventions (['entries', date]).
 * Chưa có GET /entries/{date} (Bước 5) nên đọc dữ liệu mẫu (kèm bản vừa sửa trong tab); nối API chỉ cần đổi queryFn.
 */
export function useDay(date: DateString) {
  return useQuery<DemoEntry | null>({
    queryKey: ['entries', date],
    queryFn: async () => readDay(date),
  })
}
