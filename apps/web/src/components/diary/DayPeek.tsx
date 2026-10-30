import { RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import { scoreLabel, type Score } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { MoodMark } from './MoodMark'

export type PeekEntry = {
  score: Score
  sub_icon: string | null
  title: string | null
  content: string | null
}

type DayPeekProps = {
  date: string
  entry: PeekEntry | null
  iconSetId: string
  /** Dòng phụ dưới điểm (vd. "Viết lúc 21:04"); bỏ trống thì chỉ hiện điểm. */
  meta?: string
  /** Ngày đã qua mà chưa ghi thì có nút Ghi bù; hôm nay thì mở trang hôm nay; ngày chưa tới thì không có nút. */
  state: 'past' | 'today' | 'future'
  onNavigate?: () => void
}

const action =
  'press inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border-(length:--stroke-width) border-primary bg-primary text-body font-semibold text-primary-foreground focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring'

/** Nội dung "xem nhanh một ngày" trong bảng trượt trên điện thoại (thiết kế B10 · Dòng thời gian, Year in Pixels). */
export function DayPeek({ date, entry, iconSetId, meta, state, onNavigate }: DayPeekProps) {
  if (entry) {
    const label = scoreLabel(iconSetId, entry.score)
    return (
      <>
        <div className="flex items-start gap-3.5">
          <span
            role="img"
            aria-label={`Điểm ${entry.score}, ${label}`}
            className="flex size-14 shrink-0 items-center justify-center rounded-full border-(length:--stroke-width) border-line bg-background"
          >
            <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={40} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-label leading-5 text-muted-foreground">
              Điểm {entry.score} · {label}
              {meta ? ` · ${meta}` : ''}
            </span>
            <span className={cn('font-heading text-lg leading-[26px] font-bold', !entry.title && 'text-muted-foreground')}>
              {entry.title ?? 'Chỉ chấm điểm'}
            </span>
            {entry.content ? (
              <span className="line-clamp-2 text-sm leading-[22px] text-muted-foreground">{entry.content}</span>
            ) : null}
          </span>
        </div>
        <Link to={`/day/${date}`} onClick={onNavigate} className={action}>
          Mở trang ngày
        </Link>
      </>
    )
  }
  return (
    <>
      <p className="text-body leading-6 text-muted-foreground">
        {state === 'future' ? 'Ngày này chưa tới.' : state === 'today' ? 'Hôm nay chưa có trang.' : 'Ngày này chưa được ghi.'}
      </p>
      {state === 'past' ? (
        <Link to={`/day/${date}/backfill`} onClick={onNavigate} className={action}>
          <RotateCcw className="size-4" strokeWidth={2.4} aria-hidden="true" />
          Ghi bù ngày này
        </Link>
      ) : state === 'today' ? (
        <Link to="/today" onClick={onNavigate} className={action}>
          Viết trang hôm nay
        </Link>
      ) : null}
    </>
  )
}
