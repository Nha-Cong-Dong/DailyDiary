import { useQuery } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import { subIcons } from '@/lib/catalog'

export const FREQUENT_COUNT = 8

/**
 * Hàm thuần: `count` sub icon dùng nhiều nhất (chỉ lấy icon có trong danh mục), thiếu thì lấy đầu danh mục.
 * Hòa nhau thì giữ thứ tự của danh mục cho ổn định.
 */
export function frequentSubIcons(used: (string | null)[], catalog: string[] = subIcons, count = FREQUENT_COUNT): string[] {
  const freq = new Map<string, number>()
  for (const icon of used) if (icon && catalog.includes(icon)) freq.set(icon, (freq.get(icon) ?? 0) + 1)
  const top = [...freq.keys()].sort((a, b) => freq.get(b)! - freq.get(a)! || catalog.indexOf(a) - catalog.indexOf(b)).slice(0, count)
  for (const icon of catalog) {
    if (top.length >= count) break
    if (!top.includes(icon)) top.push(icon)
  }
  return top
}

/**
 * Hàng "hay dùng" ở Sửa trang / Ghi bù: đếm trên các trang của chính người dùng (GET /sub-icons/top),
 * thiếu thì lấy đầu danh mục. Key dưới ['entries'] nên lưu một trang thì đếm lại.
 */
export function useFrequentSubIcons() {
  return useQuery<string[]>({
    queryKey: ['entries', 'sub-icons'],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/sub-icons/top')
      if (error || !data) throw toApiError(response, error)
      return frequentSubIcons(data.icons.flatMap(({ icon, count }) => Array<string>(count).fill(icon)))
    },
    staleTime: 5 * 60_000,
  })
}
