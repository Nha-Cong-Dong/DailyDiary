import { Clock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Link, useBlocker } from 'react-router'
import { PhotoUploader } from '@/components/diary/PhotoUploader'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { usePhotoUploads } from '@/components/diary/usePhotoUploads'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { scoreLabel } from '@/lib/catalog'
import { isValidDate, longDateLabel, todayIn, useNow, type DateString } from '@/lib/date'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import { rich } from '@/lib/rich'
import type { DraftFields } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { fetchEntry, type DayEntry } from './entries'
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
import { deletePhoto, makeUploadPhoto, reorderPhotos } from './uploadPhoto'
import { useAutosave } from './useAutosave'
import { useDay } from './useDay'
import { useFrequentSubIcons } from './useFrequentSubIcons'
import { useT } from '@/lib/i18n'

type TFn = typeof import('@/lib/i18n').t

/** "Viết lúc 21:20, 16/10/2026 · Sửa lần cuối 21:15, 18/10, 2 ngày sau". */
function metaLine(t: TFn, entry: DayEntry, timeZone: string): string {
  const written = t('entry:edit.metaWritten', { when: dateTimeLabel(timeZone, entry.created_at) })
  if (entry.updated_at === entry.created_at) return written
  const editedDay = todayIn(timeZone, new Date(entry.updated_at))
  const late = daysBetween(entry.entry_date, editedDay)
  const time = dateTimeLabel(timeZone, entry.updated_at, false)
  const when = late > 0 ? t('entry:edit.metaLate', { time, count: late }) : t('entry:edit.metaSameDay', { time })
  return t('entry:edit.metaLine', { written, when })
}

