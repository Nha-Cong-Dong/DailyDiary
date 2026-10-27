import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { Score } from '@/lib/catalog'
import { addDays, type DateString } from '@/lib/date'

export type RecentDay = { score: Score; sub_icon: string | null }

/** Dữ liệu cho dải "7 ngày qua" và dòng tóm tắt tháng ở màn Hôm nay. */
export type RecentDaysData = {
  /** Điểm của 6 ngày trước hôm nay (ngày chưa ghi không có trong map). */
  days: Record<DateString, RecentDay>
  /** Số ngày đã ghi trong tháng của hôm nay, tính tới hôm qua (hôm nay do màn tự cộng). */
  monthRecorded: number
  /** Tổng điểm các ngày đó, để tính trung bình cùng điểm hôm nay. */
  monthScoreSum: number
}

type Row = { entry_date: DateString; score: Score; sub_icon: string | null }

/** Hàm thuần: gom các trang đã ghi trước hôm nay thành dữ liệu cho màn Hôm nay. */
export function recentDaysFrom(rows: Row[], today: DateString): RecentDaysData {
  const from = addDays(today, -6)
  const month = today.slice(0, 7)
  const days: Record<DateString, RecentDay> = {}
  let monthRecorded = 0
  let monthScoreSum = 0
  for (const r of rows) {
    if (r.entry_date >= today) continue
    if (r.entry_date >= from) days[r.entry_date] = { score: r.score, sub_icon: r.sub_icon }
    if (r.entry_date.startsWith(month)) {
      monthRecorded++
      monthScoreSum += r.score
    }
  }
  return { days, monthRecorded, monthScoreSum }
}

/**
 * Lấy từ lịch tháng (GET /calendar/{year}/{month}, chỉ ngày + điểm): tháng của hôm nay, thêm tháng trước nếu 6 ngày qua
 * vắt sang tháng trước. Key nằm dưới ['entries'] nên Sửa / Ghi bù / chấm điểm nhanh làm mới được dải này.
 */
async function monthRows(month: string): Promise<Row[]> {
  const [year, m] = month.split('-').map(Number)
  const { data, error, response } = await api.GET('/calendar/{year}/{month}', { params: { path: { year, month: m } } })
  if (error || !data) throw toApiError(response, error)
  return data.days.map((d) => ({ entry_date: d.entry_date, score: d.score as Score, sub_icon: d.sub_icon }))
}

/** Cấu hình truy vấn, dùng chung cho hook và tải trước theo route (routes/prefetch.ts). */
export const recentDaysQuery = (today: DateString) =>
  queryOptions<RecentDaysData>({
    queryKey: ['entries', 'recent', today],
    queryFn: async () => {
      const months = [...new Set([addDays(today, -6).slice(0, 7), today.slice(0, 7)])]
      const rows = (await Promise.all(months.map(monthRows))).flat()
      return recentDaysFrom(rows, today)
    },
  })

export function useRecentDays(today: DateString) {
  return useQuery(recentDaysQuery(today))
}
