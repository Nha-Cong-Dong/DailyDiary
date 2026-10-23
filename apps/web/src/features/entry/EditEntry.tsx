import { Clock } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { Link, useBlocker } from 'react-router'
import { PhotoUploader } from '@/components/diary/PhotoUploader'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { usePhotoUploads } from '@/components/diary/usePhotoUploads'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagColors, scoreLabel } from '@/lib/catalog'
import { isValidDate, longDateLabel, todayIn, useNow, type DateString } from '@/lib/date'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import type { DraftFields } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { DayEntry } from './entries'
import { changedFields, dateTimeLabel, dayMonth, daysBetween, draftOf, fieldsLabel, type EntryDraft } from './entryDraft'
import {
  BackLink,
  ConfirmDialog,
  ExtraFields,
  fieldLabelClass,
  Legend,
  Notice,
  PhoneBar,
  phoneIconButton,
  SavedToast,
} from './components/EntryFormParts'
import { ConflictDialog } from './components/ConflictDialog'
import { InlineKeywordEditor } from './components/KeywordEditor'
import { fakeUploadPhoto } from './uploadPhoto'
import { useAutosave } from './useAutosave'
import { useDay } from './useDay'
import { useFrequentSubIcons } from './useFrequentSubIcons'

const SAGE = flagColors.find((f) => f.id === 'sage')?.hex

/** "Viết lúc 21:20, 16/10/2026 · Sửa lần cuối 21:15, 18/10, 2 ngày sau". */
function metaLine(entry: DayEntry, timeZone: string): string {
  const written = `Viết lúc ${dateTimeLabel(timeZone, entry.created_at)}`
  if (entry.updated_at === entry.created_at) return written
  const editedDay = todayIn(timeZone, new Date(entry.updated_at))
  const late = daysBetween(entry.entry_date, editedDay)
  const when = late > 0 ? `${dateTimeLabel(timeZone, entry.updated_at, false)}, ${late} ngày sau` : `${dateTimeLabel(timeZone, entry.updated_at, false)}, cùng ngày`
  return `${written} · Sửa lần cuối ${when}`
}

