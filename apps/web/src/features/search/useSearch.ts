import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { demoEntries } from '@/lib/demo'
import { searchEntries, topKeywords, type SearchFilters } from './searchEntries'

/**
 * Tìm kiếm (F-05). Chưa có GET /search (Bước 11) nên lọc trên dữ liệu mẫu.
 * Từ khóa chỉ nằm trong bộ nhớ (query key, state), không lên URL, không ghi log.
 */
export function useSearch(q: string, filters: SearchFilters, today: DateString) {
  return useQuery({
    queryKey: ['search', q.trim(), filters, today],
    queryFn: async () => searchEntries(demoEntries(), q, filters, today),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useTopKeywords() {
  return useQuery({ queryKey: ['keywords', 'top'], queryFn: async () => topKeywords(demoEntries()) })
}

/** Đã có trang nào chưa (người dùng mới thì hiện màn trống, thiết kế B9). */
export function useHasEntries() {
  return useQuery({ queryKey: ['entries', 'any'], queryFn: async () => demoEntries().length > 0 })
}
