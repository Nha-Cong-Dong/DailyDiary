import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Link2, Pencil, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { KeywordChip } from '@/components/diary/KeywordChip'
import { MoodMark } from '@/components/diary/MoodMark'
import { PhotoTile, PhotoViewer } from '@/components/diary/PhotoViewer'
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
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel } from '@/lib/catalog'
import { addDays, dayOfMonth, editedOnTheDay, isValidDate, longDateLabel, shortDateLabel, timeIn, todayIn, useNow } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
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
  // Xóa mềm (F-01): ẩn trang, còn khôi phục được 30 ngày. Ở bản dữ liệu mẫu chỉ là trạng thái trong trang.
  const [deleted, setDeleted] = useState(false)

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
        <h1 className="text-title-2 font-bold">Ngày không hợp lệ</h1>
        <p className="text-muted-foreground">Địa chỉ cần có dạng /day/2026-10-18, và là một ngày có thật.</p>
      </div>
    )
  }

  const future = date > today
  const prev = addDays(date, -1)
  const next = addDays(date, 1)

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        <nav aria-label="Ngày bên cạnh" className="flex gap-2">
          <DayStep date={prev} dir="prev" disabled={false} />
          <DayStep date={next} dir="next" disabled={next > today} />
        </nav>
      </div>

      {deleted ? (
        <Alert role="status">
          <Trash2 aria-hidden="true" />
          <AlertDescription>Đã xóa trang ngày {dayOfMonth(date)}/{Number(date.slice(5, 7))}. Khôi phục được trong 30 ngày.</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={() => setDeleted(false)}>
              Hoàn tác
            </Button>
          </AlertAction>
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
          <h1 className="text-title-3 font-bold">{longDateLabel(date)}</h1>
          <p className="text-muted-foreground">Ngày này chưa tới. Hẹn bạn hôm đó nhé.</p>
        </section>
      ) : !entry || deleted ? (
        <section className="flex flex-col items-start gap-3 rounded-lg border-[1.5px] border-dashed border-border bg-muted p-8">
          <h1 className="text-title-3 font-bold">{longDateLabel(date)}</h1>
          <p className="text-muted-foreground">Ngày này chưa ghi.</p>
          {date === today ? (
            <Button onClick={() => navigate('/today')}>Viết cho hôm nay</Button>
          ) : (
            <Button onClick={() => navigate(`/day/${date}/backfill`)}>Ghi bù ngày này</Button>
          )}
        </section>
      ) : (
        <article className="animate-rise overflow-hidden rounded-[24px] border-[1.5px] border-line bg-card shadow-[5px_5px_0_var(--ink-shadow)]">
          <div
            className="h-[120px] border-b-[1.5px] border-line bg-secondary"
            style={entry.flag_color ? { backgroundColor: flagHex(entry.flag_color, dark) } : undefined}
          />
          <div className="flex flex-col gap-[18px] px-[clamp(20px,4vw,40px)] pb-10">
            <div className="-mt-[52px] flex flex-wrap items-end justify-between gap-4">
              <span className="flex size-[104px] items-center justify-center rounded-full border-[1.5px] border-line bg-card">
                <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={76} />
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 px-3"
                  onClick={() => navigate(date === today ? '/today' : `/day/${date}/edit`)}
                >
                  <Pencil aria-hidden="true" /> Sửa
                </Button>
                {share ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-haspopup="dialog"
                    className="h-10 px-3 hover:[&_svg]:animate-wiggle"
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

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-sm leading-[22px] text-muted-foreground">
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
              {entry.title ? <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">{entry.title}</h1> : null}
              <p className="inline-flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground tabular-nums">
                <Clock className="size-3.5" aria-hidden="true" />
                Tạo {timeIn(timeZone, new Date(entry.created_at))} · Sửa lần cuối {timeIn(timeZone, new Date(entry.updated_at))},{' '}
                {editedOnTheDay(date, entry.updated_at, timeZone) ? 'ghi đúng ngày' : 'cập nhật muộn'}
              </p>
            </div>

            {entry.content ? (
              <div className="ruled flex flex-col gap-8 text-reading leading-8">
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
              <section aria-labelledby="day-photos" className="flex flex-col gap-2.5">
                <h2 id="day-photos" className="font-sans text-sm leading-[22px] font-semibold">
                  Ảnh · {entry.photos.length}
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-3">
                  {entry.photos.map((p, i) => (
                    <PhotoTile key={p.id} photo={p} index={i} total={entry.photos.length} onOpen={() => setPhoto(i)} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>
      )}

      {entry ? <PhotoViewer photos={entry.photos} index={photo} onIndexChange={setPhoto} /> : null}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa nhật ký ngày {dayOfMonth(date)}/{Number(date.slice(5, 7))}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Điểm, nội dung{entry?.photos.length ? ` và ${entry.photos.length} ảnh` : ''} của ngày này sẽ được chuyển vào
              thùng rác. Khôi phục được trong 30 ngày.{share?.active ? ' Link chia sẻ của trang này sẽ tắt.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction variant="destructive-solid" onClick={() => setDeleted(true)}>
              Xóa nhật ký
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
