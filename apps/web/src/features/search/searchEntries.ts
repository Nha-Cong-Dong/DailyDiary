/** Bộ lọc của màn Tìm kiếm (F-05). Lọc và khớp từ khóa làm ở backend (GET /search). */
import type { Score } from '@/lib/catalog'

export type Period = 'month' | '3m' | 'year' | 'all'

/** Thứ tự hiện ra; chữ nhãn nằm ở bản dịch (search:periods.<id>). */
export const PERIODS: readonly Period[] = ['month', '3m', 'year', 'all']

export type SearchFilters = { scores: Score[]; period: Period; withPhotos: boolean }
export const NO_FILTERS: SearchFilters = { scores: [], period: 'all', withPhotos: false }
