import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { Score } from '@/lib/catalog'
import { addDays, todayIn, type DateString } from '@/lib/date'
import { useMe, useProfile } from '@/lib/profile'
import type { YearDay } from './yearStats'

export type PixelsData = {
  year: number
  joined: DateString
  years: number[]
  days: YearDay[]
  /** Màu cờ theo ngày (chế độ tô theo cờ chưa có trong thiết kế; dữ liệu đã có sẵn). */
  flags: Record<DateString, string>
  /** Chuỗi ngày tính ở backend: trang ghi bù không nối chuỗi, chuỗi hiện tại vắt qua năm. */
  longestStreak: number
  currentStreak: number
}

/** Giải dạng gọn của GET /pixels/{year}: ký tự thứ i của `scores` là điểm ngày thứ i trong năm ("0" = chưa ghi). */
export function decodeYear(year: number, scores: string, flags: Record<string, string>) {
  const first = `${year}-01-01`
  const days: YearDay[] = []
  const flagByDate: Record<DateString, string> = {}
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] !== '0') days.push({ entry_date: addDays(first, i), score: Number(scores[i]) as Score })
  }
  for (const [i, hex] of Object.entries(flags)) flagByDate[addDays(first, Number(i))] = hex
  return { days, flags: flagByDate }
}

/** Cấu hình truy vấn (dữ liệu thô), dùng chung cho hook và tải trước theo route (routes/prefetch.ts). */
export const pixelsQuery = (year: number) =>
  queryOptions({
    queryKey: ['pixels', year],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/pixels/{year}', { params: { path: { year } } })
      if (error || !data) throw toApiError(response, error)
      return data
    },
  })

/**
 * Year in Pixels một năm (GET /pixels/{year}, F-03: một request, vài KB). Key ['pixels', year] theo web-conventions;
 * lưu một trang thì entries.ts làm mới ['pixels'].
 * `joined`: ngày bắt đầu dùng Jotly theo múi giờ hồ sơ — ô trước ngày đó là "trước khi dùng".
 */
export function usePixels(year: number, today: DateString) {
  const { timeZone } = useProfile()
  const { data: me } = useMe()
  const joined = me ? todayIn(timeZone, new Date(me.joined_at)) : today
  return useQuery({
    ...pixelsQuery(year),
    placeholderData: keepPreviousData,
    select: (d): PixelsData => ({
      year: d.year,
      joined,
      years: d.years,
      ...decodeYear(d.year, d.scores, d.flags),
      longestStreak: d.stats.longest_streak,
      currentStreak: d.stats.current_streak,
    }),
  })
}

/**
 * Xem nhanh một ngày khi bấm ô (GET /entries/{day}). Key riêng ['pixels', 'day', date]: trang ngày lưu bản đã đổi
 * dạng (features/entry) dưới ['entries', date], còn ở đây giữ nguyên EntryOut.
 */
export function useDayPreview(date: DateString | null) {
  return useQuery({
    queryKey: ['pixels', 'day', date],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/entries/{day}', { params: { path: { day: date! } } })
      if (response.status === 404) return null
      if (error || !data) throw toApiError(response, error)
      return { ...data, score: data.score as Score }
    },
    enabled: date !== null,
  })
}
