/** Bộ lọc của màn Tìm kiếm (F-05). Lọc và khớp từ khóa làm ở backend (GET /search). */
import type { Score } from '@/lib/catalog'

export type Period = 'month' | '3m' | 'year' | 'all'

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'Tháng này' },
  { id: '3m', label: '3 tháng' },
  { id: 'year', label: 'Năm nay' },
  { id: 'all', label: 'Mọi lúc' },
]

export type SearchFilters = { scores: Score[]; period: Period; withPhotos: boolean }
export const NO_FILTERS: SearchFilters = { scores: [], period: 'all', withPhotos: false }
