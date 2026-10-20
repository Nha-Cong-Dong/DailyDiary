import { ChevronDown, ChevronUp, Image, PenLine, RotateCcw } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { flagHex, scoreLabel } from '@/lib/catalog'
import { timeIn, todayIn, weekdayShort } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { writePath, type TimelineItem } from './monthTimeline'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring'
const flashRing = 'outline-3 outline-offset-4 outline-score-5'

/** "Điểm 4 · Hé nở · Viết lúc 21:04, sửa 21:32" (sửa ở ngày khác thì kèm ngày). */
function metaLine(e: DemoEntry, iconSetId: string, timeZone: string): string {
  const created = new Date(e.created_at)
  const updated = new Date(e.updated_at)
  let text = `Điểm ${e.score} · ${scoreLabel(iconSetId, e.score)} · Viết lúc ${timeIn(timeZone, created)}`
  if (updated.getTime() - created.getTime() >= 60_000) {
    const day = todayIn(timeZone, updated)
    const when = day === e.entry_date ? '' : ` ngày ${Number(day.slice(8))}/${Number(day.slice(5, 7))}`
    text += `, sửa ${timeIn(timeZone, updated)}${when}`
  }
  return text
}

function EntryRow({
  entry,
  iconSetId,
  timeZone,
  flash,
}: {
  entry: DemoEntry
  iconSetId: string
  timeZone: string
  flash: boolean
}) {
  const dark = useDarkMode()
  const meta = metaLine(entry, iconSetId, timeZone)
  const iconLabel = `Điểm ${entry.score}, ${scoreLabel(iconSetId, entry.score)}`
  const card = cn(
    'group lift block overflow-hidden border-[1.5px] border-line bg-card transition-[outline-color]',
    focusRing,
    flash && flashRing,
  )

  if (!entry.title && !entry.content) {
    return (
      <Link
        to={`/day/${entry.entry_date}`}
        className={cn(card, 'flex items-center gap-3.5 rounded-[16px] px-4 py-3 shadow-[2px_2px_0_var(--ink-shadow)]')}
      >
        <span
          role="img"
          aria-label={iconLabel}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-background group-hover:[&_svg]:animate-wiggle"
        >
          <MoodMark iconSetId={iconSetId} score={entry.score} size={32} />
        </span>
        <span className="flex flex-col">
          <span className="text-[15px] leading-[22px] font-semibold">Chỉ chấm điểm</span>
          <span className="text-[13px] leading-5 text-muted-foreground tabular-nums">{meta}</span>
        </span>
      </Link>
    )
  }

  return (
    <Link to={`/day/${entry.entry_date}`} className={cn(card, 'rounded-[18px] shadow-ink-sm')}>
      {entry.flag_color ? (
        <span
          aria-hidden="true"
          className="block h-2.5 border-b-[1.5px] border-line"
          style={{ backgroundColor: flagHex(entry.flag_color, dark) }}
        />
      ) : null}
      <span className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 pt-4 pr-5 pb-[18px] pl-4">
        <span
          role="img"
          aria-label={iconLabel}
          className="flex size-14 items-center justify-center rounded-full border-[1.5px] border-line bg-background group-hover:[&>span>span:last-child]:-translate-y-[5px] group-hover:[&>span>span:last-child]:-rotate-12 [&>span>span:last-child]:transition-transform [&>span>span:last-child]:duration-300"
        >
          <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={40} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5 text-muted-foreground tabular-nums">
            <span>{meta}</span>
            {entry.photos.length ? (
              <span className="inline-flex items-center gap-1">
                <Image className="size-3.5" aria-hidden="true" />
                {entry.photos.length}
                <span className="sr-only"> ảnh</span>
              </span>
            ) : null}
          </span>
          <span className="font-heading text-[19px] leading-7 font-bold">{entry.title ?? 'Không có tiêu đề'}</span>
          {entry.content ? (
            <span className="line-clamp-2 text-[15px] leading-6 text-muted-foreground">{entry.content}</span>
          ) : null}
          {entry.keywords.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {entry.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border-[1.5px] border-border px-2.5 py-0.5 text-xs leading-[18px] font-medium"
                >
                  {k}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

type TimelineListProps = {
  items: TimelineItem[]
  monthNum: number
  today: number | null
  iconSetId: string
  timeZone: string
  flash: number | null
  /** Số mục hiện khi thu gọn (7 trang mới nhất kèm các đoạn trống xen giữa). */
  cut: number
  /** Số trang bị ẩn khi thu gọn. */
  hidden: number
  expanded: boolean
  onMore: () => void
  onLess: () => void
  endText: string
}

/** Danh sách các trang trong tháng, mới nhất trước; ngày bỏ trống gộp thành một dòng nét đứt có nút Ghi bù. */
export function TimelineList({
  items,
  monthNum,
  today,
  iconSetId,
  timeZone,
  flash,
  cut,
  hidden,
  expanded,
  onMore,
  onLess,
  endText,
}: TimelineListProps) {
  const visible = expanded ? items : items.slice(0, cut)
  const canFold = expanded && hidden > 0
  const lessButton = (
    <button
      type="button"
      onClick={onLess}
      className={cn(
        'lift inline-flex h-11 cursor-pointer items-center gap-2 self-center rounded-[12px] border-[1.5px] border-line bg-card px-[18px] text-sm font-semibold shadow-ink-sm',
        focusRing,
      )}
    >
      <ChevronUp className="size-4" aria-hidden="true" />
      Hiển thị ít hơn
    </button>
  )

  return (
    <>
      <ol className="flex flex-col gap-3.5">
        {visible.map((it, i) => {
          const isToday = it.day === today
          const flashing = flash !== null && (it.kind === 'gap' ? flash >= it.from && flash <= it.to : flash === it.day)
          const muted = it.kind !== 'entry'
          const gutterPad = it.kind === 'entry' ? (it.entry.title || it.entry.content ? 'pt-3.5' : 'pt-2.5') : 'pt-1.5'
          return (
            <Fragment key={it.day}>
              {canFold && i === cut ? <li className="flex justify-center py-0.5">{lessButton}</li> : null}
              <li
                id={`d-${it.day}`}
                className="reveal-on-scroll grid scroll-mt-24 grid-cols-[48px_minmax(0,1fr)] items-start gap-3.5"
              >
                <div className={cn('flex flex-col items-center gap-0.5', gutterPad)}>
                  <span
                    className={cn(
                      'font-heading text-2xl leading-7 font-bold tabular-nums',
                      muted ? 'text-faint' : 'text-foreground',
                    )}
                  >
                    {it.day}
                  </span>
                  <span className="text-xs leading-4 text-muted-foreground">{weekdayShort(it.date)}</span>
                  {isToday ? (
                    <span className="mt-1 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold whitespace-nowrap text-primary-foreground">
                      Hôm nay
                    </span>
                  ) : null}
                </div>
                {it.kind === 'entry' ? (
                  <EntryRow entry={it.entry} iconSetId={iconSetId} timeZone={timeZone} flash={flashing} />
                ) : (
                  <div
                    className={cn(
                      'flex min-h-11 flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-border px-4 py-2.5 text-[13px] leading-5 text-muted-foreground transition-[outline-color]',
                      flashing && flashRing,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded-full border-[1.5px] border-dashed border-muted-foreground"
                    />
                    <span className="flex-1">
                      {it.kind === 'open'
                        ? 'Hôm nay chưa có trang.'
                        : it.from === it.to
                          ? 'Không ghi ngày này'
                          : `Không ghi ${it.to - it.from + 1} ngày, từ ${it.from} đến ${it.to}/${monthNum}`}
                    </span>
                    <Link
                      to={it.kind === 'open' ? '/today' : writePath(it.date)}
                      aria-label={it.kind === 'open' ? 'Viết trang hôm nay' : `Ghi bù ngày ${it.to}/${monthNum}`}
                      className={cn(
                        'press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-line px-3 text-[13px] font-semibold text-foreground',
                        focusRing,
                      )}
                    >
                      {it.kind === 'open' ? (
                        <PenLine className="size-3.5" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                      )}
                      {it.kind === 'open' ? 'Viết' : 'Ghi bù'}
                    </Link>
                  </div>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
      {!expanded && hidden > 0 ? (
        <button
          type="button"
          onClick={onMore}
          className={cn(
            'lift inline-flex h-11 cursor-pointer items-center gap-2 self-center rounded-[12px] border-[1.5px] border-line bg-card px-[18px] text-sm font-semibold shadow-ink-sm',
            focusRing,
          )}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
          Xem thêm {hidden} trang cũ hơn
        </button>
      ) : (
        <p className="flex items-center gap-3 text-[13px] leading-5 text-muted-foreground">
          <span aria-hidden="true" className="flex-1 border-t-[1.5px] border-dashed border-border" />
          {endText}
          <span aria-hidden="true" className="flex-1 border-t-[1.5px] border-dashed border-border" />
        </p>
      )}
      {canFold ? lessButton : null}
    </>
  )
}