function EditForm({ entry, today }: { entry: DayEntry; today: DateString }) {
  const t = useT()
  const { timeZone, iconSetId } = useProfile()
  const ids = useId()
  const date = entry.entry_date
  const [record, setRecord] = useState(entry)
  const [base, setBase] = useState<EntryDraft>(() => draftOf(entry))
  const [draft, setDraft] = useState<EntryDraft>(base)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [toast, setToast] = useState(false)
  const [savedNow, setSavedNow] = useState(false)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const client = useQueryClient()
  // Ảnh tải lên được gắn vào trang ngay khi xác nhận (cache Trang ngày cập nhật theo), nhưng trên màn này vẫn là
  // "thay đổi chưa lưu": Hủy thay đổi / rời trang thì xóa ảnh vừa thêm; Lưu thay đổi mới xóa ảnh đã bỏ và chốt thứ tự.
  const upload = useMemo(
    () =>
      makeUploadPhoto(date, (next) =>
        client.setQueryData<DayEntry | null>(['entries', date], (old) => (old ? { ...old, photos: next.photos } : old)),
      ),
    [client, date],
  )
  const uploads = usePhotoUploads(base.photos, upload)
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
  const saving = autosave.status.kind === 'saving' || photoSaving
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

  /** Ảnh thêm ở màn này mà chưa bấm Lưu: bỏ thay đổi thì xóa khỏi trang và kho. */
  async function dropNewPhotos() {
    const added = uploads.photos.filter((p) => !base.photos.some((b) => b.id === p.id))
    await Promise.allSettled(added.map((p) => deletePhoto(p.id)))
    if (added.length) void client.invalidateQueries({ queryKey: ['entries', date] })
  }

  async function save() {
    setPhotoError(null)
    if (changes.includes('photos')) {
      setPhotoSaving(true)
      try {
        const kept = new Set(uploads.photos.map((p) => p.id))
        for (const p of base.photos) if (!kept.has(p.id)) await deletePhoto(p.id)
        if (uploads.photos.length) await reorderPhotos(date, uploads.photos.map((p) => p.id))
      } catch {
        setPhotoError(t('entry:edit.photoSaveFailed'))
        return
      } finally {
        setPhotoSaving(false)
      }
    }
    if (changes.some((f) => f !== 'photos')) {
      await autosave.flush() // lưu xong thì onSaved → adopt() lấy luôn ảnh mới nhất từ máy chủ
      return
    }
    const fresh = await fetchEntry(date).catch(() => null)
    if (fresh) {
      client.setQueryData(['entries', date], fresh)
      adopt(fresh)
      setSavedNow(true)
      setToast(true)
    }
  }

  /** "Dùng bản vừa sửa" khi xung đột: bản máy chủ thành bản gốc lẫn bản đang sửa. */
  function takeTheirs() {
    const theirs = autosave.conflict?.theirs
    autosave.takeTheirs()
    if (theirs) adopt(theirs)
  }

  function discard() {
    void dropNewPhotos()
    setDraft(base)
    uploads.reset(base.photos)
    autosave.discard()
    setConfirmDiscard(false)
  }

  const ago = daysBetween(date, today)
  const agoText = ago === 1 ? t('entry:ago.yesterday') : t('entry:ago.days', { count: ago })
  const status = saving
    ? t('entry:saving')
    : autosave.status.kind === 'error'
      ? autosave.status.message
      : autosave.status.kind === 'unsynced'
        ? t('entry:edit.status.unsynced')
    : uploads.uploading
    ? t('entry:edit.status.uploading')
    : changes.length
      ? t('entry:edit.status.changes', { count: changes.length })
      : savedNow
        ? t('entry:edit.status.savedAt', { time: dateTimeLabel(timeZone, record.updated_at, false) })
        : t('entry:edit.status.none')
  const leaving = blocker.state === 'blocked'
  const lost = fieldsLabel(changes.length ? changes : ['photos'])

  const statusDot = (
    <span
      aria-hidden="true"
      className={cn(
        'size-[9px] rounded-full border-[1.5px] border-stroke md:size-2.5',
        dirty ? 'animate-pulse-3 bg-score-5' : savedNow ? 'bg-sage' : 'bg-sunk',
      )}
    />
  )

  return (
    // Điện thoại (B10 · Sửa trang): trình sửa toàn màn, có thanh Hủy / Lưu riêng, không có thanh tab dưới.
    <div className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-y-auto max-md:bg-paper">
      <PhoneBar
        start={
          // Còn thay đổi chưa lưu thì useBlocker chặn và hỏi "Bỏ và rời trang".
          <Link to={`/day/${date}`} className={cn(phoneIconButton, 'w-auto px-2.5 text-[15px] font-medium')}>
            {t('entry:cancel')}
          </Link>
        }
        title={t('entry:edit.phoneTitle', { day: dayMonth(date) })}
        heading
        end={
          <Button onClick={save} disabled={!canSave} className="mr-1.5 h-[38px] rounded-[12px] px-4">
            {t('entry:save')}
          </Button>
        }
      />

      {/* scroll-mb: ô đang nhập không bị thanh lưu dính đáy (máy tính) che khi được cuộn tới. */}
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-[22px] max-md:px-4 max-md:pt-[76px] max-md:pb-10 md:[&_:is(input,textarea,button)]:scroll-mb-24">
        <BackLink to={`/day/${date}`} className="max-md:hidden">
          {t('entry:edit.backLink', { day: dayMonth(date) })}
        </BackLink>

        <div className="flex animate-rise flex-col gap-1 md:gap-1.5">
          <p className="text-[13px] leading-5 text-ink-soft md:text-sm md:leading-[22px]">{longDateLabel(date)}</p>
          <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold max-md:hidden">{t('entry:edit.heading')}</h1>
          <p className="inline-flex items-center gap-1.5 text-xs leading-[18px] text-ink-soft tabular-nums md:text-[13px] md:leading-5">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            {metaLine(t, record, timeZone)}
          </p>
        </div>

        {ago > 0 ? (
          <Notice className="animate-rise [animation-delay:.05s] max-md:rounded-[12px] max-md:px-3 max-md:py-2.5 max-md:text-[13px] max-md:leading-5">
            <span className="max-md:hidden">
              {rich(t('entry:edit.noticeLong', { ago: agoText, day: dayMonth(date) }), {
                b: (c) => <strong className="font-semibold">{c}</strong>,
              })}
            </span>
            <span className="md:hidden">
              {t('entry:edit.noticeShort', { ago: agoText, day: dayMonth(date) })}
            </span>
          </Notice>
        ) : null}

        {/* Máy tính: các trường nằm trong một thẻ. Điện thoại: nằm thẳng trên nền trang. */}
        <section
          aria-label={t('entry:edit.sectionAria')}
          className="flex animate-rise flex-col gap-[22px] [animation-delay:.1s] md:gap-7 md:rounded-lg md:border-[1.5px] md:border-stroke md:bg-card md:p-[clamp(20px,4vw,32px)] md:shadow-md"
        >
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0 md:gap-3">
            <Legend>{t('entry:edit.scoreLegend')}</Legend>
            <ScorePicker
              iconSetId={iconSetId}
              value={draft.score}
              onChange={set('score')}
              caption="label"
              className="gap-1.5 sm:gap-2.5"
              itemClassName="max-md:min-h-[76px] max-md:rounded-[14px]"
            />
            {draft.score !== base.score ? (
              <p className="flex animate-pop flex-wrap items-center gap-1.5 text-xs leading-[18px] text-ink-soft md:gap-2 md:text-[13px] md:leading-5">
                {t('entry:edit.scoreChanged', {
                  from: base.score,
                  fromLabel: scoreLabel(iconSetId, base.score),
                  to: draft.score,
                  toLabel: scoreLabel(iconSetId, draft.score),
                })}
                <button
                  type="button"
                  onClick={() => set('score')(base.score)}
                  className="link-underline cursor-pointer py-0.5 font-semibold text-ink focus-visible:outline-3 focus-visible:outline-focus"
                >
                  {t('entry:undo')}
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
            titlePlaceholder={t('entry:edit.titlePlaceholder')}
            contentPlaceholder={t('entry:edit.contentPlaceholder')}
            contentRows={5}
            flatOnPhone
            frequentIcons={frequentIcons}
          />

          <div className="flex flex-col gap-2 md:gap-2.5">
            <label htmlFor={`${ids}-kw`} className={fieldLabelClass}>
              {t('entry:edit.keywords')}
            </label>
            <InlineKeywordEditor keywords={draft.keywords} onChange={set('keywords')} inputId={`${ids}-kw`} />
          </div>

          <div className="flex flex-col gap-2 md:gap-2.5">
            <span id={`${ids}-photos`} className={fieldLabelClass}>
              {t('entry:edit.photos')}{' '}
              <span className="tabular-nums">
                {uploads.tiles.filter((tile) => tile.status !== 'rejected').length}/{tierLimits().photos.per_day_max}
              </span>
            </span>
            <PhotoUploader uploads={uploads} labelledBy={`${ids}-photos`} />
            {photoError ? (
              <p role="alert" className="text-[13px] leading-5 font-medium text-danger">
                {photoError}
              </p>
            ) : null}
          </div>
        </section>

        {autosave.restored ? (
          <Alert role="status">
            <AlertDescription>{t('entry:edit.restoredDraft')}</AlertDescription>
          </Alert>
        ) : null}
        <ConflictDialog conflict={autosave.conflict} onKeepMine={autosave.keepMine} onTakeTheirs={takeTheirs} />

        {/* Máy tính: thanh lưu dính đáy. Điện thoại: chỉ còn dòng trạng thái cuối trang (nút Lưu ở thanh trên). */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 transition-shadow max-md:-mt-1.5 md:sticky md:bottom-4 md:z-20 md:rounded-[18px] md:border-[1.5px] md:border-stroke md:bg-card md:py-3 md:pr-3 md:pl-5',
            dirty ? 'md:shadow-[4px_4px_0_var(--score-5)]' : 'md:shadow-md',
          )}
        >
          <span
            role="status"
            className="inline-flex items-center gap-2 text-[13px] leading-5 text-ink-soft md:gap-2.5 md:text-sm md:leading-[22px] md:font-medium md:text-ink"
          >
            {statusDot}
            {status}
          </span>
          <div className="flex flex-wrap gap-2 max-md:hidden">
            {dirty ? (
              <Button variant="outline" onClick={() => setConfirmDiscard(true)}>
                {t('entry:edit.discard')}
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to={`/day/${date}`}>{t('entry:backfill.viewPage')}</Link>
              </Button>
            )}
            <Button onClick={save} disabled={!canSave}>
              {t('entry:edit.saveChanges')}
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
        title={t('entry:edit.confirmTitle')}
        description={t('entry:edit.confirmDescription', { fields: lost })}
        cancelLabel={t('entry:edit.keepEditing')}
        cancelIsPrimary
        actionLabel={leaving ? t('entry:edit.discardLeave') : t('entry:edit.discardAction')}
        onAction={() => {
          if (!leaving) return discard()
          void dropNewPhotos()
          blocker.proceed?.()
        }}
      />

      {toast ? (
        <SavedToast onDone={hideToast} className="max-md:bottom-6">
          {t('entry:edit.savedToast', { day: dayMonth(date) })}
        </SavedToast>
      ) : null}
    </div>
  )
}

/** Màn sửa một trang cũ (thiết kế B9 · Sửa một trang cũ), lưu bằng PUT /entries/{day}. */
export function EditEntry({ date }: { date: string }) {
  const t = useT()
  const { timeZone } = useProfile()
  const now = useNow()
  const today = todayIn(timeZone, now)
  const valid = isValidDate(date)
  const { data: entry, isPending, isError } = useDay(date)

  const frame = (children: ReactNode) => (
    <div className="mx-auto flex w-full max-w-[680px] flex-col items-start gap-4">
      <BackLink to="/timeline">{t('entry:timeline')}</BackLink>
      {children}
    </div>
  )

  if (!valid) {
    return frame(
      <>
        <h1 className="text-title font-bold">{t('entry:invalidDay.title')}</h1>
        <p className="text-ink-soft">{t('entry:invalidDay.hint', { path: '/day/2026-10-18/edit' })}</p>
      </>,
    )
  }
  if (date > today) {
    return frame(
      <>
        <h1 className="text-title font-bold">{longDateLabel(date)}</h1>
        <p className="text-ink-soft">{t('entry:edit.futureDay')}</p>
      </>,
    )
  }
  if (isPending) {
    return frame(
      <p role="status" className="text-ink-soft">
        {t('entry:opening')}
      </p>,
    )
  }
  if (isError) {
    return frame(
      <Alert variant="destructive">
        <AlertDescription>{t('entry:openFailed')}</AlertDescription>
      </Alert>,
    )
  }
  if (!entry) {
    return frame(
      <>
        <h1 className="text-title font-bold">{t('entry:edit.emptyTitle')}</h1>
        <p className="text-ink-soft">{t('entry:edit.emptyHint')}</p>
        <Button asChild>
          <Link to={date === today ? '/today' : `/day/${date}/backfill`}>{date === today ? t('entry:writeToday') : t('entry:edit.backfillThis')}</Link>
        </Button>
      </>,
    )
  }
  return <EditForm key={date} entry={entry} today={today} />
}
