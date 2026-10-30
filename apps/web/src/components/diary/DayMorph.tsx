import { ViewTransition, type ReactElement } from 'react'

/**
 * Chuyển cảnh nối (DESIGN.md mục 6, B1): icon của một ngày ở màn này "biến thành" vòng icon lớn ở trang ngày, và ngược
 * lại khi quay về. Bọc icon nguồn (ô dải tháng, thẻ Dòng thời gian, kết quả tìm kiếm) và icon đích (đầu trang ngày) bằng
 * cùng tên theo ngày; React gọi View Transitions khi chuyển trang vì React Router bọc điều hướng trong startTransition.
 * Trình duyệt không hỗ trợ thì đổi ngay. Mỗi màn chỉ được có một phần tử mang tên của một ngày.
 * Thời lượng, đường cong và giảm chuyển động: lớp `day-morph` trong styles/motion.css.
 */
export function DayMorph({ date, children }: { date: string; children: ReactElement }) {
  return (
    <ViewTransition name={`day-${date}`} share="day-morph" default="none">
      {children}
    </ViewTransition>
  )
}
