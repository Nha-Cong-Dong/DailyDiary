import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { demoJoined, demoMonth, type DemoEntry } from '@/lib/demo'
import type { MonthString } from './monthTimeline'

export type MonthData = {
  month: MonthString
  joined: DateString
  entries: DemoEntry[]
}

/**
 * Các trang của một tháng cho Dòng thời gian (F-02). Key ['entries', 'month', 'YYYY-MM'] nằm dưới ['entries']
 * nên lưu một trang (invalidate ['entries']) cũng làm mới tháng. Chưa có GET /entries (Bước 8) và
 * GET /calendar (Bước 9) nên đọc dữ liệu mẫu; `today` chỉ dùng cho người dùng mẫu mới (`?demo=empty`).
 */
export function useMonth(month: MonthString, today: DateString) {
  return useQuery<MonthData>({
    queryKey: ['entries', 'month', month],
    queryFn: async () => ({
      month,
      joined: demoJoined(today),
      entries: demoMonth(month),
    }),
    placeholderData: keepPreviousData,
  })
}
