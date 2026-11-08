import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type KeywordChipProps = {
  children: string
  /** Chip đang dùng làm bộ lọc (tìm kiếm, dòng thời gian): nền lavender-soft (đang chọn). */
  active?: boolean
  /** Có nút bỏ từ khóa (màn viết nhật ký). */
  onRemove?: () => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Chip từ khóa (B11-DayCard): nhãn giấy bo tròn, viền mực, lỗ xâu dây nhỏ bên trái; chữ label.
 * Bấm được thì bọc trong <button> hoặc dùng `KeywordChipButton`.
 */
export function KeywordChip({ children, active, onRemove, size = 'md', className }: KeywordChipProps) {
  const t = useT()
  return (
    <span
      className={cn(
        'relative inline-flex items-center rounded-full border-[1.5px] border-stroke font-semibold text-ink',
        size === 'md' ? 'min-h-8 text-label' : 'min-h-6 text-label leading-5',
        onRemove ? 'py-0.5 pr-1 pl-[22px]' : 'py-0.5 pr-2.5 pl-[22px]',
        active ? 'bg-lavender-soft' : 'bg-card',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-[7px] size-2 -translate-y-1/2 rounded-full border-[1.5px] border-stroke bg-paper"
      />
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label={t('components:keyword.remove', { keyword: children })}
          onClick={onRemove}
          className="row-press ml-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-focus"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

/** Chip từ khóa bấm được (lọc theo từ khóa): vùng chạm cao 44px bao quanh chip. */
export function KeywordChipButton({
  children,
  active,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & { children: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'press inline-flex min-h-11 cursor-pointer items-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
      {...props}
    >
      <KeywordChip active={active}>{children}</KeywordChip>
    </button>
  )
}

/** Nút "+ Thêm từ khóa" viền nét đứt, đi kèm hàng chip. */
export function AddKeywordButton({ className, children, ...props }: ComponentProps<'button'>) {
  const t = useT()
  return (
    <button
      type="button"
      className={cn(
        'row-press h-9 cursor-pointer rounded-full border-[1.5px] border-dashed border-stroke px-3.5 text-label focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
      {...props}
    >
      {children ?? t('components:keyword.add')}
    </button>
  )
}
