import { useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { demoEntries, demoEntry, demoJoined, demoYears } from '@/lib/demo'
import type { YearDay } from './yearStats'

export type PixelsData = { year: number; joined: DateString; years: number[]; days: YearDay[] }

/**
 * Dữ liệu Year in Pixels của một năm: chỉ ngày + điểm (F-03, vài KB). Key ['pixels', year] theo web-conventions.
 * Chưa có GET /pixels/{year} (Bước 10) nên đọc dữ liệu mẫu; `today` chỉ dùng cho người dùng mẫu mới (`?demo=empty`).
 */
export function usePixels(year: number, today: DateString) {
  return useQuery<PixelsData>({
    queryKey: ['pixels', year],
    queryFn: async () => ({
      year,
      joined: demoJoined(today),
      years: demoYears(),
      days: demoEntries().filter((e) => e.entry_date.startsWith(`${year}-`)).map((e) => ({
        entry_date: e.entry_date,
        score: e.score,
      })),
    }),
  })
}

/** Xem nhanh một ngày khi bấm ô: dùng chung key với trang ngày (['entries', date]) nên mở trang ngày không tải lại. */
export function useDayPreview(date: DateString | null) {
  return useQuery({
    queryKey: ['entries', date],
    queryFn: async () => (date ? demoEntry(date) : null),
    enabled: date !== null,
  })
}
