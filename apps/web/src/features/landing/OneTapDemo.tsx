import { CircleCheck, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MoodMark } from '@/components/diary/MoodMark'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { scoreLabel, type Score } from '@/lib/catalog'
import { dayOfMonth, shortDateLabel, weekdayShort, type DateString } from '@/lib/date'
import { cn } from '@/lib/utils'
import { DEMO_ICON_SET, DEMO_TODAY_DATE, demoWeek, type WeekDay } from './demoData'
import { useT } from '@/lib/i18n'

type Props = {
  iconSetId: string
  today: DateString
  /** 7 ngày tới hôm nay, cũ nhất trước. */
  week: WeekDay[]
  selected: DateString
  onSelect: (date: DateString) => void
  /** Điểm của ngày đang chọn (đã đăng nhập: điểm thật, kể cả điểm đang gửi). */
  value: Score | null
  onPick: (score: Score) => void
  /** Đã đăng nhập: câu trạng thái nói về việc lưu thật. */
  signed?: boolean
  /** Đang tải trang của ngày đang chọn: chưa cho chấm để không ghi đè. */
  loading?: boolean
  saving?: boolean
  error?: string | null
  footer?: ReactNode
}

/** "Chủ nhật 18/10" → "Chủ nhật, 18/10". */
function dayLabel(date: DateString): string {
  return shortDateLabel(date).replace(/ (\d+\/\d+)$/, ', $1')
}

/**
 * Thẻ "Một chạm" (B5 · F1): chọn một ngày trong 7 ngày rồi chấm điểm cho ngày đó; ngày còn trống thành ghi bù.
 * Khách dùng <OneTapGuest> (dữ liệu mẫu, chỉ đổi tại chỗ); đã đăng nhập, routes/HomePage lưu thật cho ngày đang chọn.
 */
