import { useQuery } from '@tanstack/react-query'
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
 * Hàng "hay dùng" ở Sửa trang / Ghi bù. Ở dev đếm trên dữ liệu mẫu; bản build chưa có API (Bước 5) nên lấy đầu
 * danh mục. Khi có API thì đếm từ các trang của chính người dùng.
 */
export function useFrequentSubIcons() {
  return useQuery<string[]>({
    queryKey: ['entries', 'sub-icons'],
    queryFn: async () => {
      if (!import.meta.env.DEV) return frequentSubIcons([])
      const { demoEntries } = await import('@/lib/demo')
      return frequentSubIcons(demoEntries().map((e) => e.sub_icon))
    },
    staleTime: 5 * 60_000,
  })
}
