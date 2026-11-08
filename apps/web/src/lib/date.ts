import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n'

/**
 * Ngày theo múi giờ của người dùng (skill date-timezone-rules).
 * `entry_date` là chuỗi "YYYY-MM-DD" theo múi giờ trong hồ sơ, không theo múi giờ máy, không lấy từ toISOString().
 */
export type DateString = string

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6
type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

// Tên thứ và tháng lấy từ bản dịch (locales/*/common.ts), nên đổi theo ngôn ngữ giao diện.
const weekdayLong = (d: Date) => t(`common:date.weekdayLong.${d.getUTCDay() as Day}`)
const monthOf = (d: Date) => (d.getUTCMonth() + 1) as Month

/** Múi giờ IANA của trình duyệt (gợi ý khi đăng ký lần đầu). */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
}

/** Danh sách múi giờ IANA trình duyệt hỗ trợ. */
export function supportedTimeZones(): string[] {
  const list = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return list.length ? list : [browserTimeZone()]
}

export function todayIn(timeZone: string, now: Date = new Date()): DateString {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
}

export function timeIn(timeZone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timeZone, 'HH:mm')
}

/** Ví dụ "(GMT+07:00) Asia/Ho_Chi_Minh". */
export function timeZoneLabel(timeZone: string, now: Date = new Date()): string {
  return `(GMT${formatInTimeZone(now, timeZone, 'xxx')}) ${timeZone.replaceAll('_', ' ')}`
}

// Phép tính trên ngày lịch làm bằng UTC để không dính giờ mùa hè hay múi giờ máy.
function parts(date: DateString): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function format(date: Date): DateString {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: DateString, days: number): DateString {
  const d = parts(date)
  d.setUTCDate(d.getUTCDate() + days)
  return format(d)
}

/** `count` ngày liền nhau kết thúc ở `end` (cũ nhất trước). */
export function daysEndingAt(end: DateString, count: number): DateString[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1))
}

export function weekdayShort(date: DateString): string {
  return t(`common:date.weekdayShort.${parts(date).getUTCDay() as Day}`)
}

export function dayOfMonth(date: DateString): number {
  return parts(date).getUTCDate()
}

/** "Chủ nhật · 18 tháng 10, 2026" / "Sunday · October 18, 2026"; bỏ năm khi `withYear` là false. */
export function longDateLabel(date: DateString, withYear = true): string {
  const d = parts(date)
  const vars = {
    weekday: weekdayLong(d),
    day: d.getUTCDate(),
    monthLong: t(`common:date.monthLong.${monthOf(d)}`),
    year: d.getUTCFullYear(),
  }
  return withYear ? t('common:date.longDate', vars) : t('common:date.longDateNoYear', vars)
}

/** "Chủ nhật 18/10" / "Sunday, Oct 18". */
export function shortDateLabel(date: DateString): string {
  const d = parts(date)
  return t('common:date.shortDate', {
    weekday: weekdayLong(d),
    day: d.getUTCDate(),
    month: monthOf(d),
    monthShort: t(`common:date.monthShort.${monthOf(d)}`),
  })
}

/** Số phút còn lại tới nửa đêm theo múi giờ người dùng (lúc ngày hôm nay được chốt). */
export function minutesLeftToday(timeZone: string, now: Date = new Date()): number {
  const tomorrow = addDays(todayIn(timeZone, now), 1)
  const midnight = fromZonedTime(`${tomorrow}T00:00:00`, timeZone)
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 60000))
}

/** "2 giờ 56 phút" / "2 h 56 min". */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return t('common:date.durationMinutes', { m })
  return m ? t('common:date.durationHoursMinutes', { h, m }) : t('common:date.durationHours', { h })
}

/** Thời điểm hiện tại, cập nhật mỗi `intervalMs` (mặc định 30 giây) để "hôm nay" tự sang ngày mới lúc nửa đêm. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

/** Chuỗi "YYYY-MM-DD" có phải một ngày có thật không (2026-02-30 thì không). */
export function isValidDate(date: string): date is DateString {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  return format(parts(date)) === date
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function daysInYear(year: number): number {
  return Array.from({ length: 12 }, (_, m) => daysInMonth(year, m + 1)).reduce((a, b) => a + b, 0)
}

/**
 * Nhãn F-01: "ghi đúng ngày" khi lần sửa cuối (đổi sang múi giờ người dùng) rơi vào chính `entry_date`,
 * ngược lại là "cập nhật muộn".
 */
export function editedOnTheDay(entryDate: DateString, updatedAt: string, timeZone: string): boolean {
  return todayIn(timeZone, new Date(updatedAt)) === entryDate
}
