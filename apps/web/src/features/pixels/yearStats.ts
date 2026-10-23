import type { Score } from '@/lib/catalog'
import { addDays, daysInMonth, type DateString } from '@/lib/date'

/** Một ô của Year in Pixels. `none`: ngày không tồn tại (30/2…); `pre`: trước khi bắt đầu dùng Jotly. */
export type PixelKind = 'none' | 'pre' | 'future' | 'missing' | 'score'
export type YearCell = { date: DateString; day: number; month: number; kind: PixelKind; score: Score | null }

export type YearDay = { entry_date: DateString; score: Score }

export type YearStats = {
  /** 12 hàng × 31 ô. */
  grid: YearCell[][]
  recorded: number
  /** Số ngày đã qua tính từ khi bắt đầu dùng (hoặc 1/1) tới hôm nay (hoặc 31/12). */
  pastDays: number
  longestStreak: number
  currentStreak: number
  average: number | null
  monthAverages: (number | null)[]
  bestMonth: number | null
  /** Số ngày theo điểm 1..5 (chỉ số 0 là điểm 1). */
  distribution: number[]
}

const pad = (n: number) => String(n).padStart(2, '0')

export function yearStats(year: number, days: YearDay[], today: DateString, joined: DateString): YearStats {
  const byDate = new Map(days.map((d) => [d.entry_date, d.score]))
  const grid: YearCell[][] = Array.from({ length: 12 }, (_, m) => {
    const len = daysInMonth(year, m + 1)
    return Array.from({ length: 31 }, (_, i): YearCell => {
      const day = i + 1
      const date = `${year}-${pad(m + 1)}-${pad(day)}`
      if (day > len) return { date, day, month: m + 1, kind: 'none', score: null }
      // Trang có thật luôn hiện, kể cả ngày trước khi bắt đầu dùng (ghi bù) — giống Dòng thời gian.
      const score = byDate.get(date) ?? null
      if (score) return { date, day, month: m + 1, kind: 'score', score }
      if (date < joined) return { date, day, month: m + 1, kind: 'pre', score: null }
      if (date > today) return { date, day, month: m + 1, kind: 'future', score: null }
      return { date, day, month: m + 1, kind: 'missing', score: null }
    })
  })

  const past = grid.flat().filter((c) => c.kind === 'score' || c.kind === 'missing')
  const scores = past.filter((c) => c.score).map((c) => c.score!)
  let longest = 0
  let run = 0
  for (const c of past) {
    run = c.score ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  // Chuỗi hiện tại: đếm lùi từ hôm nay; hôm nay chưa ghi thì vẫn tính tới hôm qua (ngày chưa kết thúc).
  let current = 0
  let cursor = byDate.has(today) ? today : addDays(today, -1)
  while (cursor.startsWith(String(year)) && byDate.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }

  const avg = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null)
  const monthAverages = grid.map((row) => avg(row.filter((c) => c.score).map((c) => c.score!)))
  let bestMonth: number | null = null
  monthAverages.forEach((a, i) => {
    if (a !== null && (bestMonth === null || a > monthAverages[bestMonth]!)) bestMonth = i
  })

  return {
    grid,
    recorded: scores.length,
    pastDays: past.length,
    longestStreak: longest,
    currentStreak: current,
    average: avg(scores),
    monthAverages,
    bestMonth,
    distribution: [1, 2, 3, 4, 5].map((k) => scores.filter((s) => s === k).length),
  }
}

/** "3,6": số thập phân kiểu Việt Nam, một chữ số. */
export function decimal(x: number): string {
  return x.toFixed(1).replace('.', ',')
}
