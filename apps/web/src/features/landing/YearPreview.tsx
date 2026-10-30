import { Fragment, useState } from 'react'
import { PixelCell, PixelLegend } from '@/components/diary/PixelCell'
import { pixelFilterOf, type PixelFilter } from '@/components/diary/pixelFilter'
import { cn } from '@/lib/utils'
import { demoYear } from './demoData'

const YEAR = demoYear()

/**
 * Lưới Year in Pixels minh họa, không bao giờ cuộn ngang:
 * - từ 768 px: 12 hàng (tháng) × 31 cột (ngày);
 * - điện thoại: xoay lại thành 12 cột (tháng) × 31 hàng (ngày), mỗi ô khoảng 22 px ở màn 360 px.
 * Một lưới phẳng duy nhất (nhãn tháng rồi 31 ô, lặp 12 lần); chỉ đổi hướng xếp bằng grid-auto-flow.
 * Các ô "tô màu" dần theo tiến độ cuộn; chú thích bên dưới lọc/làm nổi theo mức điểm.
 */
export function YearPreview({ paint = true, className }: { paint?: boolean; className?: string }) {
  const [filter, setFilter] = useState<PixelFilter | null>(null)
  const [highlight, setHighlight] = useState<PixelFilter | null>(null)
  const focus = highlight ?? filter

  return (
    <div data-ui="" className={cn('rounded-[20px] border-[1.5px] border-line bg-card p-4 shadow-ink sm:p-6', paint && 'paint-timeline', className)}>
      <div className="grid grid-flow-col auto-cols-fr grid-rows-[auto_repeat(31,auto)] gap-[3px] md:grid-flow-row md:grid-cols-[32px_repeat(31,minmax(0,1fr))] md:grid-rows-none md:gap-1">
        {YEAR.map((days, m) => (
          <Fragment key={m}>
            <span className="pb-1 text-center text-label font-semibold text-muted-foreground md:pb-0 md:text-left">T{m + 1}</span>
            {days.map((px, d) => {
              if (!px) return <span key={d} />
              const state = px.future ? 'future' : 'past'
              const dimmed = focus !== null && pixelFilterOf(px.score, state) !== focus
              // Mỗi ô tô màu trễ hơn ô trước một chút: theo ngày trong tháng và theo tháng.
              const start = 4 + d * 0.9 + m * 0.6
              return (
                <PixelCell
                  key={d}
                  score={px.score}
                  state={state}
                  label={`${px.day}/${px.month}${px.future ? '' : px.score ? ` · điểm ${px.score}` : ' · chưa ghi'}`}
                  className={cn(
                    'transition-[transform,filter,box-shadow] duration-(--dur-fast) hover:relative hover:z-[2] hover:shadow-[0_0_0_1.5px_var(--icon-ink)] hover:[transform:scale(1.35)] active:[transform:scale(1.2)]',
                    paint && 'paint-on-scroll',
                  )}
                  style={{
                    animationRange: paint ? `cover ${start.toFixed(1)}% cover ${(start + 10).toFixed(1)}%` : undefined,
                    filter: dimmed ? 'grayscale(1) opacity(.25)' : undefined,
                  }}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
      <PixelLegend
        className="mt-[18px]"
        active={filter}
        onToggle={(key) => setFilter((f) => (f === key ? null : key))}
        onHighlight={setHighlight}
      />
    </div>
  )
}
