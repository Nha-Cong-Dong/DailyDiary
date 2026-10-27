import { queryOptions, useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { fetchEntry, type DayEntry } from './entries'

/** Cấu hình truy vấn một ngày, dùng chung cho hook và tải trước theo route (routes/prefetch.ts). */
export const dayQuery = (date: DateString) =>
  queryOptions<DayEntry | null>({
    queryKey: ['entries', date],
    queryFn: () => fetchEntry(date),
  })

/** Nhật ký của một ngày (GET /entries/{day}); `null` khi ngày đó chưa ghi hoặc đã xóa. */
export function useDay(date: DateString) {
  return useQuery(dayQuery(date))
}
