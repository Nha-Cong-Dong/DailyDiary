import { Lock } from 'lucide-react'
import { Link } from 'react-router'
import { useShareCount } from './useShares'

/** Nội dung mục "Chia sẻ" trong Hồ sơ (B7-Profile, bản có Chia sẻ). */
export function SharingSummary() {
  const count = useShareCount()
  return (
    <div className="flex items-start gap-3.5">
      <span aria-hidden="true" className="edge flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-paper shadow-sm">
        <Lock className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body">
          Mọi trang đều riêng tư. Muốn chia sẻ, mở trang ngày đó và bấm <strong className="font-semibold">Chia sẻ</strong>.
        </p>
        <p className="text-sm leading-[22px] text-ink-soft">Bạn chọn phần nào người khác được xem, và tắt link bất cứ lúc nào.</p>
        <Link
          to="/profile/shares"
          className="press mt-1.5 self-start text-sm leading-[22px] font-semibold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {count ? `Xem ${count} trang đang chia sẻ` : 'Xem các trang đang chia sẻ'}
        </Link>
      </div>
    </div>
  )
}
