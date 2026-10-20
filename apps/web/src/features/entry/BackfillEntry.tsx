import { CircleCheck, History } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { dayOfMonth, isValidDate, longDateLabel, todayIn, useNow, weekdayShort, type DateString } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { useProfile } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { applyDraft, dateTimeLabel, dayMonth, daysBetween, draftOf } from './entryDraft'
import { BackLink, ExtraFields, Notice } from './components/EntryFormParts'
import { useWriteDay } from './localDays'
import { useDay } from './useDay'

type Extras = { sub_icon: string | null; flag_color: string | null; title: string; content: string }
const NO_EXTRAS: Extras = { sub_icon: null, flag_color: null, title: '', content: '' }
const sameExtras = (a: Extras, b: Extras) =>
  a.sub_icon === b.sub_icon && a.flag_color === b.flag_color && a.title === b.title && a.content === b.content

function BackfillChip() {
  return (
    <span className="inline-flex animate-stamp items-center gap-1 rounded-full border-[1.5px] border-line bg-score-5 px-2 text-[11px] leading-[18px] font-bold tracking-[.02em] text-[#272218]">
      <History className="size-[11px]" strokeWidth={2.6} aria-hidden="true" />
      Ghi bù
    </span>
  )
}

/** Thẻ xem trước: trang ghi bù sẽ hiện thế nào trong Dòng thời gian. */
function TimelinePreview({ record, extras }: { record: DemoEntry; extras: Extras }) {
  const { iconSetId, timeZone } = useProfile()
  const dark = useDarkMode()
  const title = extras.title.trim()
  const body = extras.content.trim()
  return (
    <section aria-labelledby="bf-preview" className="flex animate-rise flex-col gap-3 [animation-delay:.12s]">
      <h2 id="bf-preview" className="font-sans text-[15px] leading-[22px] font-semibold">
        Trong Dòng thời gian sẽ hiện như sau
      </h2>
      <div className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3.5">
        <div className="flex flex-col items-center gap-0.5 pt-3.5">
          <span className="font-heading text-2xl leading-7 font-bold tabular-nums">{dayOfMonth(record.entry_date)}</span>
          <span className="text-xs leading-4 text-muted-foreground">{weekdayShort(record.entry_date)}</span>
        </div>
        <div className="overflow-hidden rounded-[18px] border-[1.5px] border-line bg-card shadow-ink-sm">
          <span
            aria-hidden="true"
            className={cn('block transition-[height] duration-250', extras.flag_color ? 'h-2.5 border-b-[1.5px] border-line' : 'h-0')}
            style={extras.flag_color ? { backgroundColor: flagHex(extras.flag_color, dark) } : undefined}
          />
          <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 py-4 pr-5 pl-4">
            <span
              role="img"
              aria-label={`Điểm ${record.score}, ${scoreLabel(iconSetId, record.score)}`}
              className="flex size-14 items-center justify-center rounded-full border-[1.5px] border-line bg-background"
            >
              <MoodMark iconSetId={iconSetId} score={record.score} subIcon={extras.sub_icon} size={42} />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-5 text-muted-foreground tabular-nums">
                <BackfillChip />
                Điểm {record.score} · {scoreLabel(iconSetId, record.score)} · Ghi bù lúc {dateTimeLabel(timeZone, record.created_at, false)}
              </span>
              <span className={cn('font-heading text-[19px] leading-7 font-bold', !title && 'text-muted-foreground')}>
                {title || 'Chỉ chấm điểm'}
              </span>
              {body ? <span className="line-clamp-2 text-[15px] leading-6 text-muted-foreground">{body}</span> : null}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function BackfillForm({ date, today }: { date: DateString; today: DateString }) {
  const { timeZone, iconSetId } = useProfile()
  const writeDay = useWriteDay()
  const [record, setRecord] = useState<DemoEntry | null>(null)
  const [saved, setSaved] = useState<Extras>(NO_EXTRAS)
  const [extras, setExtras] = useState<Extras>(NO_EXTRAS)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const dirty = !sameExtras(saved, extras)
  const set = <K extends keyof Extras>(key: K) => (value: Extras[K]) => setExtras((x) => ({ ...x, [key]: value }))

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Chấm điểm là ghi bù xong: trang được tạo (hoặc đổi điểm) ngay, không cần bấm Lưu.
  function pick(score: Score) {
    const nowIso = new Date().toISOString()
    const next: DemoEntry = record
      ? { ...record, score, updated_at: nowIso }
      : {
          entry_date: date,
          score,
          sub_icon: null,
          flag_color: null,
          title: null,
          content: null,
          keywords: [],
          photos: [],
          created_at: nowIso,
          updated_at: nowIso,
        }
    writeDay(date, next)
    setRecord(next)
  }

  function undo() {
    writeDay(date, null)
    setRecord(null)
    setSaved(NO_EXTRAS)
    setExtras(NO_EXTRAS)
    setSavedAt(null)
  }

  function save() {
    if (!record) return
    const next = applyDraft(record, { ...draftOf(record), ...extras })
    writeDay(date, next)
    setRecord(next)
    setSaved(extras)
    setSavedAt(next.updated_at)
  }

  const ago = daysBetween(date, today)
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <BackLink to="/timeline">Dòng thời gian</BackLink>
      <section aria-labelledby="bf-h" className="flex flex-col gap-[18px]">
        <div className="flex animate-rise flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-2 text-sm leading-[22px] text-muted-foreground">
            {longDateLabel(date)}
            <span className="rounded-full border-[1.5px] border-dashed border-border px-2 text-xs leading-[18px] font-semibold">
              {ago === 1 ? 'Hôm qua' : `${ago} ngày trước`}
            </span>
          </p>
          <h1 id="bf-h" className="text-[clamp(28px,3vw,34px)] leading-[1.25] font-bold">
            {record ? `Ghi bù cho ngày ${dayMonth(date)}` : 'Ngày này bạn chưa ghi'}
          </h1>
        </div>
        <fieldset className="m-0 min-w-0 animate-rise border-0 p-0 [animation-delay:.06s]">
          <legend className="sr-only">Điểm của ngày {dayMonth(date)}</legend>
          <ScorePicker iconSetId={iconSetId} value={record?.score ?? null} onChange={pick} caption="label" className="gap-1.5 sm:gap-2.5" />
        </fieldset>
        {record ? (
          <p role="status" className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[15px] leading-6">
            <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
            Đã ghi bù lúc {dateTimeLabel(timeZone, record.created_at, false)}
            <BackfillChip />
            <span className="text-muted-foreground">· bản thử, chưa lưu lên máy chủ</span>
            <button
              type="button"
              onClick={undo}
              className="link-underline cursor-pointer py-0.5 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-ring"
            >
              Hoàn tác
            </button>
          </p>
        ) : (
          <p className="text-[15px] leading-6 text-muted-foreground">Chấm điểm là ghi bù xong. Viết thêm hay không tùy bạn.</p>
        )}
        <Notice className="animate-rise [animation-delay:.1s]">
          Ngày ghi bù vẫn được tô màu trong Year in Pixels và lịch tháng, nhưng không nối lại chuỗi ngày liên tiếp.
        </Notice>
      </section>

      {record ? (
        <>
          <section
            aria-labelledby="bf-more"
            className="flex animate-rise flex-col gap-6 rounded-lg border-[1.5px] border-line bg-card p-[clamp(20px,4vw,28px)] shadow-ink"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="bf-more" className="text-xl leading-7 font-semibold">
                Thêm chút nữa?
              </h2>
              <span className="text-[13px] leading-5 text-muted-foreground">Không bắt buộc</span>
            </div>
            <ExtraFields
              sub={extras.sub_icon}
              onSub={set('sub_icon')}
              flag={extras.flag_color}
              onFlag={set('flag_color')}
              title={extras.title}
              onTitle={set('title')}
              content={extras.content}
              onContent={set('content')}
              titlePlaceholder={`Ngày ${dayMonth(date)} thế nào?`}
              contentPlaceholder="Bạn còn nhớ gì về ngày này?"
              contentRows={3}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-border pt-4">
              <span role="status" className="text-[13px] leading-5 text-muted-foreground">
                {dirty
                  ? 'Có thay đổi chưa lưu'
                  : savedAt
                    ? `Đã lưu lúc ${dateTimeLabel(timeZone, savedAt, false)}`
                    : 'Điểm đã được ghi. Phần này lưu khi bấm Lưu.'}
              </span>
              {dirty ? (
                <Button className="animate-pop" onClick={save}>
                  Lưu
                </Button>
              ) : null}
            </div>
          </section>
          <TimelinePreview record={record} extras={extras} />
        </>
      ) : null}
    </div>
  )
}

/** Màn ghi bù một ngày đã bỏ trống (thiết kế B9 · Ghi bù). Bản thử: lưu trong bộ nhớ tab tới khi có API ở Bước 5. */
export function BackfillEntry({ date }: { date: string }) {
  const { timeZone } = useProfile()
  const now = useNow()
  const today = todayIn(timeZone, now)
  const valid = isValidDate(date)
  const { data: entry, isPending, isError } = useDay(date)
  // Ngày đã có trang trước khi mở màn này? Chốt một lần lúc dữ liệu về, để trang vừa ghi bù tại đây không bị tính.
  const [hadEntry, setHadEntry] = useState<boolean | null>(() => (isPending ? null : !!entry))
  if (hadEntry === null && !isPending) setHadEntry(!!entry)

  const frame = (children: ReactNode) => (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-start gap-4">
      <BackLink to="/timeline">Dòng thời gian</BackLink>
      {children}
    </div>
  )

  if (!valid) {
    return frame(
      <>
        <h1 className="text-title-2 font-bold">Ngày không hợp lệ</h1>
        <p className="text-muted-foreground">Địa chỉ cần có dạng /day/2026-10-14/backfill, và là một ngày có thật.</p>
      </>,
    )
  }
  if (date > today) {
    return frame(
      <>
        <h1 className="text-title-2 font-bold">{longDateLabel(date)}</h1>
        <p className="text-muted-foreground">Ngày này chưa tới. Hẹn bạn hôm đó nhé.</p>
      </>,
    )
  }
  if (date === today) {
    return frame(
      <>
        <h1 className="text-title-2 font-bold">Hôm nay vẫn đang diễn ra</h1>
        <p className="text-muted-foreground">Không cần ghi bù, viết luôn cho hôm nay.</p>
        <Button asChild>
          <Link to="/today">Viết cho hôm nay</Link>
        </Button>
      </>,
    )
  }
  if (isPending || (hadEntry === null && !isError)) {
    return frame(
      <p role="status" className="text-muted-foreground">
        Đang mở trang…
      </p>,
    )
  }
  if (isError) {
    return frame(
      <Alert variant="destructive">
        <AlertDescription>Không mở được ngày này. Thử tải lại.</AlertDescription>
      </Alert>,
    )
  }
  if (hadEntry) {
    return frame(
      <>
        <h1 className="text-title-2 font-bold">Ngày {dayMonth(date)} đã có trang</h1>
        <p className="text-muted-foreground">Không cần ghi bù. Bạn có thể xem hoặc sửa trang này.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to={`/day/${date}`}>Xem trang</Link>
          </Button>
          <Button asChild>
            <Link to={`/day/${date}/edit`}>Sửa trang</Link>
          </Button>
        </div>
      </>,
    )
  }
  return <BackfillForm key={date} date={date} today={today} />
}
