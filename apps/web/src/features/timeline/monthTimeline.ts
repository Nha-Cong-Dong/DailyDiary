import type { Score } from '@/lib/catalog'
import { daysInMonth, shortDateLabel, type DateString } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'

/** "YYYY-MM". */
export type MonthString = string

/**
 * Một trang trong Dòng thời gian (GET /entries?month): không có nội dung đầy đủ — `content` là đoạn đầu
 * (đủ cho thẻ cắt 2 dòng), ảnh chỉ có số lượng.
 */
export type MonthEntry = Pick<
  DemoEntry,
  'entry_date' | 'score' | 'sub_icon' | 'flag_color' | 'title' | 'content' | 'keywords' | 'created_at' | 'updated_at'
> & { photo_count: number }

/**
 * Trạng thái một ngày trong tháng (thiết kế B8 · Dòng thời gian):
 * `entry` đã ghi · `missing` đã qua mà không ghi · `open` hôm nay chưa ghi (ngày chưa hết, không tính là bỏ trống)
 * · `future` chưa tới · `pre` trước khi bắt đầu dùng Jotly.
 */
export type DayKind = 'entry' | 'missing' | 'open' | 'future' | 'pre'
export type MonthDay = {
  date: DateString
  day: number
  kind: DayKind
  entry: MonthEntry | null
}

/** Một dòng trong danh sách: một trang, một đoạn ngày bỏ trống liền nhau (`from`..`to`), hoặc hôm nay chưa ghi. */
export type TimelineItem =
  | { kind: 'entry'; day: number; date: DateString; entry: MonthEntry }
  | { kind: 'gap'; day: number; from: number; to: number; date: DateString }
  | { kind: 'open'; day: number; date: DateString }