export function OneTapDemo({
  iconSetId,
  today,
  week,
  selected,
  onSelect,
  value,
  onPick,
  signed = false,
  loading = false,
  saving = false,
  error = null,
  footer,
}: Props) {
  const t = useT()
  // Ngày đã đổi điểm ngay tại đây (để nói "Đã đổi điểm" thay vì chỉ đọc lại điểm cũ).
  const [changed, setChanged] = useState<ReadonlySet<DateString>>(new Set())
  const isToday = selected === today
  const info = week.find((d) => d.date === selected)
  const backfill = !isToday && (!info?.score || info.backfilled)
  const dm = t('landing:date.dm', { day: selected.slice(8, 10).replace(/^0/, ''), month: selected.slice(5, 7).replace(/^0/, '') })
  const label = value ? scoreLabel(iconSetId, value) : ''

  let status = ''
  if (error) status = error
  else if (value) {
    const vars = { dm, value, label }
    if (isToday) status = signed ? (saving ? t('landing:oneTap.saving') : t('landing:oneTap.savedToday', vars)) : t('landing:oneTap.recordedToday', vars)
    else if (saving) status = t('landing:oneTap.saving')
    else if (backfill) status = t('landing:oneTap.backfilled', vars)
    else status = changed.has(selected) ? t('landing:oneTap.changed', vars) : t('landing:oneTap.day', vars)
  }

  const pick = (score: Score) => {
    setChanged((s) => new Set(s).add(selected))
    onPick(score)
  }

  return (
    <div className="lift flex w-full max-w-[520px] flex-col gap-5 rounded-lg border-2 border-stroke bg-card p-5 shadow-md sm:p-6">
      <fieldset disabled={loading} className="flex min-w-0 flex-col gap-4">
        <legend className="mb-4 font-heading text-[18px] leading-[26px] font-semibold">
          {isToday ? t('landing:oneTap.legendToday') : t('landing:oneTap.legendDay', { day: dayLabel(selected) })}
        </legend>
        <ScorePicker iconSetId={iconSetId} value={value} onChange={pick} caption="none" />
      </fieldset>
      {status ? (
        <p role="status" className="flex animate-rise flex-wrap items-center gap-2 text-body text-ink-soft">
          {backfill && value && !error ? (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-stroke bg-peach px-2 py-px text-label font-bold text-on-accent">
              <RotateCcw className="size-[11px]" strokeWidth={2.6} aria-hidden="true" />
              {t('landing:oneTap.badge')}
            </span>
          ) : null}
          <CircleCheck className="size-[18px] shrink-0 text-ink" aria-hidden="true" />
          <span>{status}</span>
        </p>
      ) : (
        <p className="text-body text-ink-soft">
          {isToday ? t('landing:oneTap.hintToday') : t('landing:oneTap.hintEmpty')}
        </p>
      )}
      <div
        role="group"
        aria-label={t('landing:oneTap.pickDay')}
        className="grid grid-cols-7 gap-1.5 bg-[radial-gradient(circle,var(--color-line-soft)_0,var(--color-line-soft)_2.2px,transparent_2.6px)] bg-[length:12px_6px] bg-repeat-x pt-[18px]"
      >
        {week.map((d) => {
          const day = d.date === today
          const on = d.date === selected
          const score = on ? value : d.score
          const bu = !day && (d.backfilled || (!d.score && changed.has(d.date)))
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={on}
              data-date={d.date}
              aria-label={`${day ? t('landing:oneTap.cellToday') : ''}${shortDateLabel(d.date)}${score ? t('landing:oneTap.cellScore', { score }) : t('landing:oneTap.cellEmpty')}${bu ? t('landing:oneTap.cellBackfilled') : ''}`}
              onClick={() => onSelect(d.date)}
              className={cn(
                'pick flex min-h-[76px] w-full cursor-pointer flex-col items-center justify-between gap-1.5 rounded-[10px] border-[1.5px] py-2.5 text-ink',
                day ? 'border-stroke bg-peach text-on-accent' : on ? 'border-stroke bg-lavender-soft' : 'border-line-soft pointer-fine:hover:border-stroke',
                on && 'shadow-sm',
              )}
            >
              <span aria-hidden="true" className={cn('text-label', day ? 'text-on-accent' : 'text-ink-soft')}>
                {weekdayShort(d.date)}
              </span>
              <span aria-hidden="true" className="flex size-8 items-center justify-center">
                {score ? (
                  <MoodMark
                    key={score}
                    iconSetId={iconSetId}
                    score={score}
                    subIcon={day ? null : d.sub}
                    size={32}
                    variant="plain"
                    className="animate-pop"
                  />
                ) : (
                  <span className={cn('size-[26px] rounded-full border-[1.5px] border-dashed', day ? 'border-on-accent' : 'border-ink-soft')} />
                )}
              </span>
              <span aria-hidden="true" className={cn('nums text-label', day || on ? 'font-bold' : 'font-medium')}>
                {dayOfMonth(d.date)}
              </span>
            </button>
          )
        })}
      </div>
      {!isToday ? (
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="link-underline animate-rise cursor-pointer self-start py-0.5 text-body font-semibold text-ink"
        >
          {t('landing:oneTap.backToToday')}
        </button>
      ) : null}
      {footer}
    </div>
  )
}

/** Bản cho khách: tuần mẫu 12–18/10/2026, chấm điểm chỉ đổi tại chỗ, không gọi API. */
export function OneTapGuest() {
  const [week] = useState(demoWeek)
  const [selected, setSelected] = useState<DateString>(DEMO_TODAY_DATE)
  const [marks, setMarks] = useState<Record<DateString, Score>>({})
  const value = marks[selected] ?? week.find((d) => d.date === selected)?.score ?? null
  return (
    <OneTapDemo
      iconSetId={DEMO_ICON_SET}
      today={DEMO_TODAY_DATE}
      week={week.map((d) => ({ ...d, score: marks[d.date] ?? d.score, backfilled: d.backfilled || (!d.score && marks[d.date] !== undefined) }))}
      selected={selected}
      onSelect={setSelected}
      value={value}
      onPick={(score) => setMarks((m) => ({ ...m, [selected]: score }))}
    />
  )
}
