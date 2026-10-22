import { useQueryClient } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { clearDemoWrites, demoEntry, demoWrite, type DemoEntry } from '@/lib/demo'

/**
 * BẢN THỬ, chỉ sống trong bộ nhớ của tab: các trang vừa sửa / ghi bù trên dữ liệu mẫu, lưu chung kho `demoWrite`
 * với Dòng thời gian và Year in Pixels. Khi có PUT /entries/{date} (Bước 5) thì thay bằng useMutation gọi API;
 * key giữ nguyên ['entries', date]. `null` nghĩa là trang đã bị bỏ (hoàn tác ghi bù).
 */

/** Trang của một ngày: bản vừa ghi trong tab này nếu có, không thì dữ liệu mẫu. */
export function readDay(date: DateString): DemoEntry | null {
  return demoEntry(date)
}

/** Dùng trong test để mỗi test bắt đầu từ dữ liệu mẫu gốc. */
export function clearLocalDays() {
  clearDemoWrites()
}

export function useWriteDay() {
  const client = useQueryClient()
  return (date: DateString, entry: DemoEntry | null) => {
    demoWrite(date, entry)
    client.setQueryData(['entries', date], entry)
    // Dòng thời gian (['entries', 'month', …]), lịch tháng và pixels cần tải lại để hiện trang vừa ghi (web-conventions).
    void client.invalidateQueries({ queryKey: ['entries'] })
    void client.invalidateQueries({ queryKey: ['calendar'] })
    void client.invalidateQueries({ queryKey: ['pixels'] })
  }
}
