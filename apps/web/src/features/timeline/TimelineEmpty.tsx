import { Clock, PenLine, Star } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { monthLabel, type MonthTimeline } from './monthTimeline'
import { WritingNotebook } from './WritingNotebook'

const DOWS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const STEPS = [
  { icon: Star, title: 'Chấm điểm', text: 'Một chạm là ngày đã được ghi.' },
  { icon: PenLine, title: 'Viết vài dòng', text: 'Nếu muốn, thêm tiêu đề, ảnh, từ khóa.' },
  { icon: Clock, title: 'Mở lại', text: 'Cuối tháng, nhìn lại cả tháng ở đây.' },
]

/** Dòng thời gian của người dùng mới, chưa có trang nào (thiết kế B9 · Người dùng mới · màn trống). */
export function TimelineEmpty({ data, today }: { data: MonthTimeline; today: number }) {
  const [y, m] = data.month.split('-').map(Number)
  // Tuần bắt đầu từ thứ Hai; tính trên ngày lịch (UTC), không phụ thuộc múi giờ máy.
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  return (
    <div className="flex animate-rise flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-title">Dòng thời gian</h1>
        <p className="text-body text-ink-soft">{monthLabel(data.month)}</p>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <section
          aria-labelledby="tl-empty-h"
          className="flex min-w-0 flex-[1_1_520px] flex-col items-center gap-4 rounded-[24px] border-[1.5px] border-dashed border-stroke px-5 py-8 text-center md:px-8 md:py-10"
        >
          <WritingNotebook className="h-[150px] w-[200px]" />
          <h2 id="tl-empty-h" className="text-2xl leading-8 font-bold">
            Trang đầu tiên đang chờ bạn
          </h2>
          <p className="max-w-[420px] text-body text-ink-soft">
            Chấm điểm cho hôm nay là xong trang đầu. Mỗi ngày bạn ghi sẽ hiện ở đây, mới nhất ở trên.
          </p>
          <Button asChild variant="cta" size="lg" className="mt-1">
            <Link to="/today">Viết trang hôm nay</Link>
          </Button>
          <ol className="mt-4 grid w-full grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="lift-sm flex flex-col gap-2 rounded-[16px] border-[1.5px] border-stroke bg-card p-4 text-left shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-on-primary">
                    {i + 1}
                  </span>
                  <s.icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="text-body font-semibold">{s.title}</span>
                <span className="text-[13px] leading-5 text-ink-soft">{s.text}</span>
              </li>
            ))}
          </ol>
        </section>
        <aside
          aria-label="Lịch tháng"
          className="flex min-w-[min(100%,280px)] flex-[0_1_340px] flex-col gap-3 rounded-[20px] border-[1.5px] border-stroke bg-card p-[18px] shadow-md"
        >
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-[18px] leading-6 font-semibold">{monthLabel(data.month)}</span>
            <span className="text-[13px] leading-[18px] text-ink-soft">0 ngày</span>
          </div>
          <div aria-hidden="true" className="grid grid-cols-7 gap-1">
            {DOWS.map((w) => (
              <span key={w} className="text-center text-[11px] leading-[14px] font-semibold text-ink-soft">
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
                  'flex h-11 justify-center rounded-[10px] pt-1 text-[11px] leading-3 nums',
                  // Hôm nay: nền đào tĩnh (mốc "bây giờ"); ngày đã qua trước khi dùng: không viền; chưa tới: viền nhạt.
                  d.day === today
                    ? 'border-2 border-stroke bg-peach font-bold text-on-accent'
                    : d.day < today
                      ? 'font-medium text-ink-faint'
                      : 'border border-line-soft font-medium text-ink-soft',
                )}
              >
                {d.day}
              </span>
            ))}
          </div>
          <p className="text-[13px] leading-[18px] text-ink-soft">Hôm nay là ngày đầu tiên của bạn với Jotly.</p>
        </aside>
      </div>
    </div>
  )
}
