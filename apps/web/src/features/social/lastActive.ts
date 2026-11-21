import { formatInTimeZone } from 'date-fns-tz'
import { t } from '@/lib/i18n'

/**
 * Nhãn "lần hoạt động" theo mốc 5 phút (ADR 0007, điểm theo dõi hoạt động).
 * - <5 phút: "vừa xong"
 * - 5–59 phút: "X phút trước", làm tròn xuống mốc 5 phút (5, 10, … 55)
 * - ≥60 phút: chỉ hiện theo giờ — "lúc HH:mm" nếu hôm nay, không thì "D/M".
 * `now` và `timeZone` do component truyền (from `useNow` + hồ sơ) để nhãn tự mới theo giờ người dùng.
 */
export function lastActiveLabel(iso: string | null | undefined, now: Date, timeZone: string): string | null {
  if (!iso) return null
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  const diffMin = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (diffMin < 5) return t('social:lastActive.justNow')
  if (diffMin < 60) {
    const n = Math.max(5, Math.floor(diffMin / 5) * 5)
    return t('social:lastActive.minutes', { n })
  }
  const sameDay = formatInTimeZone(then, timeZone, 'yyyy-MM-dd') === formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  return sameDay ? t('social:lastActive.today', { time: formatInTimeZone(then, timeZone, 'HH:mm') }) : t('social:lastActive.day', { date: formatInTimeZone(then, timeZone, 'd/M') })
}
