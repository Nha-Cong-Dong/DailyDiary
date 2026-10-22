import type { Score } from '@/lib/catalog'
import { daysInMonth } from '@/lib/date'

// Dữ liệu minh họa cố định cho landing (không phải dữ liệu người dùng): tháng 10/2026, "hôm nay" là ngày 18.
export const DEMO_YEAR = 2026
export const DEMO_MONTH = 10
export const DEMO_TODAY = 18
export const DEMO_ICON_SET = 'sprout'

export type DemoDay = { score: Score; sub: string }

export const OCTOBER: Record<number, DemoDay> = {
  1: { score: 3, sub: '☕' },
  2: { score: 4, sub: '🌸' },
  4: { score: 5, sub: '✨' },
  5: { score: 3, sub: '📚' },
  6: { score: 2, sub: '🌧️' },
  7: { score: 3, sub: '🍀' },
  8: { score: 4, sub: '🎧' },
  10: { score: 5, sub: '🌸' },
  11: { score: 4, sub: '🍜' },
  12: { score: 3, sub: '🍀' },
  13: { score: 4, sub: '🌸' },
  15: { score: 2, sub: '🧊' },
  16: { score: 5, sub: '🌸' },
  17: { score: 3, sub: '🍀' },
  18: { score: 4, sub: '😌' },
}

export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const MONTH_LENGTHS = Array.from({ length: 12 }, (_, m) => daysInMonth(DEMO_YEAR, m + 1))

export type DemoPixel = { day: number; month: number; score: Score | null; future: boolean } | null

/** 12 hàng × 31 ô. Ô `null` là ngày không tồn tại (30/2…). Các tháng trước tháng 10 sinh giả ngẫu nhiên, cố định. */
export function demoYear(): DemoPixel[][] {
  let seed = 20261018
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return MONTH_LENGTHS.map((len, m) =>
    Array.from({ length: 31 }, (_, i) => {
      const day = i + 1
      const month = m + 1
      if (day > len) return null
      if (month > DEMO_MONTH || (month === DEMO_MONTH && day > DEMO_TODAY)) {
        return { day, month, score: null, future: true }
      }
      if (month === DEMO_MONTH) return { day, month, score: OCTOBER[day]?.score ?? null, future: false }
      const r = rnd()
      const score: Score | null = r < 0.09 ? null : r < 0.16 ? 1 : r < 0.33 ? 2 : r < 0.62 ? 3 : r < 0.86 ? 4 : 5
      return { day, month, score, future: false }
    }),
  )
}
