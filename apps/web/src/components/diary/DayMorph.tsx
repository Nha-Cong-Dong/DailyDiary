import { ViewTransition, type ReactNode } from 'react'

/** Tên chuyển cảnh nối của một ngày; mỗi màn chỉ được có một phần tử mang tên này cùng lúc. */
function dayMorphName(date: string) {
  return `day-${date}`
}

/**
 * Chuyển cảnh nối "icon của ngày sang trang ngày" (canvas B11-Motion): bọc vòng icon ở nơi bấm mở một ngày (thẻ
 * Dòng thời gian, ô dải tháng, kết quả tìm kiếm, ô lịch) và vòng icon ở đầu trang ngày bằng cùng `date`. Khi điều
 * hướng (React Router bọc trong startTransition), React ghép hai phần tử bằng View Transitions: vòng icon bay 320ms
 * ease-move, phần còn lại mờ chéo 120ms; quay lại thì chạy ngược. Trình duyệt không hỗ trợ: đổi ngay. Giảm chuyển
 * động: chỉ mờ chéo 150ms (styles/motion.css).
 *
 * Chỉ chạy "share"; vào/ra/cập nhật không có animation, để các lần đổi dữ liệu khác trong startTransition yên lặng.
 * Không đặt hai DayMorph cùng `date` trên một màn (vd. danh sách và lịch cùng hiện): đặt `disabled` cho bản phụ.
 */
export function DayMorph({ date, disabled, children }: { date: string; disabled?: boolean; children: ReactNode }) {
  if (disabled) return children
  return (
    <ViewTransition name={dayMorphName(date)} share="day-morph" default="none" enter="none" exit="none" update="none">
      {children}
    </ViewTransition>
  )
}
