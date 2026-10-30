import type { CSSProperties } from 'react'
import { MoodMark } from '@/components/diary/MoodMark'
import { flagColors, flagHex } from '@/lib/catalog'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { DEMO_ICON_SET } from './demoData'

/**
 * Trang ngày mẫu (18/10/2026, dữ liệu minh họa): dải cờ, main icon + sub icon, ngày, tiêu đề, vài dòng trên dòng kẻ vở.
 * Dùng ở hero trang chủ (thẻ nghiêng) và ở cảnh "Một ngày → một tháng → một năm".
 */
export function DemoDayCard({ className, style, hero = false }: { className?: string; style?: CSSProperties; hero?: boolean }) {
  const dark = useDarkMode()
  const lavender = flagColors.find((f) => f.id === 'lavender')!
  return (
    <article
      data-ui=""
      className={cn('overflow-hidden rounded-[20px] border-(length:--stroke-width) border-line bg-card shadow-ink', hero && 'group/tilt', className)}
      style={style}
    >
      <div className="h-14 border-b-(length:--stroke-width) border-line" style={{ backgroundColor: flagHex(lavender.hex, dark) }} />
      <div className="flex flex-col gap-2 px-5 pb-5">
        <span
          // Chuỗi mở đầu trang chủ: icon này bay vào ô hôm nay của lịch tháng (lib/flyTo.ts).
          data-hero-day-icon={hero ? '' : undefined}
          className="-mt-[30px] flex size-[60px] items-center justify-center rounded-full border-(length:--stroke-width) border-line bg-card"
        >
          <MoodMark iconSetId={DEMO_ICON_SET} score={4} subIcon="😌" size={44} />
        </span>
        <span className="text-label text-muted-foreground">Chủ nhật, 18/10 · Hôm nay</span>
        <span className="font-heading text-lg leading-[26px] font-semibold">Chiều mưa đọc sách</span>
        <span className="ruled text-sm leading-6">Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở.</span>
      </div>
    </article>
  )
}
