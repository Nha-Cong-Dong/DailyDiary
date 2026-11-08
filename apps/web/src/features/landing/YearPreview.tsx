import { Fragment, useState } from 'react'
import { PixelCell, PixelLegend } from '@/components/diary/PixelCell'
import { pixelFilterOf, type PixelFilter } from '@/components/diary/pixelFilter'
import { demoYear } from './demoData'
import { useT } from '@/lib/i18n'

const YEAR = demoYear()
type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

/**
 * Lưới Year in Pixels minh họa, không bao giờ cuộn ngang:
 * - từ 768 px: 12 hàng (tháng) × 31 cột (ngày);
 * - điện thoại: xoay lại thành 12 cột (tháng) × 31 hàng (ngày), mỗi ô khoảng 22 px ở màn 360 px.
 * Một lưới phẳng duy nhất (nhãn tháng rồi 31 ô, lặp 12 lần); chỉ đổi hướng xếp bằng grid-auto-flow.
 * Các ô "tô màu" dần theo tiến độ cuộn; chú thích bên dưới lọc/làm nổi theo mức điểm (`filterable`; tắt khi lưới chỉ là
 * hình minh họa nằm trong vùng aria-hidden, vd. mục Nhìn lại).
 */
export function YearPreview({ filterable = true }: { filterable?: boolean }) {
  const t = useT()
  const [filter, setFilter] = useState<PixelFilter | null>(null)
  const [highlight, setHighlight] = useState<PixelFilter | null>(null)
  const focus = highlight ?? filter

  return (
    <div className="paint-timeline rounded-lg border-2 border-stroke bg-card p-4 shadow-lg sm:p-6">
      <div className="grid grid-flow-col auto-cols-fr grid-rows-[auto_repeat(31,auto)] gap-[3px] md:grid-flow-row md:grid-cols-[32px_repeat(31,minmax(0,1fr))] md:grid-rows-none md:gap-1">
        {YEAR.map((days, m) => (
          <Fragment key={m}>
            <span className="pb-1 text-center text-label text-ink-soft md:pb-0 md:text-left">{t(`landing:yearPreview.months.${(m + 1) as Month}`)}</span>
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
                  label={`${t('landing:date.dm', { day: px.day, month: px.month })}${px.future ? '' : px.score ? t('landing:yearPreview.score', { score: px.score }) : t('landing:yearPreview.empty')}`}
                  className="paint-on-scroll transition-[transform,filter,box-shadow] duration-150 hover:relative hover:z-[2] hover:shadow-[0_0_0_1.5px_var(--icon-ink)] hover:[transform:scale(1.35)] active:[transform:scale(1.2)]"
                  style={{
                    animationRange: `cover ${start.toFixed(1)}% cover ${(start + 10).toFixed(1)}%`,
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
        onToggle={filterable ? (key) => setFilter((f) => (f === key ? null : key)) : undefined}
        onHighlight={filterable ? setHighlight : undefined}
      />
    </div>
  )
}
