import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { scoreLabel, SCORES, type Score } from '@/lib/catalog'
import { durationLabel, minutesLeftToday, useNow, type DateString } from '@/lib/date'
import { cn } from '@/lib/utils'
import { weekdayDate } from './monthTimeline'
import { WritingNotebook } from './WritingNotebook'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring'

type TodayPromptProps = {
  date: DateString
  timeZone: string
  iconSetId: string
  flash: boolean
  onPick: (score: Score) => void
}

/** Hôm nay chưa ghi: chấm điểm ngay tại đây là xong trang, hoặc mở trang hôm nay để viết. */
export function TodayPrompt({ date, timeZone, iconSetId, flash, onPick }: TodayPromptProps) {
  const left = minutesLeftToday(timeZone, useNow())
  const day = weekdayDate(date)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-[26px] gap-y-[18px] rounded-[18px] border-(length:--stroke-width) border-dashed border-line bg-card px-4 py-4 transition-[outline-color] md:px-6 md:py-[22px]',
        flash && 'outline-3 outline-offset-4 outline-score-5',
      )}
    >
      <WritingNotebook className="h-[66px] w-[88px] md:h-[99px] md:w-[132px]" />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-3 md:flex-[1_1_300px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-label leading-5 text-muted-foreground tabular-nums">
            {day} · còn {durationLabel(left)} để ghi
          </span>
          <span className="font-heading text-xl leading-7 font-bold">Hôm nay bạn chưa viết</span>
          <span className="text-sm leading-[22px] text-muted-foreground">
            Chấm điểm là xong trang hôm nay. Viết thêm lúc nào cũng được.
          </span>
        </div>
        <div role="group" aria-label="Chấm điểm cho hôm nay" className="flex flex-wrap gap-2">
          {SCORES.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={`Chấm điểm ${k}, ${scoreLabel(iconSetId, k)} cho hôm nay`}
              onClick={() => onPick(k)}
              className={cn(
                'inline-flex size-12 cursor-pointer items-center justify-center rounded-[14px] border-(length:--stroke-width) border-border bg-background transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-line hover:bg-pressed active:translate-y-px md:size-14',
                focusRing,
              )}
            >
              <MoodMark iconSetId={iconSetId} score={k} size={36} variant="plain" />
            </button>
          ))}
        </div>
        <Link to="/today" className={cn('link-underline self-start text-sm font-semibold', focusRing)}>
          Mở trang hôm nay để viết
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
  return (
    <div className="flex animate-in flex-wrap items-center gap-x-3.5 gap-y-3 rounded-[16px] border-(length:--stroke-width) border-line bg-card px-4 py-3 shadow-ink-sm duration-300 fade-in-0">
      <span
        role="img"
        aria-label={`Điểm ${score}, ${scoreLabel(iconSetId, score)}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-(length:--stroke-width) border-line bg-background"
      >
        <MoodMark iconSetId={iconSetId} score={score} size={32} />
      </span>
      <span role="status" className="flex flex-[1_1_180px] flex-col">
        <span className="text-body leading-[22px] font-semibold">Đã ghi cho hôm nay</span>
        <span className="text-label leading-5 text-muted-foreground tabular-nums">{meta}</span>
      </span>
      <Link
        to="/today"
        className={cn('press inline-flex h-9 items-center rounded-[10px] border-(length:--stroke-width) border-line px-3 text-label font-semibold', focusRing)}
      >
        Viết thêm
      </Link>
      <button type="button" onClick={onUndo} className={cn('link-underline cursor-pointer py-1 text-label font-semibold', focusRing)}>
        Hoàn tác
      </button>
    </div>
  )
}
