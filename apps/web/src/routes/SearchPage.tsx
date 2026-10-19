import { useLocation } from 'react-router'
import { Search } from '@/features/search/Search'

// Từ khóa mở từ trang ngày đi qua state của router (không lên URL, xem Project_Specs F-05).
export function SearchPage() {
  const state = useLocation().state as { q?: unknown } | null
  const q = typeof state?.q === 'string' ? state.q : ''
  return <Search key={q} initialQuery={q} />
}
