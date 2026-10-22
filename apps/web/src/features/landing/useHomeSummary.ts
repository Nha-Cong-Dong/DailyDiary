import { useQuery } from '@tanstack/react-query'
import type { Score } from '@/lib/catalog'
import { addDays, todayIn, type DateString } from '@/lib/date'

/** Tóm tắt tháng hiện tại cho trang chủ khi đã đăng nhập (thiết kế B5 · Landing đã đăng nhập). */
export type HomeSummary = {
  /** Số ngày đã ghi trong tháng, tính tới hôm nay. */
  recorded: number
  /** Số ngày đã qua của tháng, kể cả hôm nay. */
  daysSoFar: number
  /** Chuỗi ngày ghi liền nhau tính tới hôm nay (hôm nay chưa ghi thì tính tới hôm qua). */
  streak: number
  todayWritten: boolean
  /** Các ngày đã ghi của tháng hiện tại (ngày → điểm, sub icon), để lịch xem trước dùng cùng số liệu. */
  days: Record<number, { score: Score; sub: string | null }>
}

type RecordedDay = { entry_date: DateString; score: Score; sub_icon: string | null }

/** Hàm thuần: tính tóm tắt từ danh sách ngày đã ghi. */
export function summarize(recordedDays: Iterable<RecordedDay>, today: DateString): HomeSummary {
  const byDate = new Map<DateString, RecordedDay>()
  for (const e of recordedDays) byDate.set(e.entry_date, e)
  const day = Number(today.slice(8, 10))
  const days: HomeSummary['days'] = {}
  for (let d = 1; d <= day; d++) {
    const e = byDate.get(`${today.slice(0, 8)}${String(d).padStart(2, '0')}`)
    if (e) days[d] = { score: e.score, sub: e.sub_icon }
  }
  const todayWritten = byDate.has(today)
  let streak = 0
  for (let d = todayWritten ? today : addDays(today, -1); byDate.has(d); d = addDays(d, -1)) streak++
  return { recorded: Object.keys(days).length, daysSoFar: day, streak, todayWritten, days }
}

/**
 * Chưa có API nhật ký (Bước 5) nên ở dev đọc dữ liệu mẫu, còn bản build trả null (trang chủ hiện câu chung).
 * Import động trong nhánh DEV để dữ liệu mẫu không vào bản build.
 */
export function useHomeSummary(timeZone: string) {
  const today = todayIn(timeZone)
  return useQuery<HomeSummary | null>({
    queryKey: ['entries', 'home-summary', today],
    queryFn: async () => {
      if (!import.meta.env.DEV) return null
      const { demoEntries } = await import('@/lib/demo')
      return summarize(demoEntries(), today)
    },
  })
}

/** "Chào buổi tối, Minh An" theo giờ ở múi giờ hồ sơ; 0h–5h là "Khuya rồi, Minh An". */
export function greeting(name: string, timeZone: string, now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now))
  if (hour < 5) return `Khuya rồi, ${name}`
  const part = hour < 11 ? 'sáng' : hour < 13 ? 'trưa' : hour < 18 ? 'chiều' : 'tối'
  return `Chào buổi ${part}, ${name}`
}
