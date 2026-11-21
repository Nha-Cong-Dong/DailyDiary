import { useMemo, useState } from 'react'
import { Camera, HeartOff, LoaderCircle, Save, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/layout/Avatar'
import { PhotoTile } from '@/components/diary/PhotoViewer'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { SubIconPicker } from '@/components/diary/SubIconPicker'
import { FlagPicker } from '@/components/diary/FlagPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Segmented } from '@/components/ui/segmented'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useT } from '@/lib/i18n'
import { todayIn } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { tierLimits } from '@/lib/limits'
import { ApiError } from '@/api/client'
import { useEndJournal, useJournalDetail, useJournalEntries, useRefreshJournalEntries, useSaveSharedEntry, useSetJournalMode } from '../useSocial'
import { deleteSharedPhoto, makeSharedPhotoUpload } from '../sharedPhotoUpload'
import type { SharedEntry, Journal } from '../social'

export function JournalDetail({ journal, onBack }: { journal: Journal; onBack: () => void }) {
  const t = useT()
  const detail = useJournalDetail(journal.id)
  const profile = useProfile()
  const entries = useJournalEntries(journal.id)
  const refresh = useRefreshJournalEntries(journal.id)
  const endJournal = useEndJournal()
  const setMode = useSetJournalMode(journal.id)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const partner = detail.data?.partner_display_name ?? journal.partner_display_name

  if (detail.isPending) return <Card className="p-6"><span className="skeleton block h-7 w-48" /></Card>
  if (detail.isError || !detail.data)
    return (
      <Card className="p-6">
        <p className="text-danger">{t('social:states.error')}</p>
        <Button className="mt-3" variant="outline" onClick={() => detail.refetch()}>
          {t('social:states.retry')}
        </Button>
      </Card>
    )

  const allEntries = entries.data?.pages.flatMap((page) => page.entries) ?? []
  const mine = allEntries.filter((entry) => entry.mine)
  const theirs = allEntries.filter((entry) => !entry.mine)
  const today = todayIn(profile.timeZone)
  const myToday = mine.find((entry) => entry.entry_date === today) ?? null
  const mode = detail.data.mode === 'alternating' ? 'alternating' : 'together'
  const isAlternate = mode === 'alternating'
  const myTurn = !isAlternate || detail.data.my_turn
  const active = !journal.ended_at

  return (
    <section className="animate-rise scroll-mt-6">
      <Button variant="ghost" onClick={onBack}>← {t('social:detail.back')}</Button>
      <Card className="mt-3 overflow-hidden">
        <header className="flex flex-wrap items-center gap-4 border-b border-line-soft bg-lavender-soft/40 p-5">
          <Avatar name={partner} src={detail.data.partner_avatar_url} size={58} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[24px] font-bold">{partner}</h2>
            <p className="text-label text-ink-soft">
              {detail.data.members.length} {t('social:detail.members')} · {journal.warm_streak} {t('social:journals.warm')}
              {journal.warm_streak >= 30 ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">{t('social:journals.milestone', { n: journal.warm_streak })}</span> : null}
            </p>
          </div>
          {journal.ended_at ? (
            <span className="rounded-full bg-sunk px-3 py-1 text-label text-ink-soft">{t('social:detail.ended')}</span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirmEnd(true)}>
              <HeartOff className="size-4" />
              {t('social:detail.endJournal')}
            </Button>
          )}
        </header>

        {endJournal.isSuccess ? <Alert className="m-5"><AlertDescription>{t('social:detail.endedToast')}</AlertDescription></Alert> : null}

        {active ? (
          <div className="flex flex-wrap items-center gap-4 border-b border-line-soft px-5 py-4">
            <Segmented
              value={mode}
              onChange={(value) => { if (value !== mode) setMode.mutate(value) }}
              ariaLabel={t('social:detail.mode.label')}
              options={[
                { value: 'together', label: t('social:detail.mode.together') },
                { value: 'alternating', label: t('social:detail.mode.alternating') },
              ] as const}
            />
            <p className="text-label text-ink-soft">{t('social:detail.mode.hint')}</p>
          </div>
        ) : null}

        {active && myTurn ? <SharedEntryForm journalId={journal.id} today={today} initial={myToday} onSync={refresh} /> : null}
        {active && !myTurn ? (
          <Alert className="m-5">
            <AlertDescription>{t('social:detail.theirTurn', { name: partner })}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <FeedColumn heading={t('social:detail.myColumn')} entries={mine} emptyLabel={t('social:detail.empty')} loading={entries.isPending} />
          <FeedColumn heading={t('social:detail.theirColumn', { name: partner })} entries={theirs} emptyLabel={t('social:detail.empty')} loading={entries.isPending} />
        </div>
        {entries.hasNextPage && !entries.isFetchingNextPage ? (
          <div className="px-5 pb-5">
            <Button variant="outline" size="sm" className="w-full" onClick={() => void entries.fetchNextPage()}>
              {t('social:detail.loadMore')}
            </Button>
          </div>
        ) : null}

        <div className="border-t border-line-soft p-5">
          <SharedPhotos journalId={journal.id} day={today} entry={myToday} onChanged={refresh} />
        </div>
      </Card>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('social:detail.endTitle', { name: partner })}</AlertDialogTitle>
            <AlertDialogDescription>{t('social:detail.endBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('social:detail.endCancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => endJournal.mutate(journal.id, { onSettled: () => setConfirmEnd(false) })}>
              {t('social:detail.endConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/**
 * Form ghi/xóa mục hôm nay của tôi. Bản nháp giữ `updated_at` gốc (baseVersion); lưu kèm baseVersion để backend
 * báo 409 ENTRY_CONFLICT khi có ai sửa ở nơi khác. Nút "Đồng bộ và thử lại" tải bản mới nhất rồi lấy làm bản nháp
 * (không xóa chữ đang gõ trong trường hợp thường — chỉ đồng bộ khi người dùng xin đồng bộ sau xung đột).
 */
function SharedEntryForm({ journalId, today, initial, onSync }: { journalId: string; today: string; initial: SharedEntry | null; onSync: () => void }) {
  const t = useT()
  const profile = useProfile()
  const save = useSaveSharedEntry(journalId, today)
  const [score, setScore] = useState<number | null>(initial?.score ?? null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [subIcon, setSubIcon] = useState(initial?.sub_icon ?? null)
  const [flag, setFlag] = useState(initial?.flag_color ?? null)
  const [baseVersion, setBaseVersion] = useState<string | null>(initial?.updated_at ?? null)
  const [awaitSync, setAwaitSync] = useState(false)
  const limits = tierLimits().shared
  const isConflict = save.error instanceof ApiError && save.error.code === 'ENTRY_CONFLICT'

  // "Đồng bộ và thử lại": chỉ khi refetch mang bản máy chủ mới (base thay đổi) thì lấy lại giá trị máy chủ làm
  // bản nháp — cập nhật state ngay trong render (không dùng effect) nên không mất chữ khi refetch do thêm/xóa ảnh.
  const base = initial?.updated_at ?? null
  if (awaitSync && base !== baseVersion) {
    setAwaitSync(false)
    setBaseVersion(base)
    setScore(initial?.score ?? null)
    setTitle(initial?.title ?? '')
    setContent(initial?.content ?? '')
    setSubIcon(initial?.sub_icon ?? null)
    setFlag(initial?.flag_color ?? null)
  }

  return (
    <form
      className="space-y-5 border-b border-line-soft p-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (score) save.mutate({ score, title: title || null, content: content || null, sub_icon: subIcon, flag_color: flag, updated_at: baseVersion }, { onSuccess: (entry) => setBaseVersion(entry.updated_at) })
      }}
    >
      <div>
        <h3 className="font-semibold">{t('social:detail.write')}</h3>
        <p className="mt-1 text-label text-ink-soft">{today}</p>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t('social:detail.score')}</legend>
        <ScorePicker iconSetId={profile.iconSetId} value={score as 1 | 2 | 3 | 4 | 5 | null} onChange={setScore} />
      </fieldset>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="se-title">{t('social:detail.title')}</label>
          <Input id="se-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={limits.title_max} placeholder={t('social:detail.titlePlaceholder', { max: limits.title_max })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="se-content">{t('social:detail.content')}</label>
          <Textarea id="se-content" value={content} onChange={(e) => setContent(e.target.value)} maxLength={limits.content_max} rows={3} placeholder={t('social:detail.contentPlaceholder', { max: limits.content_max })} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t('social:detail.subIcon')}</p>
        <SubIconPicker value={subIcon} onChange={setSubIcon} />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t('social:detail.flagColor')}</p>
        <FlagPicker value={flag} onChange={setFlag} form />
      </div>
      {isConflict ? (
        <Alert variant="destructive">
          <AlertDescription>{t('social:detail.conflict')}</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" type="button" onClick={() => { save.reset(); setAwaitSync(true); onSync() }}>
              {t('social:detail.conflictRetry')}
            </Button>
          </AlertAction>
        </Alert>
      ) : save.error ? (
        <Alert variant="destructive"><AlertDescription>{save.error.message}</AlertDescription></Alert>
      ) : null}
      <Button type="submit" disabled={!score || save.isPending}>
        {save.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        {save.isSuccess ? t('social:detail.saved') : t('social:detail.save')}
      </Button>
    </form>
  )
}

function FeedColumn({ heading, entries, emptyLabel, loading }: { heading: string; entries: SharedEntry[]; emptyLabel: string; loading: boolean }) {
  const t = useT()
  return (
    <div>
      <h3 className="font-semibold">{heading}</h3>
      {loading ? (
        <div className="mt-3 space-y-3">
          <span className="skeleton block h-24" />
          <span className="skeleton block h-24" />
        </div>
      ) : entries.length ? (
        <div className="mt-3 space-y-3">
          {entries.map((entry) => (
            <article key={`${entry.entry_date}-${entry.author_display_name}`} className="rounded-md border border-line-soft bg-paper p-4">
              <div className="flex items-center gap-2">
                <Avatar name={entry.author_display_name} src={entry.author_avatar_url} size={30} />
                <p className="text-label font-semibold">{entry.mine ? t('social:detail.mine') : entry.author_display_name} · {entry.entry_date}</p>
                <span className="ml-auto nums font-bold">{entry.score}/5</span>
              </div>
              {entry.title ? <h4 className="mt-3 font-semibold">{entry.title}</h4> : null}
              {entry.content ? <p className="mt-1 whitespace-pre-wrap text-body text-ink-soft">{entry.content}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 py-5 text-center text-body text-ink-soft">{emptyLabel}</p>
      )}
    </div>
  )
}

function SharedPhotos({ journalId, day, entry, onChanged }: { journalId: string; day: string; entry: SharedEntry | null; onChanged: () => void }) {
  const t = useT()
  const photos = entry?.photos ?? []
  const upload = useMemo(() => makeSharedPhotoUpload(journalId, day), [journalId, day])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const maxPhotos = tierLimits().shared.photos_per_entry_max
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t('social:photos.title')}</h3>
          <p className="text-label text-ink-soft">{!entry ? t('social:photos.needsEntry') : t('social:photos.limit', { count: maxPhotos })}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-stroke px-3 py-2 text-sm font-semibold">
          <Camera className="size-4" />
          {busy ? t('social:photos.uploading') : t('social:photos.add')}
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            disabled={busy || photos.length >= maxPhotos || !entry}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setBusy(true)
              setFailed(false)
              try {
                await upload(file, () => undefined, new AbortController().signal)
                onChanged()
              } catch {
                setFailed(true)
              } finally {
                setBusy(false)
                e.target.value = ''
              }
            }}
          />
        </label>
      </div>
      {failed ? <p className="mt-2 text-label text-danger">{t('social:photos.failed')}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <PhotoTile photo={{ id: photo.id, label: t('social:photos.title'), url: photo.url, thumbUrl: photo.thumb_url, width: photo.width, height: photo.height }} index={photo.position} total={photos.length} onOpen={() => undefined} />
            <button
              type="button"
              aria-label={t('social:photos.remove')}
              className="absolute right-2 top-2 rounded-full bg-card p-2 shadow-sm"
              onClick={async () => {
                await deleteSharedPhoto(photo.id)
                onChanged()
              }}
            >
              <Trash2 className="size-4 text-danger" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
