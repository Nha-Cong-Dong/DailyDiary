import { useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { fetchEntry, type DayEntry } from './entries'

/** Nhật ký của một ngày (GET /entries/{day}); `null` khi ngày đó chưa ghi hoặc đã xóa. */
export function useDay(date: DateString) {
  return useQuery<DayEntry | null>({
    queryKey: ['entries', date],
    queryFn: () => fetchEntry(date),
  })
}
