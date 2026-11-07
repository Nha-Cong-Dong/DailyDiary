import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CalendarCell } from '@/components/diary/CalendarCell'
import { EntryCard } from '@/components/diary/EntryCard'
import { flagColors } from '@/lib/catalog'
import { prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { DEMO_ICON_SET, DEMO_MONTH, DEMO_TODAY, DEMO_YEAR, OCTOBER, WEEKDAYS } from './demoData'
import { YearPreview } from './YearPreview'

const TABS = ['Ngày', 'Tháng', 'Năm'] as const
const LAVENDER = flagColors.find((f) => f.id === 'lavender')?.hex ?? null

/** Lịch tháng 10/2026 mẫu: ô hôm nay nền đào, ngày chưa ghi là vòng nét đứt. */
function MonthSample() {
  const length = new Date(Date.UTC(DEMO_YEAR, DEMO_MONTH, 0)).getUTCDate()
  // Số ô trống đầu tuần (tuần bắt đầu từ thứ Hai).
  const leadingBlanks = (new Date(Date.UTC(DEMO_YEAR, DEMO_MONTH - 1, 1)).getUTCDay() + 6) % 7
  return (
    <div className="tilt w-full rounded-lg border-2 border-stroke bg-card p-4 shadow-lg">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-heading text-body font-semibold">
          Tháng {DEMO_MONTH}, {DEMO_YEAR}
        </span>
        <span className="text-label font-normal text-ink-soft">
          {Object.keys(OCTOBER).length}/{DEMO_TODAY} ngày
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-label text-ink-soft">
            {w}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length }, (_, i) => {
          const day = i + 1
          const entry = OCTOBER[day]
          const state = day === DEMO_TODAY ? 'today' : day < DEMO_TODAY ? 'past' : 'future'
          return (
            <CalendarCell
              key={day}
              day={day}
              size="sm"
              iconSetId={DEMO_ICON_SET}
              score={entry?.score ?? null}
              subIcon={entry?.sub}
              state={state}
              label={`${day}/${DEMO_MONTH}${entry ? `, điểm ${entry.score}` : state === 'past' ? ', chưa ghi' : ''}`}
              className={cn(state === 'today' && 'shadow-none')}
            />
          )
        })}
      </div>
    </div>
  )
}

function Slide({
  index,
  active,
  title,
  text,
  extra,
  visual,
}: {
  index: number
  active: boolean
  title: string
  text: string
  extra?: ReactNode
  visual: ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={`f2-slide-${index}`}
      aria-labelledby={`f2-tab-${index}`}
      aria-hidden={!active}
      inert={!active}
      className="grid min-w-0 flex-[0_0_100%] snap-start items-center gap-x-16 gap-y-7 [scroll-snap-stop:always] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
    >
      <div className="flex w-full max-w-[400px] flex-col gap-2 md:col-start-2 md:row-start-1">
        <h3 className="text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold tracking-[-0.02em] [font-variation-settings:'FLAR'_100]">
          {title}
        </h3>
        <p className="max-w-[380px] text-reading text-ink-soft">{text}</p>
        {extra}
      </div>
      <div aria-hidden="true" className="flex min-w-0 justify-center md:col-start-1 md:row-start-1">
        {visual}
      </div>
    </div>
  )
}

/**
 * Mục "Nhìn lại" (B5 · F2): ngày → tháng → năm, mỗi lần một phần. Lướt ngang (scroll-snap) hoặc chọn tab Ngày/Tháng/Năm,
 * nút Phần trước/Phần sau; mũi tên trái/phải, Home, End trên hàng tab. Cả hai bản trang chủ dùng dữ liệu mẫu.
 */
