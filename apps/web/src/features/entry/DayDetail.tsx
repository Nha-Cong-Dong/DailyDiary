import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Link2, Pencil, Share2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { KeywordChip } from '@/components/diary/KeywordChip'
import { MoodMark } from '@/components/diary/MoodMark'
import { PhotoTile, PhotoViewer } from '@/components/diary/PhotoViewer'
import { Toast } from '@/components/diary/Toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel } from '@/lib/catalog'
import { addDays, dayOfMonth, editedOnTheDay, isValidDate, longDateLabel, shortDateLabel, timeIn, todayIn, useNow } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { ConfirmDialog, PhoneBar, phoneIconButton } from './components/EntryFormParts'
import { saveErrorMessage, useDeleteEntry, useRestoreEntry, type EntryDeleted } from './entries'
import { useDay } from './useDay'

const pill = 'inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3 text-sm font-medium'

/** "Thứ Bảy 17/10" → nút sang ngày bên cạnh; ngày sau hôm nay thì khóa. */
function DayStep({ date, dir, disabled }: { date: string; dir: 'prev' | 'next'; disabled: boolean }) {
  const label = shortDateLabel(date)
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(pill, 'border-[1.5px] border-dashed border-border text-faint', dir === 'prev' ? 'pl-2.5' : 'pr-2.5')}
      >
        {dir === 'next' ? label : null}
        <Icon className="size-[18px]" aria-hidden="true" />
        {dir === 'prev' ? label : null}
        <span className="sr-only">, chưa tới</span>
      </span>
    )
  }
  return (
    <Link
      to={`/day/${date}`}
      aria-label={`${dir === 'prev' ? 'Ngày trước' : 'Ngày sau'}: ${label}`}
      className={cn(pill, 'lift border-[1.5px] border-line bg-card shadow-ink-sm focus-visible:outline-3 focus-visible:outline-ring', dir === 'prev' ? 'pl-2.5' : 'pr-2.5')}
    >
      {dir === 'prev' ? <Icon className="size-[18px]" aria-hidden="true" /> : null}
      {label}
      {dir === 'next' ? <Icon className="size-[18px]" aria-hidden="true" /> : null}
    </Link>
  )
}

/** Điều khiển Chia sẻ do trang ghép vào (features/share): link đang bật không, và mở hộp thoại. */
export type DayShareControls = { active: boolean; open: () => void }

