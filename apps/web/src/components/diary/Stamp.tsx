import { CircleCheck, CloudOff, LoaderCircle, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StampTone = 'saved' | 'saving' | 'pending' | 'error' | 'trash'

/**
 * Màu và nét viền theo nghĩa (DESIGN.md mục 5): đã lưu = sage, viền liền; đang lưu và chưa đồng bộ = viền nét đứt;
 * lỗi = đỏ; trong thùng rác = oải hương, viền nét đứt. Chữ là bản `-ink` trên nền `-soft`, đạt AA ở cả hai chế độ.
 */
const TONES: Record<StampTone, { className: string; icon: LucideIcon }> = {
  saved: { className: 'border-solid bg-sage-soft text-sage-ink', icon: CircleCheck },
  saving: { className: 'border-dashed bg-card text-muted-foreground', icon: LoaderCircle },
  pending: { className: 'border-dashed bg-card text-muted-foreground', icon: CloudOff },
  error: { className: 'border-solid bg-destructive-soft text-destructive', icon: TriangleAlert },
  trash: { className: 'border-dashed bg-lavender-soft text-lavender-ink', icon: Trash2 },
}

/**
 * Dấu trạng thái: một ô nhỏ có viền như con dấu đóng lên trang sổ, luôn có icon và chữ (không chỉ dựa vào màu).
 * Không có chuyển động: trạng thái lưu đổi hàng chục lần khi đang viết, và giao diện phải yên khi người dùng gõ.
 */
export function Stamp({ tone, children, className }: { tone: StampTone; children: ReactNode; className?: string }) {
  const { className: toneClass, icon: Icon } = TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-sm border-[1.5px] border-current px-2.5 text-label font-semibold',
        toneClass,
        className,
      )}
    >
      <Icon className={cn('size-3.5 shrink-0', tone === 'saving' && 'animate-spin')} aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}
