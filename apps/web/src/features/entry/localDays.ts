import { useQueryClient } from '@tanstack/react-query'
import type { DateString } from '@/lib/date'
import { demoEntry, type DemoEntry } from '@/lib/demo'

/**
 * BẢN THỬ, chỉ sống trong bộ nhớ của tab: các trang vừa sửa / ghi bù trên dữ liệu mẫu.
 * Khi có PUT /entries/{date} (Bước 5) thì thay bằng useMutation gọi API; key giữ nguyên ['entries', date].
 * `null` nghĩa là trang đã bị bỏ (hoàn tác ghi bù).
 */
const overrides = new Map<DateString, DemoEntry | null>()

/** Trang của một ngày: bản vừa sửa trong tab này nếu có, không thì dữ liệu mẫu. */
export function readDay(date: DateString): DemoEntry | null {
  return overrides.has(date) ? overrides.get(date)! : demoEntry(date)
}

/** Dùng trong test để mỗi test bắt đầu từ dữ liệu mẫu gốc. */
export function clearLocalDays() {
  overrides.clear()
}

export function useWriteDay() {
  const client = useQueryClient()
  return (date: DateString, entry: DemoEntry | null) => {
    overrides.set(date, entry)
    client.setQueryData(['entries', date], entry)
    // Lịch tháng, pixels và dòng thời gian của ngày này cần tải lại (web-conventions).
    void client.invalidateQueries({ queryKey: ['calendar'] })
    void client.invalidateQueries({ queryKey: ['pixels'] })
  }
}
