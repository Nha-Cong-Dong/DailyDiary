import type { ReactNode } from 'react'
import type { SaveStatus } from '@/lib/autosave'
import { timeIn } from '@/lib/date'
import { cn } from '@/lib/utils'
import { Stamp } from './Stamp'

/**
 * Trạng thái lưu của một trang (F-06): Đang lưu / Đã lưu / Chưa đồng bộ, cộng lỗi và xung đột, hiện bằng dấu Stamp.
 * `idle` hiện `fallback` (vd. "Chỉ cần chấm điểm là hôm nay đã được ghi lại.").
 */
export function SyncStatus({
  status,
  timeZone,
  onRetry,
  fallback = null,
  className,
}: {
  status: SaveStatus
  timeZone: string
  onRetry?: () => void
  fallback?: ReactNode
  className?: string
}) {
  let body: ReactNode
  switch (status.kind) {
    case 'idle':
      body = fallback
      break
    case 'saving':
      body = <Stamp tone="saving">Đang lưu…</Stamp>
      break
    case 'saved':
      body = <Stamp tone="saved">Đã lưu lúc {timeIn(timeZone, status.at)}</Stamp>
      break
    case 'unsynced':
      body = (
        <>
          <Stamp tone="pending">Chưa đồng bộ</Stamp>
          <span>Sẽ tự lưu khi có mạng.</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="link-underline cursor-pointer font-semibold focus-visible:outline-3 focus-visible:outline-ring"
            >
              Thử lại
            </button>
          ) : null}
        </>
      )
      break
    case 'error':
      body = <Stamp tone="error">{status.message}</Stamp>
      break
    case 'conflict':
      body = <Stamp tone="error">Trang này vừa được sửa ở nơi khác.</Stamp>
      break
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-[22px] md:text-body md:leading-6', className)}
    >
      {body}
    </p>
  )
}
