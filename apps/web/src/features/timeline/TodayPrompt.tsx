import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { scoreLabel, SCORES, type Score } from '@/lib/catalog'
import { durationLabel, minutesLeftToday, useNow, type DateString } from '@/lib/date'
import { cn } from '@/lib/utils'
import { weekdayDate } from './monthTimeline'
import { WritingNotebook } from './WritingNotebook'
import { useT } from '@/lib/i18n'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

type TodayPromptProps = {
  date: DateString
  timeZone: string
  iconSetId: string
  flash: boolean
  onPick: (score: Score) => void
}

/** Hôm nay chưa ghi: chấm điểm ngay tại đây là xong trang, hoặc mở trang hôm nay để viết. */
export function TodayPrompt({ date, timeZone, iconSetId, flash, onPick }: TodayPromptProps) {
  const t = useT()
  const left = minutesLeftToday(timeZone, useNow())
  const day = weekdayDate(date)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-[26px] gap-y-[18px] rounded-[18px] border-[1.5px] border-dashed border-stroke bg-card px-4 py-4 transition-[outline-color] duration-(--dur-fast) ease-out md:px-6 md:py-[22px]',
        flash && 'outline-3 outline-offset-4 outline-peach',
      )}
    >
      <WritingNotebook className="h-[66px] w-[88px] md:h-[99px] md:w-[132px]" />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-3 md:flex-[1_1_300px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] leading-5 text-ink-soft nums">
            {t('timeline:prompt.timeLeft', { day, left: durationLabel(left) })}
          </span>
          <span className="font-heading text-xl leading-7 font-bold">{t('timeline:prompt.title')}</span>
          <span className="text-sm leading-[22px] text-ink-soft">
            {t('timeline:prompt.hint')}
          </span>
        </div>
        <div role="group" aria-label={t('timeline:prompt.group')} className="flex flex-wrap gap-2">
          {SCORES.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={t('timeline:prompt.rate', { score: k, label: scoreLabel(iconSetId, k) })}
              onClick={() => onPick(k)}
              className={cn(
                // Canvas .j-qp: di chuột nhấc 2px, viền mực, nền pressed; ấn lún 1px.
                'inline-flex size-12 cursor-pointer items-center justify-center rounded-[14px] border-[1.5px] border-line-soft bg-paper transition-[transform,background-color,border-color] duration-200 ease-out select-none pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:border-stroke pointer-fine:hover:bg-pressed active:translate-y-px motion-reduce:transform-none md:size-14',
                focusRing,
              )}
            >
              <MoodMark iconSetId={iconSetId} score={k} size={36} variant="plain" />
            </button>
          ))}
        </div>
        <Link to="/today" className={cn('link-underline self-start text-sm font-semibold', focusRing)}>
          {t('timeline:prompt.open')}
        </Link>
      </div>
    </div>
  )
}

type JustScoredProps = {
  score: Score
  meta: string
  iconSetId: string
  onUndo: () => void
}

/** Vừa chấm điểm nhanh cho hôm nay: báo đã ghi, cho viết thêm hoặc hoàn tác. */
export function JustScored({ score, meta, iconSetId, onUndo }: JustScoredProps) {
  const t = useT()
  return (
    <div className="flex animate-fade flex-wrap items-center gap-x-3.5 gap-y-3 rounded-[16px] border-[1.5px] border-stroke bg-card px-4 py-3 shadow-sm">
      <span
        role="img"
        aria-label={t('timeline:meta.scoreAria', { score, label: scoreLabel(iconSetId, score) })}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper"
      >
        <MoodMark iconSetId={iconSetId} score={score} size={32} />
      </span>
      <span role="status" className="flex flex-[1_1_180px] flex-col">
        <span className="text-body font-semibold">{t('timeline:prompt.saved')}</span>
        <span className="text-[13px] leading-5 text-ink-soft nums">{meta}</span>
      </span>
      <Link
        to="/today"
        className={cn('press inline-flex h-9 items-center rounded-[10px] border-[1.5px] border-stroke px-3 text-[13px] font-semibold', focusRing)}
      >
        {t('timeline:prompt.writeMore')}
      </Link>
      <button type="button" onClick={onUndo} className={cn('link-underline cursor-pointer py-1 text-[13px] font-semibold', focusRing)}>
        {t('timeline:prompt.undo')}
      </button>
    </div>
  )
}
