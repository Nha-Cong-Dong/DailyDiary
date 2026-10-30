import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Thẻ "tờ giấy dán lên trang" (DESIGN.md mục 4): nền thẻ, viền mực 1.5px, bo radius-lg, bóng cứng.
 * - `raised` (mặc định): thẻ đứng riêng, bóng 4px.
 * - `low`: thẻ nhỏ, chip lớn, bóng 2px.
 * - `flat`: thẻ trong danh sách dài, không bóng để danh sách không nặng.
 * `interactive`: cả thẻ bấm được (thường dùng với `asChild` bọc Link); nhấc khi di chuột, ấn dịch đúng độ lệch bóng.
 */
const cardVariants = cva('rounded-lg border-(length:--stroke-width) border-line bg-card text-card-foreground', {
  variants: {
    elevation: { raised: 'shadow-ink [--lift:4px]', low: 'shadow-ink-sm', flat: '' },
    interactive: { true: 'lift cursor-pointer', false: '' },
  },
  defaultVariants: { elevation: 'raised', interactive: false },
})

export function Card({
  className,
  elevation,
  interactive,
  asChild = false,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof cardVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return <Comp data-slot="card" className={cn(cardVariants({ elevation, interactive }), className)} {...props} />
}
