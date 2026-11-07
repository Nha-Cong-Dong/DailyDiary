import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { DayMorph } from '@/components/diary/DayMorph'
import { EntryCard } from '@/components/diary/EntryCard'
import { MoodMark } from '@/components/diary/MoodMark'
import { scoreLabel, type Score } from '@/lib/catalog'
import { timeIn, todayIn, weekdayShort } from '@/lib/date'
import { cn } from '@/lib/utils'
import { writePath, type MonthEntry, type TimelineItem } from './monthTimeline'
import { JustScored, TodayPrompt } from './TodayPrompt'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus'
/** Chọn một ngày từ nhịp tháng/lịch: viền đào quanh mục trong 1,6s rồi tắt (canvas .j-flash). */
const flashRing = 'outline-3 outline-offset-4 outline-peach'

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
  noMorph = false,
}: {
  entry: MonthEntry
  iconSetId: string
  timeZone: string
  flash: boolean
  noMorph?: boolean
}) {
  const meta = metaLine(entry, iconSetId, timeZone)
  const iconLabel = `Điểm ${entry.score}, ${scoreLabel(iconSetId, entry.score)}`

  if (!entry.title && !entry.content) {
    // Chỉ chấm điểm: thẻ nhỏ (canvas B8 .lite); vòng icon vẫn nối sang trang ngày.
    return (
      <Link
        to={`/day/${entry.entry_date}`}
        className={cn(
          'lift-sm flex items-center gap-3 rounded-[14px] border-[1.5px] border-stroke bg-card px-3 py-2.5 shadow-sm md:gap-3.5 md:rounded-[16px] md:px-4 md:py-3',
          focusRing,
          flash && flashRing,
        )}
      >
        <DayMorph date={entry.entry_date} disabled={noMorph}>
          <span
            role="img"
            aria-label={iconLabel}
            className="flex size-[38px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper md:size-11"
          >
            <MoodMark iconSetId={iconSetId} score={entry.score} size={28} className="md:hidden" />
            <MoodMark iconSetId={iconSetId} score={entry.score} size={32} className="max-md:hidden" />
          </span>
        </DayMorph>
        <span className="flex flex-col">
          <span className="text-sm leading-5 font-semibold md:text-body md:font-semibold">Chỉ chấm điểm</span>
          <span className="text-[13px] leading-[18px] text-ink-soft nums md:leading-5">
            <span className="md:hidden">{shortMeta(entry, timeZone)}</span>
            <span className="max-md:hidden">{meta}</span>
          </span>
        </span>
      </Link>
    )
  }

  // Trang có chữ: thẻ sổ B11-DayCard (lỗ đục, lề đỏ, ruy băng cờ, dòng kẻ vở); vòng icon nối sang trang ngày.
  return (
    <Link
      to={`/day/${entry.entry_date}`}
      className={cn('group block rounded-[18px]', focusRing, flash && flashRing)}
    >
      <EntryCard
        variant="card"
        interactive
        iconSetId={iconSetId}
        score={entry.score}
        subIcon={entry.sub_icon}
        flagColor={entry.flag_color}
        morphDate={noMorph ? undefined : entry.entry_date}
        dateLabel={
          <>
            <span className="nums md:hidden">{shortMeta(entry, timeZone)}</span>
            <span className="nums max-md:hidden">{meta}</span>
          </>
        }
        title={entry.title}
        excerpt={entry.content}
        keywords={entry.keywords}
        photoCount={entry.photo_count}
        className="pointer-fine:group-hover:shadow-lg group-active:translate-x-1 group-active:translate-y-1 group-active:shadow-none group-active:duration-(--dur-press)"
      />
    </Link>
  )
}

type TimelineListProps = {
  items: TimelineItem[]
  /** Ngày đang mở trong bảng xem nhanh (DayPeek giữ chuyển cảnh nối của ngày này): tắt DayMorph ở hàng tương ứng. */
  peekDate?: string | null
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
  peekDate,
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
        'press inline-flex h-11 cursor-pointer items-center justify-center gap-2 self-stretch rounded-[12px] border-[1.5px] border-stroke px-[18px] text-sm font-semibold select-none md:lift-sm md:self-center md:bg-card md:shadow-sm',
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
                      'font-heading text-xl leading-6 font-bold nums md:text-2xl md:leading-7',
                      muted ? 'text-ink-faint' : 'text-ink',
                    )}
                  >
                    {it.day}
                  </span>
                  <span className="text-[11px] leading-[14px] text-ink-soft md:text-[13px] md:leading-[18px]">
                    {weekdayShort(it.date)}
                  </span>
                  {isToday ? (
                    <>
                      <span
                        role="img"
                        aria-label="Hôm nay"
                        className="mt-1 size-1.5 rounded-full border border-stroke bg-peach md:hidden"
                      />
                      <span className="mt-1 rounded-full bg-primary px-1.5 text-[11px] leading-4 font-semibold whitespace-nowrap text-on-primary max-md:hidden">
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
                  <EntryRow
                    entry={it.entry}
                    iconSetId={iconSetId}
                    timeZone={timeZone}
                    flash={flashing}
                    noMorph={peekDate === it.entry.entry_date}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex min-h-11 flex-wrap items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-line-soft py-1.5 pr-1.5 pl-3 text-[13px] leading-[18px] text-ink-soft md:gap-2.5 md:px-4 md:py-2.5 md:leading-5',
                      flashing && flashRing,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded-full border-[1.5px] border-dashed border-ink-soft max-md:hidden"
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
                        'press inline-flex h-9 shrink-0 items-center gap-1 rounded-[10px] border-[1.5px] border-stroke px-2.5 text-[13px] font-semibold text-ink select-none md:gap-1.5 md:px-3',
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
            'lift-sm inline-flex h-11 cursor-pointer items-center justify-center gap-2 self-stretch rounded-[12px] border-[1.5px] border-stroke bg-card px-[18px] text-sm font-semibold shadow-sm select-none md:self-center',
            focusRing,
          )}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
          Xem thêm {hidden} trang cũ hơn
        </button>
      ) : (
        <p className="flex items-center gap-3 text-[13px] leading-5 text-ink-soft">
          <span aria-hidden="true" className="flex-1 border-t-[1.5px] border-dashed border-line-soft" />
          {endText}
          <span aria-hidden="true" className="flex-1 border-t-[1.5px] border-dashed border-line-soft" />
        </p>
      )}
      {canFold ? lessButton : null}
    </>
  )
}
