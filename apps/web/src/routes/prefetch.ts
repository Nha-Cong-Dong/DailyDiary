import type { QueryClient } from '@tanstack/react-query'
import { dayQuery } from '@/features/entry/useDay'
import { recentDaysQuery } from '@/features/entry/useRecentDays'
import { pixelsQuery } from '@/features/pixels/usePixels'
import { isMonth, monthOf } from '@/features/timeline/monthTimeline'
import { calendarQuery } from '@/features/timeline/useCalendar'
import { monthQuery } from '@/features/timeline/useMonth'
import { todayIn, type DateString } from '@/lib/date'
import { meQuery, type Me } from '@/lib/profile'

/**
 * Tải trước dữ liệu của màn ngay khi có /me, song song với chunk của màn (Bước 14, LCP), thay vì chờ màn vẽ xong
 * mới gọi. Dùng đúng cấu hình truy vấn của hook nên màn nhận lại từ cache. Lỗi (401, mất mạng) bỏ qua: màn tự gọi lại
 * và hiện lỗi như bình thường.
 */
type Prefetch = (client: QueryClient, me: Me, url: URL, params: Record<string, string | undefined>) => unknown

const today = (me: Me): DateString => todayIn(me.timezone)
const joined = (me: Me): DateString => todayIn(me.timezone, new Date(me.joined_at))

export const prefetchers = {
  today: (client, me) => {
    void client.prefetchQuery(dayQuery(today(me)))
    void client.prefetchQuery(recentDaysQuery(today(me)))
  },
  day: (client, _me, _url, params) => (params.date ? client.prefetchQuery(dayQuery(params.date)) : undefined),
  timeline: (client, me, url) => {
    const asked = url.searchParams.get('m')
    const month = isMonth(asked) ? asked : monthOf(today(me))
    void client.prefetchQuery(monthQuery(month, joined(me)))
    void client.prefetchQuery(calendarQuery(month))
  },
  pixels: (client, me) => {
    void client.prefetchQuery(pixelsQuery(Number(today(me).slice(0, 4))))
  },
} satisfies Record<string, Prefetch>

/** Trả về một promise xong khi dữ liệu chính đã tải (hoặc lỗi, bỏ qua); nơi gọi không bắt buộc phải chờ. */
export function prefetchRoute(
  client: QueryClient,
  name: keyof typeof prefetchers,
  url: URL,
  params: Record<string, string | undefined>,
): Promise<void> {
  return client.fetchQuery(meQuery).then(
    async (me) => {
      await prefetchers[name](client, me, url, params)
    },
    () => {},
  )
}
