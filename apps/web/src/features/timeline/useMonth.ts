import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import type { Score } from '@/lib/catalog'
import { todayIn, type DateString } from '@/lib/date'
import { useMe, useProfile } from '@/lib/profile'
import type { MonthEntry, MonthString } from './monthTimeline'

export type MonthData = {
  month: MonthString
  joined: DateString
  entries: MonthEntry[]
}

type EntrySummary = components['schemas']['EntrySummaryOut']

export function toMonthEntry(e: EntrySummary): MonthEntry {
  return {
    entry_date: e.entry_date,
    score: e.score as Score,
    sub_icon: e.sub_icon,
    flag_color: e.flag_color,
    title: e.title,
    content: e.excerpt,
    keywords: e.keywords,
    photo_count: e.photo_count,
    created_at: e.created_at,
    updated_at: e.updated_at,
  }
}

/** Các trang chưa xóa của một tháng, mới nhất trước (GET /entries?month=YYYY-MM, một request). */
export async function fetchMonth(month: MonthString): Promise<MonthEntry[]> {
  const { data, error, response } = await api.GET('/entries', { params: { query: { month } } })
  if (error || !data) throw toApiError(response, error)
  return data.entries.map(toMonthEntry)
}

/**
 * Các trang của một tháng cho Dòng thời gian (F-02, thiết kế B8). Key ['entries', 'month', 'YYYY-MM'] nằm dưới
 * ['entries'] nên lưu một trang (invalidate ['entries']) cũng làm mới tháng.
 * `joined`: ngày bắt đầu dùng Jotly (users.joined_at theo múi giờ hồ sơ) — tháng nhỏ nhất xem được, ô trước đó là "pre".
 */
export function useMonth(month: MonthString, today: DateString) {
  const { timeZone } = useProfile()
  const { data: me } = useMe()
  const joined = me ? todayIn(timeZone, new Date(me.joined_at)) : today
  return useQuery<MonthData>({
    queryKey: ['entries', 'month', month],
    queryFn: async () => ({ month, joined, entries: await fetchMonth(month) }),
    placeholderData: keepPreviousData,
    select: (d) => ({ ...d, joined }),
  })
}
