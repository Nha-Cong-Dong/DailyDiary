import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { PublicFrame } from './components/PublicFrame'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring'

/** Cuốn sổ đã khóa: bìa và khóa giữ màu logo ở cả hai chế độ, nét vẽ theo màu mực. */
function LockedBook() {
  return (
    <svg
      width="220"
      height="184"
      viewBox="0 0 120 100"
      fill="none"
      stroke="var(--icon-ink)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Cuốn sổ đã khóa"
      className="group/book"
    >
      <g className="origin-[50%_100%] transition-[rotate] duration-300 [transform-box:fill-box] group-hover/book:-rotate-3">
        <path d="M30 20h52a8 8 0 0 1 8 8v52a8 8 0 0 1-8 8H30z" fill="#CBAAC7" />
        <path d="M30 20h-2a6 6 0 0 0-6 6v56a6 6 0 0 0 6 6h2z" fill="#B3BCA1" />
        <path d="M90 30v48" stroke="#FFFCF8" strokeWidth="3" />
        <path
          d="M46 38c-3.3-2.3-4.8-4-4.8-5.9c0-1.6 1.2-2.8 2.7-2.8c1 0 1.7.5 2.1 1.2c.4-.7 1.1-1.2 2.1-1.2c1.5 0 2.7 1.2 2.7 2.8c0 1.9-1.5 3.6-4.8 5.9z"
          fill="#F1BD90"
        />
        <path d="M44 88v8l4-3l4 3v-8" fill="#F1BD90" />
      </g>
      <g className="origin-center animate-pop [animation-delay:.65s] [transform-box:fill-box]">
        <path d="M70 58v-6a8 8 0 0 1 16 0v6" />
        <rect x="64" y="57" width="28" height="22" rx="5" fill="#F1BD90" />
        <path d="M78 65v6" />
      </g>
      <path className="draw-in" pathLength={1} d="M14 30l-6-4" />
      <path className="draw-in" pathLength={1} d="M12 46h-7" />
      <path className="draw-in" pathLength={1} d="M104 18l5-5" />
      <path className="draw-in" pathLength={1} d="M108 32h7" />
    </svg>
  )
}

/** Link chia sẻ không mở được: đã tắt, trang đã xóa, hoặc gõ sai (thiết kế B8 · Chia sẻ · link đã tắt). */
export function ShareOff() {
  return (
    <PublicFrame title="Jotly · Trang không mở được" cta={false}>
      <main className="flex flex-1 items-center justify-center px-[clamp(16px,4vw,40px)] pt-16 pb-20">
        <div className="flex max-w-[520px] flex-col items-center gap-4 text-center">
          <div className="relative flex animate-rise items-center justify-center">
            <span aria-hidden="true" className="absolute size-[200px] rounded-full border-[1.5px] border-dashed border-border bg-muted" />
            <span className="relative inline-flex">
              <LockedBook />
            </span>
          </div>
          <h1 className="mt-3 animate-rise text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold text-balance [animation-delay:.5s]">
            Trang này không mở được
          </h1>
          <p className="animate-rise text-base leading-[26px] text-pretty text-muted-foreground [animation-delay:.6s]">
            Người viết đã tắt link, đã xóa trang, hoặc link bị gõ sai. Trên Jotly, mọi trang đều riêng tư trừ khi người
            viết chọn chia sẻ.
          </p>
          <div className="mt-3 flex animate-rise flex-wrap items-center justify-center gap-x-[22px] gap-y-3.5 [animation-delay:.7s]">
            <Link
              to="/"
              className={`group/cta cta inline-flex h-12 items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-primary px-5 text-[15px] font-semibold text-primary-foreground ${focusRing}`}
            >
              Tìm hiểu về Jotly
              <ArrowRight className="size-[18px] transition-transform duration-200 group-hover/cta:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link to="/login" className={`link-underline text-[15px] font-medium ${focusRing}`}>
              Viết nhật ký của bạn
            </Link>
          </div>
        </div>
      </main>
    </PublicFrame>
  )
}
