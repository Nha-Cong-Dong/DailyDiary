import { ArrowLeft, ChevronLeft, ChevronRight, Link2, Pencil, Share2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { EntryCard, EntryPhotoStack } from '@/components/diary/EntryCard'
import { KeywordChip } from '@/components/diary/KeywordChip'
import { PhotoViewer } from '@/components/diary/PhotoViewer'
import { Stamp } from '@/components/diary/Stamp'
import { Toast } from '@/components/diary/Toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { scoreLabel } from '@/lib/catalog'
import { addDays, dayOfMonth, editedOnTheDay, isValidDate, longDateLabel, shortDateLabel, timeIn, todayIn, useNow } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { PhoneBar, phoneIconButton } from './components/EntryFormParts'
import { saveErrorMessage, useDeleteEntry, useRestoreEntry, type DayEntry, type EntryDeleted } from './entries'
import { useDay } from './useDay'

const pill = 'inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3 text-sm font-medium'
const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'
const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
/** Thứ của một ngày `YYYY-MM-DD` (lịch thuần, không phụ thuộc múi giờ). */
const weekdayOf = (date: string) => WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()]

/** "Thứ Bảy 17/10" → nút sang ngày bên cạnh; ngày sau hôm nay thì khóa. */
function DayStep({ date, dir, disabled }: { date: string; dir: 'prev' | 'next'; disabled: boolean }) {
  const label = shortDateLabel(date)
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(pill, 'border-[1.5px] border-dashed border-line-soft text-ink-faint', dir === 'prev' ? 'pl-2.5' : 'pr-2.5')}
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
      className={cn(pill, 'lift-sm border-[1.5px] border-stroke bg-card shadow-sm', focusRing, dir === 'prev' ? 'pl-2.5' : 'pr-2.5')}
    >
      {dir === 'prev' ? <Icon className="size-[18px]" aria-hidden="true" /> : null}
      {label}
      {dir === 'next' ? <Icon className="size-[18px]" aria-hidden="true" /> : null}
    </Link>
  )
}

type DayPageProps = {
  entry: DayEntry
  date: string
  editTo: string
  share?: DayShareControls
  onDelete: () => void
  onOpenPhoto: () => void
}

/**
 * Trang ngày (B7 · Chi tiết một ngày, B10 · điện thoại): EntryCard `page` dùng chung — tờ sổ có lỗ đục, lề hồng, dòng
 * kẻ vở; vòng main icon nối từ nơi bấm (DayMorph); hàng nút Sửa / Chia sẻ / Xóa (máy tính); tiêu đề là h1; từ khóa mở
 * trang Tìm kiếm.
 */
