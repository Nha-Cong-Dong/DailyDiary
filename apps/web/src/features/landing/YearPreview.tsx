import { useState } from 'react'
import { PixelCell, PixelLegend } from '@/components/diary/PixelCell'
import { pixelFilterOf, type PixelFilter } from '@/components/diary/pixelFilter'
import { demoYear } from './demoData'

const YEAR = demoYear()

/**
 * Lưới Year in Pixels minh họa: 12 tháng × 31 ngày, cuộn ngang khi màn hẹp.
 * Các ô "tô màu" dần theo tiến độ cuộn; chú thích bên dưới lọc/làm nổi theo mức điểm.
 */
export function YearPreview() {
  const [filter, setFilter] = useState<PixelFilter | null>(null)
  const [highlight, setHighlight] = useState<PixelFilter | null>(null)
  const focus = highlight ?? filter

  return (
    <div className="paint-timeline rounded-[20px] border-[1.5px] border-line bg-card p-4 shadow-ink sm:p-6">
      <div className="overflow-x-auto">
        <div className="flex min-w-[680px] flex-col gap-1 py-2">
          {YEAR.map((days, m) => (
            <div key={m} className="grid grid-cols-[32px_repeat(31,minmax(0,1fr))] items-center gap-1">
              <span className="text-[11px] leading-[14px] font-semibold text-muted-foreground">T{m + 1}</span>
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
                    className="paint-on-scroll transition-[transform,filter,box-shadow] duration-150 hover:relative hover:z-[2] hover:shadow-[0_0_0_1.5px_var(--icon-ink)] hover:[transform:scale(1.8)] active:[transform:scale(1.4)]"
                    style={{
                      animationRange: `cover ${start.toFixed(1)}% cover ${(start + 10).toFixed(1)}%`,
                      filter: dimmed ? 'grayscale(1) opacity(.25)' : undefined,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
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
