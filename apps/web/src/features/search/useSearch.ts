import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import { resultBucket, track } from '@/lib/analytics'
import type { Score } from '@/lib/catalog'
import { addDays, type DateString } from '@/lib/date'
import { NO_FILTERS, type SearchFilters } from './searchEntries'

type Hit = components['schemas']['SearchHitOut']

/** Một trang kết quả như màn Tìm kiếm dùng: `content` là đoạn trích quanh chỗ khớp (API không trả cả nội dung). */
export type SearchHit = {
  entry_date: DateString
  score: Score
  title: string | null
  content: string | null
  keywords: string[]
  sub_icon: string | null
  flag_color: string | null
  photo_count: number
}

const toHit = (h: Hit): SearchHit => ({
  entry_date: h.entry_date,
  score: h.score as Score,
  title: h.title,
  content: h.excerpt,
  keywords: h.keywords,
  sub_icon: h.sub_icon,
  flag_color: h.flag_color,
  photo_count: h.photo_count,
})

/** Giá trị chỉ đổi khi người dùng ngừng gõ `ms` mili giây (đỡ gửi một request mỗi phím). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return settled
}

// Lượt tìm đã đếm gần nhất (chỉ trong bộ nhớ): tải lại cùng từ khóa + bộ lọc không đếm lại.
let lastCounted = ''

/** `search_used` (Bước 13): chỉ gửi có lọc hay không và số kết quả theo khoảng; không gửi từ khóa, bộ lọc cụ thể. */
function countSearch(query: string, filters: SearchFilters, matched: number) {
  const key = JSON.stringify([query, filters])
  if (key === lastCounted) return
  lastCounted = key
  const filtered =
    filters.scores.length > 0 || filters.period !== NO_FILTERS.period || filters.withPhotos !== NO_FILTERS.withPhotos
  track('search_used', { filtered, results: resultBucket(matched) })
}

/**
 * Tìm kiếm (F-05, GET /search): mới nhất trước, mỗi lần một trang kết quả; "Xem thêm" lấy trang kế bằng `cursor`.
 * Từ khóa chỉ nằm trong bộ nhớ (query key, state) và query string của request API — không lên URL của trang,
 * không ghi log (backend không ghi query string).
 */
export function useSearch(q: string, filters: SearchFilters) {
  const query = q.trim()
  return useInfiniteQuery({
    queryKey: ['search', query, filters],
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET('/search', {
        params: {
          query: {
            q: query,
            score: filters.scores.length ? filters.scores : undefined,
            period: filters.period,
            has_photo: filters.withPhotos || undefined,
            cursor: pageParam ?? undefined,
          },
        },
      })
      if (error || !data) throw toApiError(response, error)
      if (pageParam === null) countSearch(query, filters, data.matched)
      return { ...data, results: data.results.map(toHit) }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
    select: (d) => ({
      results: d.pages.flatMap((p) => p.results),
      matched: d.pages[0]?.matched ?? 0,
      total: d.pages[0]?.total ?? 0,
    }),
  })
}

/** "Từ khóa hay dùng": 6 từ khóa dùng nhiều nhất của chính người dùng (GET /keywords/top). */
export function useTopKeywords() {
  return useQuery({
    queryKey: ['entries', 'keywords-top'],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/keywords/top')
      if (error || !data) throw toApiError(response, error)
      return data.keywords
    },
  })
}

/** Ba trang có tiêu đề gần nhất (tháng này và tháng trước, GET /entries?month) để gợi ý khi chưa gõ gì. */
export function useRecentPages(today: DateString, limit = 3) {
  return useQuery({
    queryKey: ['entries', 'recent-titled', today, limit],
    queryFn: async () => {
      const months = [today.slice(0, 7), addDays(`${today.slice(0, 7)}-01`, -1).slice(0, 7)]
      const pages = await Promise.all(
        months.map(async (month) => {
          const { data, error, response } = await api.GET('/entries', { params: { query: { month } } })
          if (error || !data) throw toApiError(response, error)
          return data.entries
        }),
      )
      return pages
        .flat()
        .filter((e) => e.title)
        .slice(0, limit)
        .map((e) => ({ entry_date: e.entry_date, title: e.title, score: e.score as Score, sub_icon: e.sub_icon }))
    },
  })
}

/** Đã có trang nào chưa (người dùng mới thì hiện màn trống, thiết kế B9): năm nào có trang (GET /pixels). */
export function useHasEntries(today: DateString) {
  const year = Number(today.slice(0, 4))
  return useQuery({
    queryKey: ['entries', 'any', year],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/pixels/{year}', { params: { path: { year } } })
      if (error || !data) throw toApiError(response, error)
      return data.years.length > 0
    },
  })
}
