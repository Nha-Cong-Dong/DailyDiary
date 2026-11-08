import { TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import { storageUsage, useDataSummary, usagePercent } from '@/lib/usage'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

/**
 * Dung lượng ảnh trong mục Nhật ký của Hồ sơ (mục 4.5 của đặc tả: hạn mức theo cấp tài khoản, cảnh báo khi đạt
 * `warn_ratio`). Số liệu từ GET /me/data-summary: tính cả ảnh của trang trong thùng rác (ảnh còn trong kho tới khi
 * dọn), không tính ảnh đại diện.
 */
export function StorageUsage() {
  const { data, isPending } = useDataSummary()
  const id = useId()
  const t = useT()
  const usage = data ? storageUsage(data) : null
  const percent = usage ? usagePercent(usage) : 0

  return (
    <div className="flex flex-col gap-2 max-sm:px-4 max-sm:py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span id={`${id}-label`} className="text-sm leading-[22px] font-semibold max-sm:text-body max-sm:leading-[22px]">
          {usage ? t('profile:storage.titleWith', { label: usage.label }) : t('profile:storage.title')}
        </span>
        {usage ? <span className="text-label leading-5 font-normal text-ink-soft nums">{percent}%</span> : null}
      </div>
      <div
        role="progressbar"
        aria-labelledby={`${id}-label`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={usage ? percent : undefined}
        aria-valuetext={usage ? `${usage.label}, ${percent}%` : t('profile:storage.calculating')}
        aria-describedby={`${id}-hint`}
        className="h-3 w-full overflow-hidden rounded-full edge bg-sunk"
      >
        <div
          data-warn={usage?.warn || undefined}
          className={cn('h-full rounded-full transition-[width] duration-(--dur-morph) ease-out', usage?.warn ? 'bg-danger' : 'bg-ink')}
          // Đã có ảnh thì luôn thấy một vạch nhỏ, kể cả khi chưa tới 1%.
          style={{ width: usage ? `${usage.usedBytes > 0 ? Math.max(usage.ratio * 100, 1.5) : 0}%` : '0%' }}
        />
      </div>
      <p
        id={`${id}-hint`}
        className={cn(
          'flex items-start gap-1.5 text-label leading-5 max-sm:leading-[18px]',
          usage?.warn ? 'font-medium text-danger' : 'font-normal text-ink-soft',
        )}
      >
        {usage?.warn ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
        <span>
          {isPending
            ? t('profile:storage.calculatingHint')
            : !usage
              ? t('profile:storage.unreadable')
              : usage.full
                ? t('profile:storage.full')
                : usage.warn
                  ? t('profile:storage.warn', { percent })
                  : t('profile:storage.normal')}
        </span>
      </p>
    </div>
  )
}
