import type { Score } from '@/lib/catalog'
import { addDays, type DateString } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { keywordNorm, matches } from '@/lib/text'

export type Period = 'month' | '3m' | 'year' | 'all'

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'Tháng này' },
  { id: '3m', label: '3 tháng' },
  { id: 'year', label: 'Năm nay' },
  { id: 'all', label: 'Mọi lúc' },
]

export type SearchFilters = { scores: Score[]; period: Period; withPhotos: boolean }
export const NO_FILTERS: SearchFilters = { scores: [], period: 'all', withPhotos: false }

/** Ngày sớm nhất thuộc khoảng thời gian, tính theo "hôm nay" của người dùng. */
export function periodStart(period: Period, today: DateString): DateString | null {
  if (period === 'all') return null
  if (period === 'month') return `${today.slice(0, 7)}-01`
  if (period === 'year') return `${today.slice(0, 4)}-01-01`
  return addDays(today, -91)
}

/** F-05: khớp chuỗi con trên tiêu đề, nội dung, từ khóa (không dấu nếu gõ không dấu). */
export function matchesQuery(e: DemoEntry, q: string): boolean {
  return (
    (e.title !== null && matches(e.title, q)) ||
    (e.content !== null && matches(e.content, q)) ||
    e.keywords.some((k) => matches(k, q))
  )
}

export function passesFilters(e: DemoEntry, f: SearchFilters, today: DateString): boolean {
  const start = periodStart(f.period, today)
  if (start && e.entry_date < start) return false
  if (f.scores.length && !f.scores.includes(e.score)) return false
  if (f.withPhotos && !e.photos.length) return false
  return true
}

export type SearchResult = { matched: number; results: DemoEntry[] }

/** Mới nhất trước. `matched` là số trang khớp từ khóa trước khi lọc (để báo "N trang khác bị ẩn bởi bộ lọc"). */
export function searchEntries(entries: DemoEntry[], q: string, f: SearchFilters, today: DateString): SearchResult {
  if (!q.trim()) return { matched: 0, results: [] }
  const hit = entries.filter((e) => matchesQuery(e, q))
  const results = hit.filter((e) => passesFilters(e, f, today)).sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  return { matched: hit.length, results }
}

/** "Từ khóa hay dùng": các từ khóa xuất hiện nhiều nhất (gộp theo dạng không dấu). */
export function topKeywords(entries: DemoEntry[], limit = 6): string[] {
  const count = new Map<string, { label: string; n: number }>()
  for (const e of entries) {
    for (const k of e.keywords) {
      const key = keywordNorm(k)
      const item = count.get(key) ?? { label: k, n: 0 }
      item.n++
      count.set(key, item)
    }
  }
  return [...count.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'vi'))
    .slice(0, limit)
    .map((x) => x.label)
}
