import { useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { onReconnectSynced, resetReconnectSynced } from '@/lib/autosave'
import { flagColors } from '@/lib/catalog'
import { useOnline } from '@/lib/online'
import { cn } from '@/lib/utils'

const SAGE = flagColors.find((c) => c.id === 'sage')!.hex
/** Thời gian giữ dải "Đã có mạng lại" trước khi tự ẩn. */
export const BACK_ONLINE_MS = 4000

/**
 * Dải báo mất mạng dưới thanh trên (thiết kế B9 · Lỗi, mất mạng, đang tải).
 * Có mạng lại thì đổi sang "Đã có mạng lại" vài giây rồi ẩn.
 */
export function OfflineBanner() {
  const online = useOnline()
  const client = useQueryClient()
  const [backOnline, setBackOnline] = useState(false)
  const [retrying, setRetrying] = useState(false)
  // Số trang tự động lưu xong sau khi có mạng lại (F-06).
  const [synced, setSynced] = useState(0)
  useEffect(() => onReconnectSynced(setSynced), [])

  // Nghe thẳng sự kiện của trình duyệt để biết lúc vừa có mạng lại (useOnline chỉ cho biết trạng thái hiện tại).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onOnline = () => {
      resetReconnectSynced()
      setSynced(0)
      setBackOnline(true)
      // Lấy lại dữ liệu đang hiện trên màn (đã hỏng khi mất mạng).
      void client.refetchQueries({ type: 'active' })
      clearTimeout(timer)
      timer = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS)
    }
    const onOffline = () => {
      clearTimeout(timer)
      setBackOnline(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [client])

  async function retry() {
    setRetrying(true)
    try {
      await client.refetchQueries({ type: 'active' })
    } finally {
      setRetrying(false)
    }
  }

  if (online && !backOnline) return null

  return (
    <div
      role="status"
      className={cn('animate-drop border-b-[1.5px] border-line', online ? 'bg-secondary' : 'bg-highlight')}
    >
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-2.5 sm:px-[clamp(16px,4vw,40px)]">
        {online ? (
          <>
            <span
              aria-hidden="true"
              className="inline-flex size-6 animate-stamp items-center justify-center rounded-full border-[1.5px] border-line text-[#272218]"
              style={{ backgroundColor: SAGE }}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <p className="text-sm leading-[22px]">
              <strong className="font-semibold">Đã có mạng lại.</strong>{' '}
              {synced > 0 ? `Đã lưu ${synced} trang bạn viết lúc ngoại tuyến.` : 'Dữ liệu trên màn đã được tải lại.'}
            </p>
          </>
        ) : (
          <>
            <WifiOff className="size-5" aria-hidden="true" />
            <p className="flex-[1_1_360px] text-sm leading-[22px]">
              <strong className="font-semibold">Bạn đang ngoại tuyến.</strong> Những gì bạn viết vẫn được giữ trên trình
              duyệt này và sẽ tự lưu khi có mạng.
            </p>
            <Button variant="secondary" size="sm" className="h-9 shadow-none" disabled={retrying} onClick={retry}>
              {retrying ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              {retrying ? 'Đang thử…' : 'Thử kết nối lại'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
