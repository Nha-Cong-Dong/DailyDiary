import { durationLabel, minutesLeftToday } from '@/lib/date'
import { rich } from '@/lib/rich'
import { useT } from '@/lib/i18n'

const DAY_MINUTES = 24 * 60

/**
 * Dải 24 giờ (B6 · Hôm nay): "Còn 2 giờ 56 phút trước khi sang ngày mới" và thanh ngày, phần đã qua tô lavender, kim
 * đào ở giờ hiện tại, vạch mỗi 6 giờ. Tính theo múi giờ hồ sơ (không theo giờ máy); `now` do màn truyền (useNow).
 */
export function DayClock({ timeZone, now }: { timeZone: string; now: Date }) {
  const t = useT()
  const left = minutesLeftToday(timeZone, now)
  const passed = Math.min(100, Math.max(0, ((DAY_MINUTES - left) / DAY_MINUTES) * 100))
  const at = `${passed.toFixed(1)}%`
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] leading-[18px] text-ink-soft">
        {rich(t('entry:dayClock.left', { duration: durationLabel(left) }), {
          b: (c) => <strong className="font-bold text-peach-ink nums">{c}</strong>,
        })}
      </p>
      <div aria-hidden="true" className="relative h-2.5 rounded-full border-[1.5px] border-stroke bg-card">
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-lavender-soft" style={{ width: at }} />
        {[25, 50, 75].map((p) => (
          <span key={p} className="absolute inset-y-0 w-[1.5px] bg-disabled-line" style={{ left: `${p}%` }} />
        ))}
        <span
          className="absolute -inset-y-[5px] w-2 -translate-x-1/2 rounded-[3px] border-[1.5px] border-stroke bg-peach"
          style={{ left: at }}
        />
      </div>
    </div>
  )
}
