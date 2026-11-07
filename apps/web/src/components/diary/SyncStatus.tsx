import type { ReactNode } from 'react'
import type { SaveStatus } from '@/lib/autosave'
import { timeIn } from '@/lib/date'
import { cn } from '@/lib/utils'
import { Stamp } from './Stamp'

/**
 * Trạng thái lưu của một trang (F-06) bằng dấu Stamp: Đang lưu / Đã lưu / Chưa đồng bộ, cộng lỗi và xung đột.
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
      body = <Stamp kind="saving" />
      break
    case 'saved':
      body = (
        <Stamp kind="saved" animate>
          Đã lưu lúc {timeIn(timeZone, status.at)}
        </Stamp>
      )
      break
    case 'unsynced':
      body = (
        <>
          <Stamp kind="unsynced" />
          <span className="text-ink-soft">Sẽ tự lưu khi có mạng.</span>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="link-underline cursor-pointer font-semibold">
              Thử lại
            </button>
          ) : null}
        </>
      )
      break
    case 'error':
      body = (
        <>
          <Stamp kind="error" />
          <span>{status.message}</span>
        </>
      )
      break
    case 'conflict':
      body = <Stamp kind="error">Trang này vừa được sửa ở nơi khác.</Stamp>
      break
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-body', className)}
    >
      {body}
    </p>
  )
}
