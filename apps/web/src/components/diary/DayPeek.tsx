import { RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import { scoreLabel, type Score } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { DayMorph } from './DayMorph'
import { MoodMark } from './MoodMark'
import { useT } from '@/lib/i18n'

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
  /**
   * Ngày `YYYY-MM-DD`: bọc vòng icon trong <DayMorph> để nối sang trang ngày khi bấm "Mở trang ngày". Nơi gọi tắt
   * DayMorph của cùng ngày ở chỗ khác trên màn (không được có hai phần tử cùng tên).
   */
  morphDate?: string
}

const action =
  'press-solid inline-flex h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-primary bg-primary text-body font-semibold text-on-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

/** Nội dung "xem nhanh một ngày" trong bảng trượt trên điện thoại (thiết kế B10 · Dòng thời gian, Year in Pixels). */
export function DayPeek({ date, entry, iconSetId, meta, state, onNavigate, morphDate }: DayPeekProps) {
  const t = useT()
  if (entry) {
    const label = scoreLabel(iconSetId, entry.score)
    const ring = (
      <span
        role="img"
        aria-label={t('components:score.aria', { score: entry.score, label })}
        className="flex size-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper"
      >
        <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={40} />
      </span>
    )
    return (
      <>
        <div className="flex items-start gap-3.5">
          {morphDate ? <DayMorph date={morphDate}>{ring}</DayMorph> : ring}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-label text-ink-soft">
              {t('components:score.line', { score: entry.score, label })}
              {meta ? ` · ${meta}` : ''}
            </span>
            <span className={cn('text-[18px] leading-[26px] font-semibold [font-variation-settings:"FLAR"_60]', !entry.title && 'text-ink-soft')}>
              {entry.title ?? t('components:dayPeek.scoreOnly')}
            </span>
            {entry.content ? (
              <span className="line-clamp-2 text-body text-ink-soft">{entry.content}</span>
            ) : null}
          </span>
        </div>
        <Link to={`/day/${date}`} onClick={onNavigate} className={action}>
          {t('components:dayPeek.openDay')}
        </Link>
      </>
    )
  }
  return (
    <>
      <p className="text-body text-ink-soft">
        {state === 'future'
          ? t('components:dayPeek.future')
          : state === 'today'
            ? t('components:dayPeek.todayEmpty')
            : t('components:dayPeek.pastEmpty')}
      </p>
      {state === 'past' ? (
        <Link to={`/day/${date}/backfill`} onClick={onNavigate} className={action}>
          <RotateCcw className="size-4" strokeWidth={2.4} aria-hidden="true" />
          {t('components:dayPeek.backfill')}
        </Link>
      ) : state === 'today' ? (
        <Link to="/today" onClick={onNavigate} className={action}>
          {t('components:dayPeek.writeToday')}
        </Link>
      ) : null}
    </>
  )
}
