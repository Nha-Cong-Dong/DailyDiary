import { Clock } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { Link, useBlocker } from 'react-router'
import { PhotoUploader } from '@/components/diary/PhotoUploader'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { usePhotoUploads } from '@/components/diary/usePhotoUploads'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { flagColors, scoreLabel } from '@/lib/catalog'
import { isValidDate, longDateLabel, todayIn, useNow, type DateString } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { applyDraft, changedFields, dateTimeLabel, dayMonth, daysBetween, draftOf, fieldsLabel, type EntryDraft } from './entryDraft'
import { BackLink, ExtraFields, Legend, Notice, SavedToast } from './components/EntryFormParts'
import { KeywordEditor } from './components/KeywordEditor'
import { useWriteDay } from './localDays'
import { fakeUploadPhoto } from './uploadPhoto'
import { useDay } from './useDay'

const SAGE = flagColors.find((f) => f.id === 'sage')?.hex

/** "Viết lúc 21:20, 16/10/2026 · Sửa lần cuối 21:15, 18/10, 2 ngày sau". */
function metaLine(entry: DemoEntry, timeZone: string): string {
  const written = `Viết lúc ${dateTimeLabel(timeZone, entry.created_at)}`
  if (entry.updated_at === entry.created_at) return written
  const editedDay = todayIn(timeZone, new Date(entry.updated_at))
  const late = daysBetween(entry.entry_date, editedDay)
  const when = late > 0 ? `${dateTimeLabel(timeZone, entry.updated_at, false)}, ${late} ngày sau` : `${dateTimeLabel(timeZone, entry.updated_at, false)}, cùng ngày`
  return `${written} · Sửa lần cuối ${when}`
}

