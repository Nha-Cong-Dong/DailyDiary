import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Score } from '@/lib/catalog'
import { ScoreIcon } from './ScoreIcon'

type MoodMarkProps = {
  iconSetId: string
  score: Score
  subIcon?: string | null
  /** Cạnh main icon, px. Sub icon = main × --sub-icon-ratio. */
  size?: number
  /** `badge`: sub icon trong vòng tròn có viền (thẻ, trang chi tiết). `plain`: chỉ emoji (ô lịch). */
  variant?: 'badge' | 'plain'
  className?: string
  /** Thêm class/style cho sub icon (ví dụ animation hiện ra trên landing). */
  subClassName?: string
  subStyle?: CSSProperties
}

/** Main icon kèm sub icon nhỏ ở góc dưới phải. */
export function MoodMark({
  iconSetId,
  score,
  subIcon,
  size = 56,
  variant = 'badge',
  className,
  subClassName,
  subStyle,
}: MoodMarkProps) {
  return (
    <span
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: size, height: size, '--mark': `${size}px` } as CSSProperties}
    >
      <ScoreIcon iconSetId={iconSetId} score={score} size={size} />
      {subIcon ? (
        <span
          aria-hidden="true"
          style={subStyle}
          className={cn(
            'absolute flex items-center justify-center leading-none',
            '-right-[calc(var(--mark)*var(--sub-icon-ratio)*0.35)] -bottom-[calc(var(--mark)*var(--sub-icon-ratio)*0.2)]',
            'size-[calc(var(--mark)*var(--sub-icon-ratio))]',
            variant === 'badge'
              ? 'rounded-full border-(length:--stroke-width) border-line bg-card text-[calc(var(--mark)*var(--sub-icon-ratio)*0.62)]'
              : 'text-[calc(var(--mark)*var(--sub-icon-ratio)*0.85)]',
            subClassName,
          )}
        >
          {subIcon}
        </span>
      ) : null}
    </span>
  )
}