export type MonthTimeline = {
  month: MonthString
  days: MonthDay[]
  /** Ngày cuối đã tới trong tháng (hôm nay nếu là tháng này). */
  lastDay: number
  recorded: number
  /** Số ngày đã qua mà không ghi (không tính hôm nay đang mở và ngày trước khi dùng). */
  missed: number
  /** Số ngày tính mẫu số "đã ghi / …": từ ngày bắt đầu dùng tới ngày cuối đã tới. */
  countable: number
  average: number | null
  longestStreak: number
  /** Chuỗi tính tới hôm nay (hôm nay chưa ghi thì tính tới hôm qua); chỉ có nghĩa ở tháng hiện tại. */
  currentStreak: number
  photos: number
  photoDays: number
  topSubIcon: { icon: string; count: number } | null
  /** Mới nhất trước. */
  items: TimelineItem[]
  /** Ngày → mục chứa nó trong danh sách (để cuộn tới khi bấm cột/ô lịch). */
  anchorOf: Map<number, number>
  keywords: { label: string; count: number }[]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Đường dẫn ghi bù trang của một ngày đã qua (thiết kế B9 · Ghi bù). */
export const writePath = (date: DateString) => `/day/${date}/backfill`

export function monthOf(date: DateString): MonthString {
  return date.slice(0, 7)
}

export function addMonths(month: MonthString, delta: number): MonthString {
  const [y, m] = month.split('-').map(Number)
  const i = y * 12 + (m - 1) + delta
  return `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`
}

/** "Tháng 10, 2026". */
export function monthLabel(month: MonthString): string {
  const [y, m] = month.split('-').map(Number)
  return `Tháng ${m}, ${y}`
}

/** Tháng có thể xem: từ tháng bắt đầu dùng tới tháng hiện tại. */
export function monthBounds(joined: DateString, today: DateString): { min: MonthString; max: MonthString } {
  return { min: monthOf(joined), max: monthOf(today) }
}

export function buildMonth(month: MonthString, entries: MonthEntry[], today: DateString, joined: DateString): MonthTimeline {
  const [y, m] = month.split('-').map(Number)
  const len = daysInMonth(y, m)
  const byDate = new Map(entries.map((e) => [e.entry_date, e]))
  const days: MonthDay[] = Array.from({ length: len }, (_, i) => {
    const day = i + 1
    const date = `${month}-${pad(day)}`
    const entry = byDate.get(date) ?? null
    const kind: DayKind = entry ? 'entry' : date > today ? 'future' : date < joined ? 'pre' : date === today ? 'open' : 'missing'
    return { date, day, kind, entry }
  })

  const reached = days.filter((d) => d.kind !== 'future')
  const lastDay = reached.length ? reached[reached.length - 1].day : 0
  const written = days.filter((d) => d.entry).map((d) => d.entry!)
  const scores = written.map((e) => e.score)

  let longest = 0
  let run = 0
  for (const d of days) {
    if (d.kind === 'open' || d.kind === 'future') break
    run = d.kind === 'entry' ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  let current = 0
  for (let i = lastDay - 1; i >= 0; i--) {
    const d = days[i]
    if (d.kind === 'open') continue
    if (d.kind !== 'entry') break
    current++
  }

  const subs = new Map<string, number>()
  for (const e of written) if (e.sub_icon) subs.set(e.sub_icon, (subs.get(e.sub_icon) ?? 0) + 1)
  const [topIcon] = [...subs.entries()].sort((a, b) => b[1] - a[1])

  const items: TimelineItem[] = []
  const anchorOf = new Map<number, number>()
  for (let i = lastDay - 1; i >= 0;) {
    const d = days[i]
    if (d.kind === 'entry') {
      anchorOf.set(d.day, items.length)
      items.push({ kind: 'entry', day: d.day, date: d.date, entry: d.entry! })
      i--
    } else if (d.kind === 'open') {
      anchorOf.set(d.day, items.length)
      items.push({ kind: 'open', day: d.day, date: d.date })
      i--
    } else if (d.kind === 'missing') {
      let a = i
      while (a - 1 >= 0 && days[a - 1].kind === 'missing') a--
      for (let x = a; x <= i; x++) anchorOf.set(days[x].day, items.length)
      items.push({
        kind: 'gap',
        day: d.day,
        from: days[a].day,
        to: d.day,
        date: d.date,
      })
      i = a - 1
    } else {
      i--
    }
  }

  const kw = new Map<string, number>()
  for (const e of written) for (const k of e.keywords) kw.set(k, (kw.get(k) ?? 0) + 1)
  const keywords = [...kw.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }))

  return {
    month,
    days,
    lastDay,
    recorded: written.length,
    missed: days.filter((d) => d.kind === 'missing').length,
    countable: reached.filter((d) => d.kind !== 'pre').length,
    average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    longestStreak: longest,
    currentStreak: current,
    photos: written.reduce((a, e) => a + e.photo_count, 0),
    photoDays: written.filter((e) => e.photo_count).length,
    topSubIcon: topIcon ? { icon: topIcon[0], count: topIcon[1] } : null,
    items,
    anchorOf,
    keywords,
  }
}

/** Danh sách hiện tối đa `limit` trang (kèm các đoạn trống xen giữa); trả về chỉ số cắt và số trang bị ẩn. */
export function cutAfterEntries(items: TimelineItem[], limit: number): { cut: number; hidden: number } {
  let seen = 0
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'entry' && ++seen === limit) {
      return {
        cut: i + 1,
        hidden: items.slice(i + 1).filter((x) => x.kind === 'entry').length,
      }
    }
  }
  return { cut: items.length, hidden: 0 }
}

/** "Chủ nhật, 18/10". */
export function weekdayDate(date: DateString): string {
  return shortDateLabel(date).replace(/ (\d+\/\d+)$/, ', $1')
}

/** Mức điểm gần nhất với điểm trung bình (để tô ô màu bên cạnh). */
export function nearestScore(avg: number): Score {
  return Math.min(5, Math.max(1, Math.round(avg))) as Score
}

/** "3,6": số thập phân kiểu Việt Nam, một chữ số. */
export function decimal(x: number): string {
  return x.toFixed(1).replace('.', ',')
}