export function LookBack({ signed = false }: { signed?: boolean }) {
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const go = (i: number, focus = false) => {
    const n = Math.max(0, Math.min(TABS.length - 1, i))
    const el = track.current
    // Mỗi phần rộng đúng bề rộng khung (100% + khoảng cách 24 = padding 2 × 12), nên vị trí là n × clientWidth.
    el?.scrollTo?.({ left: n * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    setIndex(n)
    if (focus) tabs.current[n]?.focus()
  }

  const onKey = (e: KeyboardEvent) => {
    const k = e.key
    if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return
    e.preventDefault()
    go(k === 'Home' ? 0 : k === 'End' ? TABS.length - 1 : index + (k === 'ArrowRight' ? 1 : -1), true)
  }

  const nav = (off: boolean) =>
    cn(
      'inline-flex size-11 shrink-0 items-center justify-center rounded-md border-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
      off ? 'cursor-default border-dashed border-line-soft bg-sunk text-ink-faint' : 'lift-sm cursor-pointer border-stroke bg-card text-ink shadow-sm',
    )

  return (
    <section id="nhin-lai" aria-labelledby="story-title" className="py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-[clamp(16px,4vw,40px)]">
        <div className="reveal-on-scroll flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <h2 id="story-title" className="text-title">
            Ghi từng ngày, nhìn lại cả năm
          </h2>
          <div className="flex items-center gap-2.5">
            <div
              role="tablist"
              aria-label="Ngày, tháng, năm"
              onKeyDown={onKey}
              className="inline-flex gap-0.5 rounded-full border-2 border-stroke bg-card p-1 shadow-sm"
            >
              {TABS.map((label, i) => (
                <button
                  key={label}
                  ref={(el) => {
                    tabs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`f2-tab-${i}`}
                  aria-selected={index === i}
                  aria-controls={`f2-slide-${i}`}
                  tabIndex={index === i ? 0 : -1}
                  onClick={() => go(i)}
                  className={cn(
                    'h-10 cursor-pointer rounded-full border-2 px-[18px] text-body font-semibold transition-[background-color,border-color] duration-(--dur-fast) ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
                    index === i ? 'border-stroke bg-lavender text-on-accent' : 'border-transparent text-ink pointer-fine:hover:bg-sunk',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" aria-label="Phần trước" disabled={index === 0} onClick={() => go(index - 1)} className={nav(index === 0)}>
              <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Phần sau"
              disabled={index === TABS.length - 1}
              onClick={() => go(index + 1)}
              className={nav(index === TABS.length - 1)}
            >
              <ChevronRight className="size-5" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget
            const n = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
            if (n !== index) setIndex(Math.max(0, Math.min(TABS.length - 1, n)))
          }}
          className="reveal-on-scroll -m-3 flex snap-x snap-mandatory scroll-px-3 gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Slide
            index={0}
            active={index === 0}
            title="Từ một ngày…"
            text="Chấm điểm, thêm vài dòng nếu muốn. Vậy là xong một trang."
            visual={
              <EntryCard
                iconSetId={DEMO_ICON_SET}
                score={4}
                subIcon="😌"
                flagColor={LAVENDER}
                dateLabel="Chủ nhật, 18/10 · Hôm nay"
                title="Chiều mưa đọc sách"
                excerpt="Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở."
                className="tilt w-full max-w-[440px]"
              />
            }
          />
          <Slide
            index={1}
            active={index === 1}
            title="Thành một tháng"
            text="Mỗi trang là một ô trong lịch tháng, mang icon của ngày đó."
            visual={
              <div className="w-full max-w-[440px]">
                <MonthSample />
              </div>
            }
          />
          <Slide
            index={2}
            active={index === 2}
            title="Và một năm"
            text="Mười hai tháng gom lại thành một bức tranh: mỗi ô một ngày, mỗi màu một mức điểm."
            extra={
              signed ? (
                <Link to="/pixels" className="link-underline mt-1 self-start text-body font-semibold">
                  Mở Year in Pixels của bạn
                </Link>
              ) : null
            }
            visual={
              <div className="w-full">
                <YearPreview filterable={false} />
              </div>
            }
          />
        </div>
        <p className="text-label font-normal text-ink-soft">Dữ liệu mẫu · lướt ngang hoặc chọn Ngày, Tháng, Năm</p>
      </div>
    </section>
  )
}
