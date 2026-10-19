import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type KeywordChipProps = {
  children: string
  /** Chip đang dùng làm bộ lọc (tìm kiếm, dòng thời gian). */
  active?: boolean
  /** Có nút bỏ từ khóa (màn viết nhật ký). */
  onRemove?: () => void
  size?: 'sm' | 'md'
  className?: string
}

/** Chip từ khóa: viền mực, bo tròn. */
export function KeywordChip({ children, active, onRemove, size = 'md', className }: KeywordChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border-[1.5px] font-medium',
        size === 'md' ? 'text-sm leading-[22px]' : 'text-[13px] leading-5',
        onRemove ? 'py-0.5 pr-1 pl-3.5' : size === 'md' ? 'px-3.5 py-[5px]' : 'px-2.5 py-0.5',
        active ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-line',
        className,
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Bỏ từ khóa ${children}`}
          onClick={onRemove}
          className="ml-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-secondary focus-visible:outline-3 focus-visible:outline-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

/** Nút "+ Thêm từ khóa" viền nét đứt, đi kèm hàng chip. */
export function AddKeywordButton({ className, children = '+ Thêm từ khóa', ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'h-[34px] cursor-pointer rounded-full border-[1.5px] border-dashed border-line px-3.5 text-sm font-medium hover:bg-secondary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
