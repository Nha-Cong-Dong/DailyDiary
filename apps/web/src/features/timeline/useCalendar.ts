import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import type { MonthString } from './monthTimeline'

export type CalendarMonth = components['schemas']['CalendarOut']

/**
 * Lịch + thống kê tháng (GET /calendar/{year}/{month}, Bước 9). Dòng thời gian lấy chuỗi ngày từ đây vì backend mới
 * biết các tháng trước (chuỗi hiện tại vắt qua tháng) và áp quy tắc ghi bù không nối chuỗi.
 * Key ['calendar', year, month] theo web-conventions: lưu một trang thì làm mới (entries.ts › refreshSummaries).
 */
export function useCalendar(month: MonthString) {
  const [year, m] = month.split('-').map(Number)
  return useQuery<CalendarMonth>({
    queryKey: ['calendar', year, m],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/calendar/{year}/{month}', { params: { path: { year, month: m } } })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    placeholderData: keepPreviousData,
  })
}
