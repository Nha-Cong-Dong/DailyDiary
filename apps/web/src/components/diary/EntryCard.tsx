import { flagHex, type Score } from '@/lib/catalog'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { KeywordChip } from './KeywordChip'
import { MoodMark } from './MoodMark'

type EntryCardProps = {
  dateLabel: string
  iconSetId: string
  score: Score
  subIcon?: string | null
  flagColor?: string | null
  title?: string
  excerpt?: string
  keywords?: string[]
  photoCount?: number
  /** Dòng nhỏ ở góc phải, ví dụ "Tạo 21:04 · Sửa 21:32". */
  meta?: string
  className?: string
}

/** Thẻ nhật ký "Sổ dán": dải cờ hiệu, main icon nổi trên mép, chữ trên dòng kẻ vở. */
export function EntryCard({
  dateLabel,
  iconSetId,
  score,
  subIcon,
  flagColor,
  title,
  excerpt,
  keywords = [],
  photoCount = 0,
  meta,
  className,
}: EntryCardProps) {
  const dark = useDarkMode()
  return (
    <article className={cn('flex flex-col overflow-hidden rounded-lg border-[1.5px] border-line bg-card shadow-ink', className)}>
      <div
        className="h-[72px] border-b-[1.5px] border-line bg-secondary"
        style={flagColor ? { backgroundColor: flagHex(flagColor, dark) } : undefined}
      />
      <div className="flex flex-col gap-3 px-[22px] pb-6">
        <div className="-mt-9 flex items-end justify-between gap-3">
          <span className="flex size-[72px] items-center justify-center rounded-full border-[1.5px] border-line bg-card">
            <MoodMark iconSetId={iconSetId} score={score} subIcon={subIcon} size={52} />
          </span>
          {meta ? <span className="text-sm leading-[22px] font-medium text-muted-foreground tabular-nums">{meta}</span> : null}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm leading-[22px] text-muted-foreground">{dateLabel}</span>
          {title ? <h3 className="text-heading font-semibold">{title}</h3> : null}
        </div>
        {excerpt ? <p className="ruled text-base leading-[26px]">{excerpt}</p> : null}
        {keywords.length || photoCount ? (
          <div className="flex flex-wrap items-center gap-2">
            {keywords.map((k) => (
              <KeywordChip key={k} size="sm">
                {k}
              </KeywordChip>
            ))}
            {photoCount ? <span className="text-[13px] leading-5 text-muted-foreground">· {photoCount} ảnh</span> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
