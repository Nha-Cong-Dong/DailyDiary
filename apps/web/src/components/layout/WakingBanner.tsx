import { LoaderCircle } from 'lucide-react'
import { useOnline } from '@/lib/online'
import { useServerWaking } from '@/lib/serverWake'

/**
 * Thẻ nổi "Đang đánh thức máy chủ…": hiện khi một request tới API chạy quá vài giây (máy chủ miễn phí đang thức dậy).
 * Nổi dưới màn (trên thanh tab dưới ở điện thoại) để không đẩy bố cục; khi mất mạng thì để dải ngoại tuyến lo.
 */
export function WakingBanner() {
  const waking = useServerWaking()
  const online = useOnline()
  if (!waking || !online) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:bottom-6"
    >
      <div className="pointer-events-auto flex max-w-[460px] animate-rise items-start gap-3 rounded-md edge bg-card px-4 py-3 shadow-lg">
        <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-ink-soft" aria-hidden="true" />
        <p className="text-sm leading-[22px]">
          <strong className="font-semibold">Đang đánh thức máy chủ…</strong>{' '}
          <span className="text-ink-soft">
            Máy chủ nghỉ khi vắng người nên lần đầu có thể mất tới một phút. Bạn không cần làm gì.
          </span>
        </p>
      </div>
    </div>
  )
}