function EditForm({ entry, today }: { entry: DemoEntry; today: DateString }) {
  const { timeZone, iconSetId } = useProfile()
  const writeDay = useWriteDay()
  const ids = useId()
  const date = entry.entry_date
  const [record, setRecord] = useState(entry)
  const [base, setBase] = useState<EntryDraft>(() => draftOf(entry))
  const [draft, setDraft] = useState<EntryDraft>(base)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [toast, setToast] = useState(false)
  const [savedNow, setSavedNow] = useState(false)
  const uploads = usePhotoUploads(base.photos, fakeUploadPhoto)

  const current: EntryDraft = { ...draft, photos: uploads.photos }
  const changes = changedFields(base, current)
  const dirty = changes.length > 0 || uploads.uploading
  const canSave = changes.length > 0 && !uploads.uploading
  const set = <K extends keyof EntryDraft>(key: K) => (value: EntryDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  // Rời trang khi còn thay đổi chưa lưu: trong app hỏi bằng hộp thoại, đóng tab thì trình duyệt tự hỏi.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const hideToast = useCallback(() => setToast(false), [])

  function save() {
    const next = applyDraft(record, current)
    writeDay(date, next)
    setRecord(next)
    setBase(draftOf(next))
    setDraft(draftOf(next))
    setSavedNow(true)
    setToast(true)
  }

  function discard() {
    setDraft(base)
    uploads.reset(base.photos)
    setConfirmDiscard(false)
  }

  const ago = daysBetween(date, today)
  const status = uploads.uploading
    ? 'Đang tải ảnh lên…'
    : changes.length
      ? `${changes.length} thay đổi chưa lưu`
      : savedNow
        ? `Đã lưu · Sửa lần cuối ${dateTimeLabel(timeZone, record.updated_at, false)}`
        : 'Chưa có thay đổi'
  const leaving = blocker.state === 'blocked'
  const lost = fieldsLabel(changes.length ? changes : ['photos'])

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-[22px]">
      <BackLink to={`/day/${date}`}>Trang {dayMonth(date)}</BackLink>

      <div className="flex animate-rise flex-col gap-1.5">
        <p className="text-sm leading-[22px] text-muted-foreground">{longDateLabel(date)}</p>
        <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Sửa trang</h1>
        <p className="inline-flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground tabular-nums">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          {metaLine(record, timeZone)}
        </p>
      </div>

      {ago > 0 ? (
        <Notice className="animate-rise [animation-delay:.05s]">
          Bạn đang sửa trang của {ago === 1 ? 'hôm qua' : `${ago} ngày trước`}. Trang vẫn thuộc ngày {dayMonth(date)}, chỉ dòng{' '}
          <strong className="font-semibold">Sửa lần cuối</strong> ghi thêm ngày sửa.
        </Notice>
      ) : null}

      <section
        aria-label="Nội dung trang"
        className="flex animate-rise flex-col gap-7 rounded-lg border-[1.5px] border-line bg-card p-[clamp(20px,4vw,32px)] shadow-ink [animation-delay:.1s]"
      >
        <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <Legend>Điểm của ngày</Legend>
          <ScorePicker iconSetId={iconSetId} value={draft.score} onChange={set('score')} caption="label" className="gap-1.5 sm:gap-2.5" />
          {draft.score !== base.score ? (
            <p className="flex animate-pop flex-wrap items-center gap-2 text-[13px] leading-5 text-muted-foreground">
              Đã đổi từ {base.score} · {scoreLabel(iconSetId, base.score)} sang {draft.score} · {scoreLabel(iconSetId, draft.score)}.
              <button
                type="button"
                onClick={() => set('score')(base.score)}
                className="link-underline cursor-pointer py-0.5 font-semibold text-foreground focus-visible:outline-3 focus-visible:outline-ring"
              >
                Hoàn tác
              </button>
            </p>
          ) : null}
        </fieldset>

        <ExtraFields
          sub={draft.sub_icon}
          onSub={set('sub_icon')}
          flag={draft.flag_color}
          onFlag={set('flag_color')}
          title={draft.title}
          onTitle={set('title')}
          content={draft.content}
          onContent={set('content')}
          titlePlaceholder="Ngày này thế nào?"
          contentPlaceholder="Viết vài dòng nếu muốn…"
        />

        <div role="group" aria-labelledby={`${ids}-kw`} className="flex flex-col gap-2.5">
          <span id={`${ids}-kw`} className="text-[15px] leading-6 font-semibold">
            Từ khóa
          </span>
          <KeywordEditor keywords={draft.keywords} onChange={set('keywords')} />
        </div>

        <div className="flex flex-col gap-2.5">
          <span id={`${ids}-photos`} className="text-[15px] leading-6 font-semibold">
            Ảnh ·{' '}
            <span className="tabular-nums">
              {uploads.tiles.filter((t) => t.status !== 'rejected').length}/{tierLimits().photos.per_day_max}
            </span>
          </span>
          <PhotoUploader uploads={uploads} labelledBy={`${ids}-photos`} />
        </div>
      </section>

      {/* Thanh lưu dính đáy; trên điện thoại nằm trên thanh tab dưới. */}
      <div
        className={cn(
          'sticky bottom-[88px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-line bg-card py-3 pr-3 pl-5 transition-shadow md:bottom-4',
          dirty ? 'shadow-[4px_4px_0_var(--score-5)]' : 'shadow-ink',
        )}
      >
        <span role="status" className="inline-flex items-center gap-2.5 text-sm leading-[22px] font-medium">
          <span
            aria-hidden="true"
            className={cn('size-2.5 rounded-full border-[1.5px] border-line', dirty ? 'animate-pulse bg-score-5' : !savedNow && 'bg-muted')}
            style={!dirty && savedNow && SAGE ? { backgroundColor: SAGE } : undefined}
          />
          {status}
        </span>
        <div className="flex flex-wrap gap-2">
          {dirty ? (
            <Button variant="outline" onClick={() => setConfirmDiscard(true)}>
              Hủy thay đổi
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to={`/day/${date}`}>Xem trang</Link>
            </Button>
          )}
          <Button onClick={save} disabled={!canSave}>
            Lưu thay đổi
          </Button>
        </div>
      </div>

      <AlertDialog
        open={confirmDiscard || leaving}
        onOpenChange={(open) => {
          if (open) return
          setConfirmDiscard(false)
          if (blocker.state === 'blocked') blocker.reset()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ các thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>Thay đổi ở {lost} chưa được lưu và sẽ mất.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="default">Tiếp tục sửa</AlertDialogCancel>
            <Button
              variant="destructive"
              className="shadow-none"
              onClick={() => (leaving ? blocker.proceed?.() : discard())}
            >
              {leaving ? 'Bỏ và rời trang' : 'Bỏ thay đổi'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {toast ? <SavedToast onDone={hideToast}>Đã lưu thay đổi cho trang {dayMonth(date)}</SavedToast> : null}
    </div>
  )
}

/** Màn sửa một trang cũ (thiết kế B9 · Sửa một trang cũ). Bản thử: lưu trong bộ nhớ tab tới khi có API ở Bước 5. */
export function EditEntry({ date }: { date: string }) {
  const { timeZone } = useProfile()
  const now = useNow()
  const today = todayIn(timeZone, now)
  const valid = isValidDate(date)
  const { data: entry, isPending, isError } = useDay(date)

  const frame = (children: ReactNode) => (
    <div className="mx-auto flex w-full max-w-[680px] flex-col items-start gap-4">
      <BackLink to="/timeline">Dòng thời gian</BackLink>
      {children}
    </div>
  )

  if (!valid) {
    return frame(
      <>
        <h1 className="text-title-2 font-bold">Ngày không hợp lệ</h1>
        <p className="text-muted-foreground">Địa chỉ cần có dạng /day/2026-10-18/edit, và là một ngày có thật.</p>
      </>,
    )
  }
  if (date > today) {
    return frame(
      <>
        <h1 className="text-title-2 font-bold">{longDateLabel(date)}</h1>
        <p className="text-muted-foreground">Ngày này chưa tới nên chưa sửa được.</p>
      </>,
    )
  }
  if (isPending) {
    return frame(
      <p role="status" className="text-muted-foreground">
        Đang mở trang…
      </p>,
    )
  }
  if (isError) {
    return frame(
      <Alert variant="destructive">
        <AlertDescription>Không mở được trang này. Thử tải lại.</AlertDescription>
      </Alert>,
    )
  }
  if (!entry) {
    return frame(
      <>
        <h1 className="text-title-2 font-bold">Ngày này chưa ghi</h1>
        <p className="text-muted-foreground">Chưa có trang để sửa.</p>
        <Button asChild>
          <Link to={date === today ? '/today' : `/day/${date}/backfill`}>{date === today ? 'Viết cho hôm nay' : 'Ghi bù ngày này'}</Link>
        </Button>
      </>,
    )
  }
  return <EditForm key={date} entry={entry} today={today} />
}
