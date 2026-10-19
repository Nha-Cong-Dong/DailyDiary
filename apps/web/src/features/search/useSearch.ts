import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { DEMO_ENTRIES } from '@/lib/demo'
import { searchEntries, topKeywords, type SearchFilters } from './searchEntries'

/**
 * Tìm kiếm (F-05). Chưa có GET /search (Bước 11) nên lọc trên dữ liệu mẫu.
 * Từ khóa chỉ nằm trong bộ nhớ (query key, state), không lên URL, không ghi log.
 */
export function useSearch(q: string, filters: SearchFilters, today: DateString) {
  return useQuery({
    queryKey: ['search', q.trim(), filters, today],
    queryFn: async () => searchEntries(DEMO_ENTRIES, q, filters, today),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useTopKeywords() {
  return useQuery({ queryKey: ['keywords', 'top'], queryFn: async () => topKeywords(DEMO_ENTRIES) })
}
