import { ChevronDown, ChevronUp, Image, RotateCcw } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { timeIn, todayIn, weekdayShort } from '@/lib/date'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { writePath, type MonthEntry, type TimelineItem } from './monthTimeline'
import { JustScored, TodayPrompt } from './TodayPrompt'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring'
const flashRing = 'outline-3 outline-offset-4 outline-score-5'

/** "Điểm 4 · Hé nở · Viết lúc 21:04, sửa 21:32" (sửa ở ngày khác thì kèm ngày). */
function metaLine(e: MonthEntry, iconSetId: string, timeZone: string): string {
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

/** Bản điện thoại (thiết kế B10): "Điểm 4 · 21:04 · 3 ảnh". */
function shortMeta(e: MonthEntry, timeZone: string): string {
  const photos = e.photo_count ? ` · ${e.photo_count} ảnh` : ''
  return `Điểm ${e.score} · ${timeIn(timeZone, new Date(e.created_at))}${photos}`
}

function EntryRow({
  entry,
  iconSetId,
  timeZone,
  flash,
}: {
  entry: MonthEntry
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
        className={cn(
          card,
          'flex items-center gap-3 rounded-[14px] px-3 py-2.5 shadow-[2px_2px_0_var(--ink-shadow)] md:gap-3.5 md:rounded-[16px] md:px-4 md:py-3',
        )}
      >
        <span
          role="img"
          aria-label={iconLabel}
          className="flex size-[38px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-background group-hover:[&_svg]:animate-wiggle md:size-11"
        >
          <MoodMark iconSetId={iconSetId} score={entry.score} size={28} className="md:hidden" />
          <MoodMark iconSetId={iconSetId} score={entry.score} size={32} className="max-md:hidden" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm leading-5 font-semibold md:text-[15px] md:leading-[22px]">Chỉ chấm điểm</span>
          <span className="text-xs leading-[18px] text-muted-foreground tabular-nums md:text-[13px] md:leading-5">
            <span className="md:hidden">{shortMeta(entry, timeZone)}</span>
            <span className="max-md:hidden">{meta}</span>
          </span>
        </span>
      </Link>
    )
  }

  return (
    <Link to={`/day/${entry.entry_date}`} className={cn(card, 'rounded-[16px] shadow-ink-sm md:rounded-[18px]')}>
      {entry.flag_color ? (
        <span
          aria-hidden="true"
          className="block h-1.5 border-b-[1.5px] border-line md:h-2.5"
          style={{ backgroundColor: flagHex(entry.flag_color, dark) }}
        />
      ) : null}
      <span className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 pt-3 pr-3.5 pb-3.5 pl-3 md:grid-cols-[56px_minmax(0,1fr)] md:gap-4 md:pt-4 md:pr-5 md:pb-[18px] md:pl-4">
        <span
          role="img"
          aria-label={iconLabel}
          className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-background group-hover:[&>span>span:last-child]:-translate-y-0.5 group-hover:[&>span>span:last-child]:-rotate-4 md:size-14 [&>span>span:last-child]:transition-transform [&>span>span:last-child]:duration-300"
        >
          <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={32} className="md:hidden" />
          <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={40} className="max-md:hidden" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 md:gap-1">
          <span className="text-xs leading-[18px] text-muted-foreground tabular-nums md:hidden">{shortMeta(entry, timeZone)}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5 text-muted-foreground tabular-nums max-md:hidden">
            <span>{meta}</span>
            {entry.photo_count ? (
              <span className="inline-flex items-center gap-1">
                <Image className="size-3.5" aria-hidden="true" />
                {entry.photo_count}
                <span className="sr-only"> ảnh</span>
              </span>
            ) : null}
          </span>
          <span className="font-heading text-[17px] leading-6 font-bold md:text-[19px] md:leading-7">
            {entry.title ?? 'Không có tiêu đề'}
          </span>
          {entry.content ? (
            <span className="line-clamp-2 text-sm leading-[22px] text-muted-foreground md:text-[15px] md:leading-6">
              {entry.content}
            </span>
          ) : null}
          {entry.keywords.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5 max-md:hidden">
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
  /** Ngày hôm nay ("YYYY-MM-DD") nếu tháng đang xem là tháng này. */
  todayDate: string | null
  /** Hôm nay vừa được chấm điểm nhanh ở đây (hiện dòng "Đã ghi cho hôm nay" kèm Hoàn tác). */
  justScored: boolean
  onQuickScore: (score: Score) => void
  onUndoQuick: () => void
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
  todayDate,
  justScored,
  onQuickScore,
  onUndoQuick,
}: TimelineListProps) {
  const visible = expanded ? items : items.slice(0, cut)
  const canFold = expanded && hidden > 0
  const lessButton = (
    <button
      type="button"
      onClick={onLess}
      className={cn(
        'press inline-flex h-11 cursor-pointer items-center justify-center gap-2 self-stretch rounded-[12px] border-[1.5px] border-line px-[18px] text-sm font-semibold md:lift md:self-center md:bg-card md:shadow-ink-sm',
        focusRing,
      )}
    >
      <ChevronUp className="size-4" aria-hidden="true" />
      Hiển thị ít hơn
    </button>
  )

  return (
    <>
      <ol className="flex flex-col gap-3 md:gap-3.5">
        {visible.map((it, i) => {
          const isToday = it.day === today
          const flashing = flash !== null && (it.kind === 'gap' ? flash >= it.from && flash <= it.to : flash === it.day)
          const quick = justScored && it.kind === 'entry' && it.date === todayDate
          const muted = it.kind === 'gap'
          const gutterPad =
            it.kind === 'open'
              ? 'pt-4 md:pt-[22px]'
              : it.kind === 'entry' && (it.entry.title || it.entry.content)
                ? 'pt-3 md:pt-3.5'
                : it.kind === 'entry'
                  ? 'pt-2 md:pt-2.5'
                  : 'pt-2 md:pt-1.5'
          return (
            <Fragment key={it.day}>
              {canFold && i === cut ? <li className="flex justify-center py-0.5">{lessButton}</li> : null}
              <li
                id={`d-${it.day}`}
                className="reveal-on-scroll grid scroll-mt-24 grid-cols-[36px_minmax(0,1fr)] items-start gap-2.5 md:grid-cols-[48px_minmax(0,1fr)] md:gap-3.5"
              >
                <div className={cn('flex flex-col items-center md:gap-0.5', gutterPad)}>
                  <span
                    className={cn(
                      'font-heading text-xl leading-6 font-bold tabular-nums md:text-2xl md:leading-7',
                      muted ? 'text-faint' : 'text-foreground',
                    )}
                  >
                    {it.day}
                  </span>
                  <span className="text-[11px] leading-[14px] text-muted-foreground md:text-xs md:leading-4">
                    {weekdayShort(it.date)}
                  </span>
                  {isToday ? (
                    <>
                      <span
                        aria-label="Hôm nay"
                        className="mt-1 size-1.5 rounded-full border border-line bg-score-5 md:hidden"
                      />
                      <span className="mt-1 rounded-full bg-primary px-1.5 text-[11px] leading-4 font-semibold whitespace-nowrap text-primary-foreground max-md:hidden">
                        Hôm nay
                      </span>
                    </>
                  ) : null}
                </div>
                {it.kind === 'open' ? (
                  <TodayPrompt date={it.date} timeZone={timeZone} iconSetId={iconSetId} flash={flashing} onPick={onQuickScore} />
                ) : quick && it.kind === 'entry' && !it.entry.title && !it.entry.content ? (
                  <JustScored
                    score={it.entry.score}
                    meta={`Điểm ${it.entry.score} · ${scoreLabel(iconSetId, it.entry.score)} · Viết lúc ${timeIn(timeZone, new Date(it.entry.created_at))}`}
                    iconSetId={iconSetId}
                    onUndo={onUndoQuick}
                  />
                ) : it.kind === 'entry' ? (
                  <EntryRow entry={it.entry} iconSetId={iconSetId} timeZone={timeZone} flash={flashing} />
                ) : (
                  <div
                    className={cn(
                      'flex min-h-11 flex-wrap items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-border py-1.5 pr-1.5 pl-3 text-[13px] leading-[18px] text-muted-foreground transition-[outline-color] md:gap-2.5 md:px-4 md:py-2.5 md:leading-5',
                      flashing && flashRing,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded-full border-[1.5px] border-dashed border-muted-foreground max-md:hidden"
                    />
                    <span className="flex-1">
                      {it.from === it.to ? (
                        'Không ghi ngày này'
                      ) : (
                        <>
                          Không ghi {it.to - it.from + 1} ngày
                          <span className="max-md:hidden">
                            , từ {it.from} đến {it.to}/{monthNum}
                          </span>
                        </>
                      )}
                    </span>
                    <Link
                      to={writePath(it.date)}
                      aria-label={`Ghi bù ngày ${it.to}/${monthNum}`}
                      className={cn(
                        'press inline-flex h-9 shrink-0 items-center gap-1 rounded-[10px] border-[1.5px] border-line px-2.5 text-[13px] font-semibold text-foreground md:h-8 md:gap-1.5 md:px-3',
                        focusRing,
                      )}
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      Ghi bù
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
            'press inline-flex h-11 cursor-pointer items-center justify-center gap-2 self-stretch rounded-[12px] border-[1.5px] border-line bg-card px-[18px] text-sm font-semibold shadow-[2px_2px_0_var(--ink-shadow)] md:lift md:self-center md:shadow-ink-sm',
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