function DayPage({ entry, date, editTo, share, onDelete, onOpenPhoto }: DayPageProps) {
  const { timeZone, iconSetId } = useProfile()
  const label = scoreLabel(iconSetId, entry.score)
  const onTheDay = editedOnTheDay(date, entry.updated_at, timeZone) ? 'ghi đúng ngày' : 'cập nhật muộn'
  const [y, m, d] = date.split('-').map(Number)
  const weekday = weekdayOf(date)
  const created = timeIn(timeZone, new Date(entry.created_at))
  const updated = timeIn(timeZone, new Date(entry.updated_at))
  const actionClass = cn(
    'lift-sm inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-stroke bg-card px-3 text-sm font-semibold shadow-sm',
    focusRing,
  )
  const first = entry.photos[0]
  return (
    <EntryCard
      variant="page"
      ariaLabel={`Trang nhật ký ${weekday} ${d}/${m}/${y}`}
      iconSetId={iconSetId}
      score={entry.score}
      subIcon={entry.sub_icon}
      flagColor={entry.flag_color}
      morphDate={date}
      dateLabel={longDateLabel(date)}
      dateParts={{ weekday, day: d, month: m, year: y }}
      statusLine={
        <>
          <span>
            Điểm {entry.score} · {label}
            <span className="max-md:hidden"> · {onTheDay}</span>
          </span>
          {share?.active ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={share.open}
              className={cn(
                'press inline-flex h-7 animate-pop cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-stroke bg-sage-soft pr-2.5 pl-2 text-xs font-semibold text-sage-ink',
                focusRing,
              )}
            >
              <Link2 className="size-3.5" aria-hidden="true" />
              Đang chia sẻ
            </button>
          ) : null}
        </>
      }
      actions={
        <div className="flex flex-wrap gap-2 max-md:hidden">
          <Link to={editTo} className={actionClass}>
            <Pencil className="size-4" aria-hidden="true" />
            Sửa
          </Link>
          {share ? (
            <button type="button" aria-haspopup="dialog" onClick={share.open} className={actionClass}>
              <Share2 className="size-4" aria-hidden="true" />
              Chia sẻ
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Xóa nhật ký ngày này"
            onClick={onDelete}
            className={cn(
              'lift-sm inline-flex size-10 cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] border-danger bg-card text-danger pointer-fine:hover:bg-danger-soft',
              focusRing,
            )}
          >
            <Trash2 className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
      }
      title={entry.title}
      titleAs="h1"
      excerpt={entry.content}
      emptyText="Chỉ chấm điểm, chưa viết thêm."
      photo={
        first ? <EntryPhotoStack src={first.thumbUrl ?? first.url} total={entry.photos.length} onOpen={onOpenPhoto} /> : null
      }
      keywords={entry.keywords}
      renderKeyword={(k) => (
        // Từ khóa đi qua state của router, không lên URL (Project_Specs F-05).
        <Link to="/search" state={{ q: k }} className={cn('press inline-flex rounded-full', focusRing)}>
          <KeywordChip>{k}</KeywordChip>
        </Link>
      )}
      footer={
        <>
          <Stamp kind="saved">Đã lưu lúc {updated}</Stamp>
          <span className="font-normal text-ink-soft nums">
            Tạo {created} · Sửa lần cuối {updated}
            <span className="md:hidden">, {onTheDay}</span>
          </span>
        </>
      }
    />
  )
}

/** Điều khiển Chia sẻ do trang ghép vào (features/share): link đang bật không, và mở hộp thoại. */
export type DayShareControls = { active: boolean; open: () => void }

/**
 * Trang chi tiết một ngày (thiết kế B7 · Chi tiết một ngày, B10 · điện thoại; nút Chia sẻ theo B8).
 * Xóa không hỏi lại (canvas): trang vào thùng rác ngay (xóa mềm), thông báo có Hoàn tác trong 6 giây.
 */
export function DayDetail({ date, share }: { date: string; share?: DayShareControls }) {
  const { timeZone } = useProfile()
  const now = useNow()
  const navigate = useNavigate()
  const today = todayIn(timeZone, now)
  const valid = isValidDate(date)
  const { data: entry, isPending, isError } = useDay(date)
  const [photo, setPhoto] = useState<number | null>(null)
  // Xóa mềm (F-01): DELETE /entries/{day}; khôi phục bằng POST …/restore trước `restore_until`.
  const deleteEntry = useDeleteEntry(date)
  const restoreEntry = useRestoreEntry(date)
  const [deleted, setDeleted] = useState<EntryDeleted | null>(null)
  const [toast, setToast] = useState(false)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(false), 6000)
    return () => window.clearTimeout(t)
  }, [toast])

  function remove() {
    deleteEntry.mutate(date, {
      onSuccess: (info) => {
        setDeleted(info)
        setToast(true)
      },
    })
  }

  function restore() {
    restoreEntry.mutate(date, {
      onSuccess: () => {
        setDeleted(null)
        setToast(false)
      },
    })
  }

  const back = (
    <Link to="/timeline" className={cn(pill, 'press back-nudge pl-2', focusRing)}>
      <ArrowLeft className="size-[18px]" aria-hidden="true" />
      Dòng thời gian
    </Link>
  )

  if (!valid) {
    return (
      <div className="mx-auto flex max-w-[760px] flex-col items-start gap-4">
        {back}
        <h1 className="text-title font-bold">Ngày không hợp lệ</h1>
        <p className="text-ink-soft">Địa chỉ cần có dạng /day/2026-10-18, và là một ngày có thật.</p>
      </div>
    )
  }

  const future = date > today
  const prev = addDays(date, -1)
  const next = addDays(date, 1)
  const hasEntry = !!entry && !deleted && !isPending && !isError && !future
  const editTo = date === today ? '/today' : `/day/${date}/edit`
  const dayMonth = `${dayOfMonth(date)}/${Number(date.slice(5, 7))}`
  const emptyBox = 'flex flex-col items-start gap-3 rounded-lg border-[1.5px] border-dashed border-line-soft bg-sunk p-6 md:p-8'

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      {/* Điện thoại (B10 · Chi tiết ngày): thanh trên riêng — về Dòng thời gian, ngày, Chia sẻ và Sửa. */}
      <PhoneBar
        start={
          <Link to="/timeline" aria-label="Về Dòng thời gian" className={phoneIconButton}>
            <ArrowLeft className="size-[22px]" aria-hidden="true" />
          </Link>
        }
        title={`${dayMonth}/${date.slice(0, 4)}`}
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
        <p className="text-ink-soft" role="status">
          Đang mở trang…
        </p>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>Không mở được trang này. Thử tải lại.</AlertDescription>
        </Alert>
      ) : future ? (
        <section className={emptyBox}>
          <h1 className="text-heading font-bold">{longDateLabel(date)}</h1>
          <p className="text-ink-soft">Ngày này chưa tới. Hẹn bạn hôm đó nhé.</p>
        </section>
      ) : deleted ? (
        <section className={cn(emptyBox, 'animate-rise')}>
          <h1 className="text-heading font-bold">{longDateLabel(date)}</h1>
          <p className="text-ink-soft">
            Đã xóa trang này. Khôi phục được tới {shortDateLabel(todayIn(timeZone, new Date(deleted.restore_until)))}.
          </p>
          <Button variant="secondary" onClick={restore} disabled={restoreEntry.isPending}>
            Khôi phục trang
          </Button>
        </section>
      ) : !entry ? (
        <section className={emptyBox}>
          <h1 className="text-heading font-bold">{longDateLabel(date)}</h1>
          <p className="text-ink-soft">Ngày này chưa ghi.</p>
          {date === today ? (
            <Button variant="cta" onClick={() => navigate('/today')}>
              Viết cho hôm nay
            </Button>
          ) : (
            <Button variant="cta" onClick={() => navigate(`/day/${date}/backfill`)}>
              Ghi bù ngày này
            </Button>
          )}
        </section>
      ) : (
        <div className="flex animate-rise flex-col gap-4">
          <DayPage entry={entry} date={date} editTo={editTo} share={share} onDelete={remove} onOpenPhoto={() => setPhoto(0)} />
          {/* Điện thoại: Xóa nằm dưới trang thay cho nút thùng rác trên hàng nút. */}
          <button
            type="button"
            onClick={remove}
            disabled={deleteEntry.isPending}
            className={cn(
              'press inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-danger text-sm font-semibold text-danger md:hidden',
              focusRing,
            )}
          >
            <Trash2 className="size-[18px]" aria-hidden="true" />
            Xóa trang này
          </button>
        </div>
      )}

      {entry ? <PhotoViewer photos={entry.photos} index={photo} onIndexChange={setPhoto} /> : null}

      <Toast
        open={toast}
        icon={<Trash2 className="size-3.5" aria-hidden="true" />}
        action={{ label: 'Hoàn tác', onClick: restore }}
      >
        {`Đã chuyển trang ngày ${dayMonth} vào thùng rác.`}
      </Toast>
    </div>
  )
}
