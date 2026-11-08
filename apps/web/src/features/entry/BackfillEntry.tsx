import { ArrowLeft, CircleCheck, RotateCcw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { EntryCard } from '@/components/diary/EntryCard'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { SyncStatus } from '@/components/diary/SyncStatus'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { scoreLabel, type Score } from '@/lib/catalog'
import { dayOfMonth, isValidDate, longDateLabel, todayIn, useNow, weekdayShort, type DateString } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import type { DraftFields } from '@/lib/storage'
import { saveErrorMessage, useDeleteEntry, type DayEntry } from './entries'
import { dateTimeLabel, dayMonth, daysBetween } from './entryDraft'
import { ConflictDialog } from './components/ConflictDialog'
import { fieldsOf, useAutosave } from './useAutosave'
import { BackLink, ExtraFields, Notice, PhoneBar, phoneIconButton } from './components/EntryFormParts'
import { useDay } from './useDay'
import { useFrequentSubIcons } from './useFrequentSubIcons'
import { useT } from '@/lib/i18n'

type Extras = { sub_icon: string | null; flag_color: string | null; title: string; content: string }
const NO_EXTRAS: Extras = { sub_icon: null, flag_color: null, title: '', content: '' }
const extrasOf = (e: DayEntry): Extras => ({
  sub_icon: e.sub_icon,
  flag_color: e.flag_color,
  title: e.title ?? '',
  content: e.content ?? '',
})
const sameExtras = (a: Extras, b: Extras) =>
  a.sub_icon === b.sub_icon && a.flag_color === b.flag_color && a.title === b.title && a.content === b.content

function BackfillChip() {
  const t = useT()
  return (
    <span className="inline-flex animate-stamp items-center gap-1 rounded-full border-[1.5px] border-stroke bg-peach px-2 text-label font-bold text-on-accent">
      <RotateCcw className="size-[13px]" strokeWidth={2.6} aria-hidden="true" />
      {t('entry:backfill.chip')}
    </span>
  )
}

/** Thẻ xem trước: trang ghi bù sẽ hiện thế nào trong Dòng thời gian (EntryCard thẻ, có dấu Ghi bù). */
function TimelinePreview({ record, extras }: { record: DayEntry; extras: Extras }) {
  const t = useT()
  const { iconSetId, timeZone } = useProfile()
  return (
    <section aria-labelledby="bf-preview" className="flex animate-rise flex-col gap-3 [animation-delay:.12s]">
      <h2 id="bf-preview" className="text-[15px] leading-[22px] font-semibold">
        {t('entry:backfill.previewHeading')}
      </h2>
      <div className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3.5">
        <div className="flex flex-col items-center gap-0.5 pt-3.5">
          <span className="text-2xl leading-7 font-bold nums">{dayOfMonth(record.entry_date)}</span>
          <span className="text-xs leading-4 text-ink-soft">{weekdayShort(record.entry_date)}</span>
        </div>
        <EntryCard
          iconSetId={iconSetId}
          score={record.score}
          subIcon={extras.sub_icon}
          flagColor={extras.flag_color}
          dateLabel={t('entry:backfill.previewDate', {
            score: record.score,
            label: scoreLabel(iconSetId, record.score),
            time: dateTimeLabel(timeZone, record.created_at, false),
          })}
          backfill
          title={extras.title.trim() || t('entry:scoreOnly')}
          excerpt={extras.content.trim() || null}
          emptyText={t('entry:backfill.previewEmpty')}
        />
      </div>
    </section>
  )
}

function BackfillForm({ date, today }: { date: DateString; today: DateString }) {
  const t = useT()
  const { timeZone, iconSetId } = useProfile()
  const deleteEntry = useDeleteEntry(date)
  const { data: frequentIcons } = useFrequentSubIcons()
  const [record, setRecord] = useState<DayEntry | null>(null)
  const [saved, setSaved] = useState<Extras>(NO_EXTRAS)
  const [extras, setExtras] = useState<Extras>(NO_EXTRAS)
  const dirty = !sameExtras(saved, extras)
  const set = <K extends keyof Extras>(key: K) => (value: Extras[K]) => setExtras((x) => ({ ...x, [key]: value }))

  const autosave = useAutosave({
    date,
    record: null,
    mode: 'auto',
    onLoad: (f) => {
      const next = { sub_icon: f.sub_icon, flag_color: f.flag_color, title: f.title, content: f.content }
      setExtras(next)
    },
    onSaved: (next) => {
      setRecord(next)
      setSaved(extrasOf(next))
    },
  })
  const fields: DraftFields | null = record ? { ...fieldsOf(record), ...extras } : null
  const fieldsKey = JSON.stringify(fields)
  const { change } = autosave
  useEffect(() => change(fieldsKey === 'null' ? null : (JSON.parse(fieldsKey) as DraftFields)), [change, fieldsKey])

  // Chấm điểm là ghi bù xong: trang được tạo (hoặc đổi điểm) ngay bằng PUT, không cần bấm Lưu.
  // Phần còn lại tự lưu khi ngừng gõ (F-06); nút Lưu chỉ để lưu ngay.
  function pick(score: Score) {
    const base = record ? fieldsOf(record) : { sub_icon: null, flag_color: null, title: '', content: '', keywords: [] }
    void autosave.saveNow({ ...base, ...extras, score })
  }

  /** Bỏ trang vừa ghi bù (xóa mềm như mọi trang; vẫn khôi phục được trong hạn). */
  function undo() {
    deleteEntry.mutate(date, {
      onSuccess: () => {
        autosave.adopt(null)
        setRecord(null)
        setSaved(NO_EXTRAS)
        setExtras(NO_EXTRAS)
      },
    })
  }

  function save() {
    if (record) void autosave.flush()
  }

  const ago = daysBetween(date, today)
  const heading = record ? t('entry:backfill.headingDone', { day: dayMonth(date) }) : t('entry:backfill.headingEmpty')
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 md:gap-6">
      {/* Điện thoại (B10 · Ghi bù): thanh trên riêng có nút về Dòng thời gian. */}
      <PhoneBar
        start={
          <Link to="/timeline" aria-label={t('entry:timelineBack')} className={phoneIconButton}>
            <ArrowLeft className="size-[22px]" aria-hidden="true" />
          </Link>
        }
        title={t('entry:backfill.phoneTitle', { day: dayMonth(date) })}
      />
      <BackLink to="/timeline" className="max-md:hidden">
        {t('entry:timeline')}
      </BackLink>
      <section aria-labelledby="bf-h" className="flex flex-col gap-5 md:gap-[18px]">
        <div className="flex animate-rise flex-col gap-1 md:gap-1.5">
          <p className="flex flex-wrap items-center gap-2 text-[13px] leading-5 text-ink-soft md:text-sm md:leading-[22px]">
            {longDateLabel(date)}
            <span className="rounded-full border-[1.5px] border-dashed border-line-soft px-2 text-[11px] leading-[18px] font-semibold md:text-xs">
              {ago === 1 ? t('entry:ago.yesterdayCap') : t('entry:ago.days', { count: ago })}
            </span>
          </p>
          <h1 id="bf-h" className="text-[25px] leading-8 font-bold md:text-[clamp(28px,3vw,34px)] md:leading-[1.25]">
            {heading}
          </h1>
        </div>
        <fieldset className="m-0 min-w-0 animate-rise border-0 p-0 [animation-delay:.06s]">
          <legend className="sr-only">{t('entry:backfill.scoreLegend', { day: dayMonth(date) })}</legend>
          <ScorePicker
            iconSetId={iconSetId}
            value={record?.score ?? null}
            onChange={pick}
            caption="label"
            className="gap-1.5 sm:gap-2.5"
            itemClassName="max-md:min-h-[76px] max-md:rounded-[14px]"
          />
        </fieldset>
        {record ? (
          <p role="status" className="-mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm leading-[22px] md:mt-0 md:gap-x-2.5 md:gap-y-2 md:text-[15px] md:leading-6">
            <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
            {t('entry:backfill.recordedAt', { time: dateTimeLabel(timeZone, record.created_at, false) })}
            <BackfillChip />
            <button
              type="button"
              onClick={undo}
              className="link-underline cursor-pointer py-0.5 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-focus"
            >
              {t('entry:undo')}
            </button>
          </p>
        ) : (
          <p className="-mt-1.5 text-sm leading-[22px] text-ink-soft md:mt-0 md:text-[15px] md:leading-6">
            {t('entry:backfill.hint')}
          </p>
        )}
        {deleteEntry.isError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{saveErrorMessage(deleteEntry.error)}</AlertDescription>
          </Alert>
        ) : autosave.status.kind === 'error' ? (
          <SyncStatus status={autosave.status} timeZone={timeZone} />
        ) : null}
        <Notice className="animate-rise [animation-delay:.1s] max-md:rounded-[12px] max-md:px-3 max-md:py-2.5 max-md:text-[13px] max-md:leading-5">
          {t('entry:backfill.noticeStart')}
          <span className="max-md:hidden">{t('entry:backfill.noticeMid')}</span>
          {t('entry:backfill.noticeEnd')}
        </Notice>
      </section>

      <ConflictDialog conflict={autosave.conflict} onKeepMine={autosave.keepMine} onTakeTheirs={autosave.takeTheirs} />

      {record ? (
        <>
          <section
            aria-labelledby="bf-more"
            className="flex animate-rise flex-col gap-[18px] rounded-[18px] border-[1.5px] border-stroke bg-card p-4 shadow-sm md:gap-6 md:rounded-lg md:p-[clamp(20px,4vw,28px)] md:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="bf-more" className="text-lg leading-[26px] font-semibold md:text-xl md:leading-7">
                {t('entry:addMore')}
              </h2>
              <span className="text-xs leading-[18px] text-ink-soft md:text-[13px] md:leading-5">{t('entry:optional')}</span>
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
              titlePlaceholder={t('entry:backfill.titlePlaceholder', { day: dayMonth(date) })}
              contentPlaceholder={t('entry:backfill.contentPlaceholder')}
              contentRows={3}
              frequentIcons={frequentIcons}
            />
            {/* Điện thoại: trạng thái ở trên, nút Lưu rộng hết thẻ ở dưới (B10). */}
            <div className="flex flex-col gap-2.5 border-t-[1.5px] border-dashed border-line-soft pt-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 md:pt-4">
              <SyncStatus
                // Đang gửi / mất mạng / lỗi thì nói đúng trạng thái đó; còn lại đọc theo bản trên máy chủ.
                status={['saving', 'unsynced', 'error'].includes(autosave.status.kind) ? autosave.status : { kind: 'idle' }}
                timeZone={timeZone}
                onRetry={autosave.retry}
                className="text-xs leading-[18px] text-ink-soft md:text-[13px] md:leading-5"
                fallback={
                  dirty
                    ? t('entry:backfill.unsaved')
                    : record.updated_at !== record.created_at
                      ? t('entry:backfill.savedAt', { time: dateTimeLabel(timeZone, record.updated_at, false) })
                      : t('entry:backfill.scoreSaved')
                }
              />
              {dirty ? (
                <Button
                  className="animate-pop max-md:h-12 max-md:rounded-[14px]"
                  onClick={save}
                  disabled={autosave.status.kind === 'saving'}
                >
                  {t('entry:save')}
                </Button>
              ) : null}
            </div>
          </section>
          {/* Thẻ xem trước chỉ có ở bản máy tính (B9). */}
          <div className="max-md:hidden">
            <TimelinePreview record={record} extras={extras} />
          </div>
        </>
      ) : (
        // Máy tính: chưa chấm điểm thì vẫn cho thấy phần sẽ mở ra (mờ, chưa bấm được), để màn không trống quá nửa.
        // Điện thoại giữ đúng B10: phần này chỉ hiện sau khi chấm.
        <section
          aria-labelledby="bf-more-locked"
          className="flex flex-col gap-6 rounded-lg border-[1.5px] border-dashed border-line-soft p-[clamp(20px,4vw,28px)] max-md:hidden"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="bf-more-locked" className="text-xl leading-7 font-semibold text-ink-soft">
              {t('entry:addMore')}
            </h2>
            <span className="text-[13px] leading-5 text-ink-soft">{t('entry:backfill.locked')}</span>
          </div>
          <div inert aria-hidden="true" className="flex flex-col gap-6 opacity-45 select-none">
            <ExtraFields
              sub={null}
              onSub={() => {}}
              flag={null}
              onFlag={() => {}}
              title=""
              onTitle={() => {}}
              content=""
              onContent={() => {}}
              titlePlaceholder={t('entry:backfill.titlePlaceholder', { day: dayMonth(date) })}
              contentPlaceholder={t('entry:backfill.contentPlaceholder')}
              contentRows={3}
              frequentIcons={frequentIcons}
            />
          </div>
        </section>
      )}
    </div>
  )
}

