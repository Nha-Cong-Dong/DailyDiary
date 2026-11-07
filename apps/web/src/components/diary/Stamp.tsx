import { CircleCheck, CloudOff, LoaderCircle, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StampKind = 'saved' | 'saving' | 'unsynced' | 'error' | 'trash'

const STYLES: Record<StampKind, { icon: LucideIcon; className: string }> = {
  saved: { icon: CircleCheck, className: 'border-solid border-sage-ink bg-sage-soft text-sage-ink' },
  saving: { icon: LoaderCircle, className: 'border-dashed border-ink-soft bg-card text-ink-soft' },
  unsynced: { icon: CloudOff, className: 'border-dashed border-ink-soft bg-card text-ink-soft' },
  error: { icon: TriangleAlert, className: 'border-solid border-danger bg-danger-soft text-danger' },
  trash: { icon: Trash2, className: 'border-dashed border-lavender-ink bg-lavender-soft text-lavender-ink' },
}

/** Chữ mặc định của từng loại dấu (B11-Components · Stamp). */
const STAMP_LABELS: Record<StampKind, string> = {
  saved: 'Đã lưu',
  saving: 'Đang lưu…',
  unsynced: 'Chưa đồng bộ',
  error: 'Chưa lưu được',
  trash: 'Trong thùng rác',
}

type StampProps = {
  kind: StampKind
  /** Chữ trên dấu, vd. "Đã lưu lúc 21:32", "Trong thùng rác, còn 23 ngày". Mặc định STAMP_LABELS[kind]. */
  children?: ReactNode
  /** Đóng dấu một nhịp 220ms khi hiện (vd. vừa lưu xong). Mặc định không chuyển động. */
  animate?: boolean
  className?: string
}

/**
 * Dấu trạng thái (B11-Components · Stamp): Đã lưu / Đang lưu / Chưa đồng bộ / Chưa lưu được / Trong thùng rác.
 * Luôn có icon và chữ, không dùng chấm màu đơn lẻ. Không chuyển động, trừ vòng chờ của Đang lưu.
 */
export function Stamp({ kind, children, animate = false, className }: StampProps) {
  const { icon: Icon, className: tone } = STYLES[kind]
  return (
    <span
      data-slot="stamp"
      data-kind={kind}
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-sm border-[1.5px] px-2.5 text-label whitespace-nowrap',
        tone,
        animate && 'animate-stamp',
        className,
      )}
    >
      <Icon
        className={cn('size-4 shrink-0', kind === 'saving' && 'animate-spin')}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <span>{children ?? STAMP_LABELS[kind]}</span>
    </span>
  )
}
