import { CircleCheck, CloudOff, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SaveStatus } from '@/lib/autosave'
import { timeIn } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Trạng thái lưu của một trang (F-06): Đang lưu / Đã lưu / Chưa đồng bộ, cộng lỗi và xung đột.
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
  const icon = 'size-[18px] shrink-0'
  let body: ReactNode
  switch (status.kind) {
    case 'idle':
      body = fallback
      break
    case 'saving':
      body = (
        <>
          <LoaderCircle className={cn(icon, 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
          Đang lưu…
        </>
      )
      break
    case 'saved':
      body = (
        <>
          <CircleCheck className={icon} aria-hidden="true" />
          Đã lưu lúc {timeIn(timeZone, status.at)}
        </>
      )
      break
    case 'unsynced':
      body = (
        <>
          <CloudOff className={icon} aria-hidden="true" />
          <span>Chưa đồng bộ — sẽ tự lưu khi có mạng.</span>
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
      body = (
        <>
          <TriangleAlert className={cn(icon, 'text-destructive')} aria-hidden="true" />
          <span>{status.message}</span>
        </>
      )
      break
    case 'conflict':
      body = (
        <>
          <TriangleAlert className={icon} aria-hidden="true" />
          Trang này vừa được sửa ở nơi khác.
        </>
      )
      break
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-[22px] md:text-[15px] md:leading-6', className)}
    >
      {body}
    </p>
  )
}
