import { dayProgress, durationLabel, useNow } from '@/lib/date'

const TICKS = [6, 12, 18]

/**
 * Dải 24 giờ ở đầu màn Hôm nay (DESIGN.md mục 8): còn bao lâu trước khi sang ngày mới, để người viết buổi tối ghi
 * đúng ngày. Phần đã qua tô oải hương (đã qua), mốc bây giờ màu đào. Giờ theo múi giờ trong hồ sơ, không theo máy.
 * Cập nhật mỗi 30 giây, không có chuyển động: thứ đổi chậm thì không cần animation. `now` chỉ để test cố định giờ.
 */
export function DayClock({ timeZone, now }: { timeZone: string; now?: Date }) {
  const tick = useNow()
  const { elapsed, total } = dayProgress(timeZone, now ?? tick)
  const left = total - elapsed
  const at = `${(elapsed / total) * 100}%`
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-muted-foreground">
        Còn <strong className="font-bold text-peach-ink">{durationLabel(left)}</strong> trước khi sang ngày mới
      </p>
      <div aria-hidden="true" className="relative h-2.5 rounded-full border-[1.5px] border-line bg-card">
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-lavender-soft" style={{ width: at }} />
        {TICKS.map((h) => (
          <span
            key={h}
            className="absolute inset-y-0 w-[1.5px] bg-disabled-line"
            style={{ left: `${((h * 60) / total) * 100}%` }}
          />
        ))}
        <span
          className="absolute -top-[5px] -bottom-[5px] w-2 -translate-x-1/2 rounded-[3px] border-[1.5px] border-line bg-peach"
          style={{ left: at }}
        />
      </div>
    </div>
  )
}
