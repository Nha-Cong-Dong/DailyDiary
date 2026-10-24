import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { track } from '@/lib/analytics'
import type { Score } from '@/lib/catalog'
import type { DateString } from '@/lib/date'

/**
 * Chấm điểm nhanh cho hôm nay ngay trên Dòng thời gian (thiết kế B8 · hôm nay chưa viết), kèm hoàn tác.
 * Chấm = tạo trang chỉ có điểm (PUT /entries/{date}); hoàn tác = xóa mềm trang vừa tạo (DELETE).
 * Lỗi (mất mạng, trang vừa được tạo ở tab khác) thì tải lại tháng để màn khớp với máy chủ.
 */
export function useQuickScore() {
  const client = useQueryClient()
  const refresh = () => {
    // Trang ngày, tháng (['entries', ...]) và pixels đều phải tải lại (web-conventions).
    void client.invalidateQueries({ queryKey: ['entries'] })
    void client.invalidateQueries({ queryKey: ['pixels'] })
  }
  return {
    async save(date: DateString, score: Score) {
      const { response } = await api.PUT('/entries/{day}', {
        params: { path: { day: date } },
        body: { score, keywords: [], updated_at: null },
      })
      if (response.ok) track('entry_created')
      refresh()
    },
    async undo(date: DateString) {
      await api.DELETE('/entries/{day}', { params: { path: { day: date } } })
      refresh()
    },
  }
}
