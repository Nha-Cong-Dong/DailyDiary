import { useQuery } from '@tanstack/react-query'
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

const EMPTY: RecentDaysData = { days: {}, monthRecorded: 0, monthScoreSum: 0 }

/**
 * Cùng nguồn với Dòng thời gian: ở dev đọc dữ liệu mẫu (kèm trang vừa ghi trong tab qua demoWrite), bản build
 * chưa có API (Bước 9 `/calendar`) nên trả rỗng. Import động để dữ liệu mẫu không vào bản build.
 * Key nằm dưới ['entries'] nên Sửa / Ghi bù / chấm điểm nhanh làm mới được dải này.
 */
export function useRecentDays(today: DateString) {
  return useQuery<RecentDaysData>({
    queryKey: ['entries', 'recent', today],
    queryFn: async () => {
      if (!import.meta.env.DEV) return EMPTY
      const { demoEntries } = await import('@/lib/demo')
      return recentDaysFrom(demoEntries(), today)
    },
  })
}
