import { useQueryClient } from '@tanstack/react-query'
import type { Score } from '@/lib/catalog'
import type { DateString } from '@/lib/date'
import { demoWrite } from '@/lib/demo'

/**
 * Chấm điểm nhanh cho hôm nay ngay trên Dòng thời gian (thiết kế B8 · hôm nay chưa viết), kèm hoàn tác.
 * BẢN THỬ: ghi vào bộ nhớ tab (lib/demo.ts). Khi có PUT /entries/{date} (Bước 5) thì đổi thành useMutation.
 */
export function useQuickScore() {
  const client = useQueryClient()
  const refresh = () => {
    // Trang ngày, tháng (['entries', ...]) và pixels đều phải tải lại (web-conventions).
    void client.invalidateQueries({ queryKey: ['entries'] })
    void client.invalidateQueries({ queryKey: ['pixels'] })
  }
  return {
    save(date: DateString, score: Score) {
      const at = new Date().toISOString()
      demoWrite(date, {
        entry_date: date,
        score,
        sub_icon: null,
        flag_color: null,
        title: null,
        content: null,
        keywords: [],
        photos: [],
        created_at: at,
        updated_at: at,
      })
      refresh()
    },
    undo(date: DateString) {
      demoWrite(date, null)
      refresh()
    },
  }
}