/** Màn ghi bù một ngày đã bỏ trống (thiết kế B9 · Ghi bù), lưu bằng PUT /entries/{day}. */
export function BackfillEntry({ date }: { date: string }) {
  const t = useT()
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
      <BackLink to="/timeline">{t('entry:timeline')}</BackLink>
      {children}
    </div>
  )

  if (!valid) {
    return frame(
      <>
        <h1 className="text-title font-bold">{t('entry:invalidDay.title')}</h1>
        <p className="text-ink-soft">{t('entry:invalidDay.hint', { path: '/day/2026-10-14/backfill' })}</p>
      </>,
    )
  }
  if (date > today) {
    return frame(
      <>
        <h1 className="text-title font-bold">{longDateLabel(date)}</h1>
        <p className="text-ink-soft">{t('entry:futureDay')}</p>
      </>,
    )
  }
  if (date === today) {
    return frame(
      <>
        <h1 className="text-title font-bold">{t('entry:backfill.todayTitle')}</h1>
        <p className="text-ink-soft">{t('entry:backfill.todayHint')}</p>
        <Button asChild>
          <Link to="/today">{t('entry:writeToday')}</Link>
        </Button>
      </>,
    )
  }
  if (isPending || (hadEntry === null && !isError)) {
    return frame(
      <p role="status" className="text-ink-soft">
        {t('entry:opening')}
      </p>,
    )
  }
  if (isError) {
    return frame(
      <Alert variant="destructive">
        <AlertDescription>{t('entry:backfill.openFailed')}</AlertDescription>
      </Alert>,
    )
  }
  if (hadEntry) {
    return frame(
      <>
        <h1 className="text-title font-bold">{t('entry:backfill.hasEntryTitle', { day: dayMonth(date) })}</h1>
        <p className="text-ink-soft">{t('entry:backfill.hasEntryHint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to={`/day/${date}`}>{t('entry:backfill.viewPage')}</Link>
          </Button>
          <Button asChild>
            <Link to={`/day/${date}/edit`}>{t('entry:backfill.editPage')}</Link>
          </Button>
        </div>
      </>,
    )
  }
  return <BackfillForm key={date} date={date} today={today} />
}
