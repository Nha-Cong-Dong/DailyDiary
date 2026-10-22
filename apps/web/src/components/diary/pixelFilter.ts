import type { Score } from '@/lib/catalog'
import type { DayState } from './CalendarCell'

/** Nhóm ô dùng để lọc Year in Pixels: một mức điểm, "chưa ghi" hoặc "chưa tới". */
export type PixelFilter = Score | 'missing' | 'future'

export function pixelFilterOf(score: Score | null, state: DayState): PixelFilter {
  return score ?? (state === 'future' ? 'future' : 'missing')
}
