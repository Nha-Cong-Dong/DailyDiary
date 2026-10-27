import { TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import { storageUsage, useDataSummary, usagePercent } from '@/lib/usage'
import { cn } from '@/lib/utils'

/**
 * Dung lượng ảnh trong mục Nhật ký của Hồ sơ (mục 4.5 của đặc tả: hạn mức theo cấp tài khoản, cảnh báo khi đạt
 * `warn_ratio`). Số liệu từ GET /me/data-summary: tính cả ảnh của trang trong thùng rác (ảnh còn trong kho tới khi
 * dọn), không tính ảnh đại diện.
 */
export function StorageUsage() {
  const { data, isPending } = useDataSummary()
  const id = useId()
  const usage = data ? storageUsage(data) : null
  const percent = usage ? usagePercent(usage) : 0

  return (
    <div className="flex flex-col gap-2 max-sm:px-4 max-sm:py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span id={`${id}-label`} className="text-sm leading-[22px] font-semibold max-sm:text-[15px]">
          Dung lượng ảnh{usage ? `: ${usage.label}` : ''}
        </span>
        {usage ? <span className="text-[13px] leading-5 text-muted-foreground tabular-nums">{percent}%</span> : null}
      </div>
      <div
        role="progressbar"
        aria-labelledby={`${id}-label`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={usage ? percent : undefined}
        aria-valuetext={usage ? `${usage.label}, ${percent}%` : 'Đang tính'}
        aria-describedby={`${id}-hint`}
        className="h-3 w-full overflow-hidden rounded-full border-[1.5px] border-line bg-muted"
      >
        <div
          data-warn={usage?.warn || undefined}
          className={cn('h-full rounded-full transition-[width] duration-500', usage?.warn ? 'bg-destructive' : 'bg-foreground')}
          // Đã có ảnh thì luôn thấy một vạch nhỏ, kể cả khi chưa tới 1%.
          style={{ width: usage ? `${usage.usedBytes > 0 ? Math.max(usage.ratio * 100, 1.5) : 0}%` : '0%' }}
        />
      </div>
      <p
        id={`${id}-hint`}
        className={cn(
          'flex items-start gap-1.5 text-[13px] leading-5 max-sm:text-xs max-sm:leading-[18px]',
          usage?.warn ? 'font-medium text-destructive' : 'text-muted-foreground',
        )}
      >
        {usage?.warn ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
        <span>
          {isPending
            ? 'Đang tính dung lượng…'
            : !usage
              ? 'Chưa đọc được dung lượng. Kiểm tra kết nối rồi tải lại trang.'
              : usage.full
                ? 'Đã hết dung lượng ảnh: ảnh mới sẽ không tải lên được. Bỏ bớt ảnh trong các trang cũ để có thêm chỗ.'
                : usage.warn
                  ? `Đã dùng ${percent}% dung lượng ảnh. Bỏ bớt ảnh trong các trang cũ để còn chỗ cho ảnh mới.`
                  : 'Ảnh đã nén của mọi trang, kể cả trang trong thùng rác. Ảnh đại diện không tính.'}
        </span>
      </p>
    </div>
  )
}