/** Trang chi tiết một ngày (thiết kế B7 · Chi tiết một ngày; nút và chip Chia sẻ theo B8). */
export function DayDetail({ date, share }: { date: string; share?: DayShareControls }) {
  const { timeZone, iconSetId } = useProfile()
  const dark = useDarkMode()
  const now = useNow()
  const navigate = useNavigate()
  const today = todayIn(timeZone, now)
  const valid = isValidDate(date)
  const { data: entry, isPending, isError } = useDay(date)
  const [photo, setPhoto] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  // Xóa mềm (F-01): DELETE /entries/{day}; khôi phục bằng POST …/restore trước `restore_until`.
  const deleteEntry = useDeleteEntry(date)
  const restoreEntry = useRestoreEntry(date)
  const [deleted, setDeleted] = useState<EntryDeleted | null>(null)
  const [toast, setToast] = useState(false)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(false), 8000)
    return () => window.clearTimeout(t)
  }, [toast])

  function restore() {
    restoreEntry.mutate(date, {
      onSuccess: () => {
        setDeleted(null)
        setToast(false)
      },
    })
  }

  const back = (
    <Link to="/timeline" className={cn(pill, 'press pl-2 focus-visible:outline-3 focus-visible:outline-ring')}>
      <ArrowLeft className="size-[18px]" aria-hidden="true" />
      Dòng thời gian
    </Link>
  )

  if (!valid) {
    return (
      <div className="mx-auto flex max-w-[680px] flex-col items-start gap-4">
        {back}
        <h1 className="text-title font-bold">Ngày không hợp lệ</h1>
        <p className="text-muted-foreground">Địa chỉ cần có dạng /day/2026-10-18, và là một ngày có thật.</p>
      </div>
    )
  }

  const future = date > today
  const prev = addDays(date, -1)
  const next = addDays(date, 1)
  const hasEntry = !!entry && !deleted && !isPending && !isError && !future
  const editTo = date === today ? '/today' : `/day/${date}/edit`

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6">
      {/* Điện thoại (B10 · Chi tiết ngày): thanh trên riêng — về Dòng thời gian, ngày, Chia sẻ và Sửa. */}
      <PhoneBar
        start={
          <Link to="/timeline" aria-label="Về Dòng thời gian" className={phoneIconButton}>
            <ArrowLeft className="size-[22px]" aria-hidden="true" />
          </Link>
        }
        title={`${dayOfMonth(date)}/${Number(date.slice(5, 7))}/${date.slice(0, 4)}`}
        end={
          hasEntry ? (
            <>
              {share ? (
                <button type="button" aria-label="Chia sẻ trang này" aria-haspopup="dialog" onClick={share.open} className={phoneIconButton}>
                  <Share2 className="size-[21px]" aria-hidden="true" />
                </button>
              ) : null}
              <Link to={editTo} aria-label="Sửa trang này" className={phoneIconButton}>
                <Pencil className="size-[21px]" aria-hidden="true" />
              </Link>
            </>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 max-md:hidden">
        {back}
        <nav aria-label="Ngày bên cạnh" className="flex gap-2">
          <DayStep date={prev} dir="prev" disabled={false} />
          <DayStep date={next} dir="next" disabled={next > today} />
        </nav>
      </div>

      {deleteEntry.isError || restoreEntry.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{saveErrorMessage(deleteEntry.error ?? restoreEntry.error)}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <p className="text-muted-foreground" role="status">
          Đang mở trang…
        </p>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>Không mở được trang này. Thử tải lại.</AlertDescription>
        </Alert>
      ) : future ? (
        <section className="flex flex-col gap-2 rounded-lg border-[1.5px] border-dashed border-border bg-muted p-8">
          <h1 className="text-heading font-bold">{longDateLabel(date)}</h1>
          <p className="text-muted-foreground">Ngày này chưa tới. Hẹn bạn hôm đó nhé.</p>
        </section>
      ) : deleted ? (
        <section className="flex flex-col items-start gap-3 rounded-lg border-[1.5px] border-dashed border-border bg-muted p-8">
          <h1 className="text-heading font-bold">{longDateLabel(date)}</h1>
          <p className="text-muted-foreground">
            Đã xóa trang này. Khôi phục được tới {shortDateLabel(todayIn(timeZone, new Date(deleted.restore_until)))}.
          </p>
          <Button variant="secondary" onClick={restore} disabled={restoreEntry.isPending}>
            Khôi phục trang
          </Button>
        </section>
      ) : !entry ? (
        <section className="flex flex-col items-start gap-3 rounded-lg border-[1.5px] border-dashed border-border bg-muted p-8">
          <h1 className="text-heading font-bold">{longDateLabel(date)}</h1>
          <p className="text-muted-foreground">Ngày này chưa ghi.</p>
          {date === today ? (
            <Button onClick={() => navigate('/today')}>Viết cho hôm nay</Button>
          ) : (
            <Button onClick={() => navigate(`/day/${date}/backfill`)}>Ghi bù ngày này</Button>
          )}
        </section>
      ) : (
        // Điện thoại: không có khung thẻ, dải cờ tràn hết bề ngang ngay dưới thanh trên.
        <article className="animate-rise overflow-hidden max-md:-mx-4 max-md:-mt-4 md:rounded-[24px] md:border-[1.5px] md:border-line md:bg-card md:shadow-[5px_5px_0_var(--ink-shadow)]">
          <div
            className="h-24 border-b-[1.5px] border-line bg-secondary md:h-[120px]"
            style={entry.flag_color ? { backgroundColor: flagHex(entry.flag_color, dark) } : undefined}
          />
          <div className="flex flex-col gap-4 px-4 pb-2 md:gap-[18px] md:px-[clamp(20px,4vw,40px)] md:pb-10">
            <div className="-mt-11 flex flex-wrap items-end justify-between gap-4 md:-mt-[52px]">
              <span className="flex size-[88px] items-center justify-center rounded-full border-[1.5px] border-line bg-card md:size-[104px]">
                <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={64} className="md:hidden" />
                <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={76} className="max-md:hidden" />
              </span>
              <div className="flex flex-wrap gap-2 max-md:hidden">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 px-3"
                  onClick={() => navigate(editTo)}
                >
                  <Pencil aria-hidden="true" /> Sửa
                </Button>
                {share ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-haspopup="dialog"
                    className="h-10 px-3"
                    onClick={share.open}
                  >
                    <Share2 aria-hidden="true" /> Chia sẻ
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  size="icon"
                  className="size-10 rounded-[12px] shadow-none"
                  aria-label="Xóa nhật ký ngày này"
                  onClick={() => setConfirming(true)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1 md:gap-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-[13px] leading-5 text-muted-foreground md:text-sm md:leading-[22px]">
                  {longDateLabel(date)} · Điểm {entry.score} · {scoreLabel(iconSetId, entry.score)}
                </p>
                {share?.active ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={share.open}
                    className="inline-flex h-7 animate-pop cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line bg-secondary pr-2.5 pl-2 text-xs font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px"
                  >
                    <Link2 className="size-3.5" aria-hidden="true" />
                    Đang chia sẻ
                  </button>
                ) : null}
              </div>
              {entry.title ? (
                <h1 className="text-[25px] leading-8 font-bold md:text-[clamp(26px,3vw,32px)] md:leading-[1.25]">{entry.title}</h1>
              ) : null}
              <p className="inline-flex items-center gap-1.5 text-xs leading-[18px] text-muted-foreground tabular-nums md:text-[13px] md:leading-5">
                <Clock className="size-3.5" aria-hidden="true" />
                Tạo {timeIn(timeZone, new Date(entry.created_at))} · Sửa lần cuối {timeIn(timeZone, new Date(entry.updated_at))},{' '}
                {editedOnTheDay(date, entry.updated_at, timeZone) ? 'ghi đúng ngày' : 'cập nhật muộn'}
              </p>
            </div>

            {entry.content ? (
              <div className="ruled flex flex-col gap-[30px] text-[17px] leading-[30px] md:gap-8 md:text-reading md:leading-8">
                {entry.content.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">Chỉ chấm điểm, chưa viết thêm.</p>
            )}

            {entry.keywords.length ? (
              <ul aria-label="Từ khóa" className="flex flex-wrap gap-2">
                {entry.keywords.map((k) => (
                  <li key={k}>
                    {/* Từ khóa đi qua state của router, không lên URL (Project_Specs F-05). */}
                    <Link
                      to="/search"
                      state={{ q: k }}
                      className="press inline-flex rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <KeywordChip>{k}</KeywordChip>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {entry.photos.length ? (
              <section aria-labelledby="day-photos" className="flex flex-col gap-2 md:gap-2.5">
                <h2 id="day-photos" className="font-sans text-sm leading-5 font-semibold md:leading-[22px]">
                  Ảnh · {entry.photos.length}
                </h2>
                {/* Điện thoại: 2 cột, ảnh đầu rộng hết hàng 16:9, các ảnh sau vuông (B10). */}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] md:gap-3">
                  {entry.photos.map((p, i) => (
                    <PhotoTile
                      key={p.id}
                      photo={p}
                      index={i}
                      total={entry.photos.length}
                      onOpen={() => setPhoto(i)}
                      className={cn(i === 0 ? 'max-md:col-span-2 max-md:aspect-video' : 'max-md:aspect-square', 'max-md:gap-1')}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Điện thoại: Xóa nằm cuối trang thay cho nút thùng rác trên hàng nút. */}
            <Button
              variant="outline"
              onClick={() => setConfirming(true)}
              className="mt-2 h-11 rounded-[12px] border-destructive text-sm font-semibold text-destructive hover:bg-destructive-soft md:hidden"
            >
              <Trash2 className="size-[18px]" aria-hidden="true" />
              Xóa trang này
            </Button>
          </div>
        </article>
      )}

      {entry ? <PhotoViewer photos={entry.photos} index={photo} onIndexChange={setPhoto} /> : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Xóa nhật ký ngày ${dayOfMonth(date)}/${Number(date.slice(5, 7))}?`}
        description={`Điểm, nội dung${entry?.photos.length ? ` và ${entry.photos.length} ảnh` : ''} của ngày này sẽ được chuyển vào thùng rác. Khôi phục được trong 30 ngày.${share?.active ? ' Link chia sẻ của trang này sẽ tắt.' : ''}`}
        cancelLabel="Giữ lại"
        actionLabel="Xóa nhật ký"
        onAction={() => {
          setConfirming(false)
          deleteEntry.mutate(date, {
            onSuccess: (info) => {
              setDeleted(info)
              setToast(true)
            },
          })
        }}
      />

      {toast ? (
        <Toast>
          Đã xóa trang ngày {dayOfMonth(date)}/{Number(date.slice(5, 7))}.
          <button
            type="button"
            onClick={restore}
            className="ml-1 cursor-pointer underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-ring"
          >
            Hoàn tác
          </button>
        </Toast>
      ) : null}
    </div>
  )
}