function EditForm({ entry, today }: { entry: DayEntry; today: DateString }) {
  const { timeZone, iconSetId } = useProfile()
  const ids = useId()
  const date = entry.entry_date
  const [record, setRecord] = useState(entry)
  const [base, setBase] = useState<EntryDraft>(() => draftOf(entry))
  const [draft, setDraft] = useState<EntryDraft>(base)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [toast, setToast] = useState(false)
  const [savedNow, setSavedNow] = useState(false)
  const uploads = usePhotoUploads(base.photos, fakeUploadPhoto)
  const { data: frequentIcons } = useFrequentSubIcons()
  // Sửa trang cũ: chỉ ghi nháp vào trình duyệt (F5 không mất chữ); lên máy chủ khi bấm "Lưu thay đổi" (F-06).
  const autosave = useAutosave({
    date,
    record: entry,
    mode: 'draft',
    onLoad: (f) => setDraft((d) => ({ ...d, ...f, score: f.score as EntryDraft['score'] })),
    onSaved: (next) => {
      adopt(next)
      setSavedNow(true)
      setToast(true)
    },
  })
  const draftFields: DraftFields = {
    score: draft.score,
    sub_icon: draft.sub_icon,
    flag_color: draft.flag_color,
    title: draft.title,
    content: draft.content,
    keywords: draft.keywords,
  }
  const draftKey = JSON.stringify(draftFields)
  const { change } = autosave
  useEffect(() => change(JSON.parse(draftKey) as DraftFields), [change, draftKey])

  const current: EntryDraft = { ...draft, photos: uploads.photos }
  const changes = changedFields(base, current)
  const dirty = changes.length > 0 || uploads.uploading
  const saving = autosave.status.kind === 'saving'
  const canSave = changes.length > 0 && !uploads.uploading && !saving
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

  function adopt(next: DayEntry) {
    setRecord(next)
    setBase(draftOf(next))
    setDraft(draftOf(next))
    uploads.reset(next.photos)
  }

  function save() {
    void autosave.flush()
  }

  /** "Dùng bản vừa sửa" khi xung đột: bản máy chủ thành bản gốc lẫn bản đang sửa. */
  function takeTheirs() {
    const theirs = autosave.conflict?.theirs
    autosave.takeTheirs()
    if (theirs) adopt(theirs)
  }

  function discard() {
    setDraft(base)
    uploads.reset(base.photos)
    autosave.discard()
    setConfirmDiscard(false)
  }

  const ago = daysBetween(date, today)
  const agoText = ago === 1 ? 'hôm qua' : `${ago} ngày trước`
  const status = saving
    ? 'Đang lưu…'
    : autosave.status.kind === 'error'
      ? autosave.status.message
      : autosave.status.kind === 'unsynced'
        ? 'Chưa lưu được — kiểm tra kết nối rồi bấm Lưu lại'
    : uploads.uploading
    ? 'Đang tải ảnh lên…'
    : changes.length
      ? `${changes.length} thay đổi chưa lưu`
      : savedNow
        ? `Đã lưu · Sửa lần cuối ${dateTimeLabel(timeZone, record.updated_at, false)}`
        : 'Chưa có thay đổi'
  const leaving = blocker.state === 'blocked'
  const lost = fieldsLabel(changes.length ? changes : ['photos'])

  const statusDot = (
    <span
      aria-hidden="true"
      className={cn('size-[9px] rounded-full border-[1.5px] border-line md:size-2.5', dirty ? 'animate-[pulse_1.2s_ease-in-out_3] bg-score-5' : !savedNow && 'bg-muted')}
      style={!dirty && savedNow && SAGE ? { backgroundColor: SAGE } : undefined}
    />
  )

  return (
    // Điện thoại (B10 · Sửa trang): trình sửa toàn màn, có thanh Hủy / Lưu riêng, không có thanh tab dưới.
    <div className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-y-auto max-md:bg-background">
      <PhoneBar
        start={
          // Còn thay đổi chưa lưu thì useBlocker chặn và hỏi "Bỏ và rời trang".
          <Link to={`/day/${date}`} className={cn(phoneIconButton, 'w-auto px-2.5 text-[15px] font-medium')}>
            Hủy
          </Link>
        }
        title={`Sửa trang ${dayMonth(date)}`}
        heading
        end={
          <Button onClick={save} disabled={!canSave} className="mr-1.5 h-[38px] rounded-[12px] px-4">
            Lưu
          </Button>
        }
      />

      {/* scroll-mb: ô đang nhập không bị thanh lưu dính đáy (máy tính) che khi được cuộn tới. */}
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-[22px] max-md:px-4 max-md:pt-[76px] max-md:pb-10 md:[&_:is(input,textarea,button)]:scroll-mb-24">
        <BackLink to={`/day/${date}`} className="max-md:hidden">
          Trang {dayMonth(date)}
        </BackLink>

        <div className="flex animate-rise flex-col gap-1 md:gap-1.5">
          <p className="text-[13px] leading-5 text-muted-foreground md:text-sm md:leading-[22px]">{longDateLabel(date)}</p>
          <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold max-md:hidden">Sửa trang</h1>
          <p className="inline-flex items-center gap-1.5 text-xs leading-[18px] text-muted-foreground tabular-nums md:text-[13px] md:leading-5">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            {metaLine(record, timeZone)}
          </p>
        </div>

        {ago > 0 ? (
          <Notice className="animate-rise [animation-delay:.05s] max-md:rounded-[12px] max-md:px-3 max-md:py-2.5 max-md:text-[13px] max-md:leading-5">
            <span className="max-md:hidden">
              Bạn đang sửa trang của {agoText}. Trang vẫn thuộc ngày {dayMonth(date)}, chỉ dòng{' '}
              <strong className="font-semibold">Sửa lần cuối</strong> ghi thêm ngày sửa.
            </span>
            <span className="md:hidden">
              Đang sửa trang của {agoText}. Trang vẫn thuộc ngày {dayMonth(date)}.
            </span>
          </Notice>
        ) : null}

        {/* Máy tính: các trường nằm trong một thẻ. Điện thoại: nằm thẳng trên nền trang. */}
        <section
          aria-label="Nội dung trang"
          className="flex animate-rise flex-col gap-[22px] [animation-delay:.1s] md:gap-7 md:rounded-lg md:border-[1.5px] md:border-line md:bg-card md:p-[clamp(20px,4vw,32px)] md:shadow-ink"
        >
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0 md:gap-3">
            <Legend>Điểm của ngày</Legend>
            <ScorePicker
              iconSetId={iconSetId}
              value={draft.score}
              onChange={set('score')}
              caption="label"
              className="gap-1.5 sm:gap-2.5"
              itemClassName="max-md:min-h-[76px] max-md:rounded-[14px]"
            />
            {draft.score !== base.score ? (
              <p className="flex animate-pop flex-wrap items-center gap-1.5 text-xs leading-[18px] text-muted-foreground md:gap-2 md:text-[13px] md:leading-5">
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
            contentRows={5}
            flatOnPhone
            frequentIcons={frequentIcons}
          />

          <div className="flex flex-col gap-2 md:gap-2.5">
            <label htmlFor={`${ids}-kw`} className={fieldLabelClass}>
              Từ khóa
            </label>
            <InlineKeywordEditor keywords={draft.keywords} onChange={set('keywords')} inputId={`${ids}-kw`} />
          </div>

          <div className="flex flex-col gap-2 md:gap-2.5">
            <span id={`${ids}-photos`} className={fieldLabelClass}>
              Ảnh ·{' '}
              <span className="tabular-nums">
                {uploads.tiles.filter((t) => t.status !== 'rejected').length}/{tierLimits().photos.per_day_max}
              </span>
            </span>
            <PhotoUploader uploads={uploads} labelledBy={`${ids}-photos`} />
            {/* TODO(Bước 7): gửi ảnh qua presigned URL. Tới lúc đó ảnh thêm ở đây chưa được lưu. */}
            <p className="text-xs leading-[18px] text-muted-foreground">Lưu ảnh có ở bản sau; hiện chỉ lưu chữ, điểm, icon và cờ.</p>
          </div>
        </section>

        {autosave.restored ? (
          <Alert role="status">
            <AlertDescription>Đã khôi phục phần bạn sửa dở lần trước (chưa lưu). Bấm Lưu thay đổi để lưu, hoặc Hủy thay đổi để bỏ.</AlertDescription>
          </Alert>
        ) : null}
        <ConflictDialog conflict={autosave.conflict} onKeepMine={autosave.keepMine} onTakeTheirs={takeTheirs} />

        {/* Máy tính: thanh lưu dính đáy. Điện thoại: chỉ còn dòng trạng thái cuối trang (nút Lưu ở thanh trên). */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 transition-shadow max-md:-mt-1.5 md:sticky md:bottom-4 md:z-20 md:rounded-[18px] md:border-[1.5px] md:border-line md:bg-card md:py-3 md:pr-3 md:pl-5',
            dirty ? 'md:shadow-[4px_4px_0_var(--score-5)]' : 'md:shadow-ink',
          )}
        >
          <span
            role="status"
            className="inline-flex items-center gap-2 text-[13px] leading-5 text-muted-foreground md:gap-2.5 md:text-sm md:leading-[22px] md:font-medium md:text-foreground"
          >
            {statusDot}
            {status}
          </span>
          <div className="flex flex-wrap gap-2 max-md:hidden">
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
      </div>

      <ConfirmDialog
        open={confirmDiscard || leaving}
        onOpenChange={(open) => {
          if (open) return
          setConfirmDiscard(false)
          if (blocker.state === 'blocked') blocker.reset()
        }}
        title="Bỏ các thay đổi?"
        description={`Thay đổi ở ${lost} chưa được lưu và sẽ mất.`}
        cancelLabel="Tiếp tục sửa"
        cancelIsPrimary
        actionLabel={leaving ? 'Bỏ và rời trang' : 'Bỏ thay đổi'}
        onAction={() => (leaving ? blocker.proceed?.() : discard())}
      />

      {toast ? (
        <SavedToast onDone={hideToast} className="max-md:bottom-6">
          Đã lưu thay đổi cho trang {dayMonth(date)}
        </SavedToast>
      ) : null}
    </div>
  )
}

/** Màn sửa một trang cũ (thiết kế B9 · Sửa một trang cũ), lưu bằng PUT /entries/{day}. */
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
