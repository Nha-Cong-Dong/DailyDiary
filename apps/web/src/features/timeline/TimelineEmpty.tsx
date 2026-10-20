import { ArrowRight, BookOpen, PenLine, Star } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { monthLabel, type MonthTimeline } from './monthTimeline'

const DOWS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const STEPS = [
  { icon: Star, title: 'Chấm điểm', text: 'Một chạm là ngày đã được ghi.' },
  {
    icon: PenLine,
    title: 'Viết vài dòng',
    text: 'Nếu muốn, thêm tiêu đề, ảnh, từ khóa.',
  },
  {
    icon: BookOpen,
    title: 'Mở lại',
    text: 'Cuối tháng, nhìn lại cả tháng ở đây.',
  },
]

/** Cuốn sổ mở với cây bút đang viết (màn trống). */
function OpenBook() {
  return (
    <svg
      width="200"
      height="150"
      viewBox="0 0 120 90"
      fill="none"
      stroke="var(--line)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22v52c18-1.6 32 .4 48 6c16-5.6 30-7.6 48-6V22" />
      <path d="M60 22c-10-6-24-8-42-7v52c18-1 32 1 42 7z" fill="#B3BCA1" />
      <path d="M60 22c10-6 24-8 42-7v52c-18-1-32 1-42 7z" fill="var(--card)" />
      <path className="draw-in" pathLength={1} d="M70 36c6-1 14-1 22 0 M70 46c6-1 12-1 18 0" stroke="var(--muted-foreground)" />
      <g className="origin-bottom animate-bob [animation-iteration-count:infinite] [transform-box:fill-box]">
        <g transform="translate(86 44) rotate(28)">
          <path d="M-3 -16h6v18l-3 5l-3-5z" fill="#F1BD90" />
          <path d="M-3 -11h6" />
        </g>
      </g>
      <path d="M22 8l1.4 3.6L27 13l-3.6 1.4L22 18l-1.4-3.6L17 13l3.6-1.4z" fill="#F1BD90" strokeWidth="1.4" />
    </svg>
  )
}

/** Dòng thời gian của người dùng mới, chưa có trang nào (thiết kế B9 · Người dùng mới · màn trống). */
export function TimelineEmpty({ data, today }: { data: MonthTimeline; today: number }) {
  const [y, m] = data.month.split('-').map(Number)
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  return (
    <div className="flex animate-rise flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Dòng thời gian</h1>
        <p className="text-[15px] leading-6 text-muted-foreground">{monthLabel(data.month)}</p>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <section
          aria-labelledby="tl-empty-h"
          className="flex min-w-0 flex-[1_1_520px] flex-col items-center gap-4 rounded-[24px] border-[1.5px] border-dashed border-line px-8 py-10 text-center"
        >
          <OpenBook />
          <h2 id="tl-empty-h" className="text-2xl leading-8 font-bold">
            Trang đầu tiên đang chờ bạn
          </h2>
          <p className="max-w-[420px] text-[15px] leading-6 text-muted-foreground">
            Chấm điểm cho hôm nay là xong trang đầu. Mỗi ngày bạn ghi sẽ hiện ở đây, mới nhất ở trên.
          </p>
          <Link
            to="/today"
            className="group mt-1 inline-flex h-12 items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-[4px_4px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--cta-shadow)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--cta-shadow)]"
          >
            Viết trang hôm nay
            <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-[3px]" aria-hidden="true" />
          </Link>
          <ol className="mt-4 grid w-full grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="lift flex flex-col gap-2 rounded-[16px] border-[1.5px] border-line bg-card p-4 text-left shadow-ink-sm hover:[&_svg]:animate-wiggle"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="text-[15px] leading-[22px] font-semibold">{s.title}</span>
                <span className="text-[13px] leading-5 text-muted-foreground">{s.text}</span>
              </li>
            ))}
          </ol>
        </section>
        <aside
          aria-label="Lịch tháng"
          className="flex min-w-[min(100%,280px)] flex-[0_1_340px] flex-col gap-3 rounded-[20px] border-[1.5px] border-line bg-card p-[18px] shadow-ink"
        >
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-[17px] leading-6 font-semibold">{monthLabel(data.month)}</span>
            <span className="text-xs leading-[18px] text-muted-foreground">0 ngày</span>
          </div>
          <div aria-hidden="true" className="grid grid-cols-7 gap-1">
            {DOWS.map((w) => (
              <span key={w} className="text-center text-[10px] leading-[14px] font-semibold text-muted-foreground">
                {w}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`l${i}`} />
            ))}
            {data.days.map((d) => (
              <span
                key={d.day}
                className={cn(
                  'flex h-11 justify-center rounded-[10px] pt-1 text-[10px] leading-3 tabular-nums',
                  d.day === today
                    ? 'animate-glow border-2 border-line bg-secondary font-bold text-foreground'
                    : d.day < today
                      ? 'font-medium text-faint'
                      : 'border border-border font-medium text-muted-foreground',
                )}
              >
                {d.day}
              </span>
            ))}
          </div>
          <p className="text-xs leading-[18px] text-muted-foreground">Hôm nay là ngày đầu tiên của bạn với Jotly.</p>
        </aside>
      </div>
    </div>
  )
}
