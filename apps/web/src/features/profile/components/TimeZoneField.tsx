import { formatInTimeZone } from 'date-fns-tz'
import { Check, Clock } from 'lucide-react'
import { useId } from 'react'
import {
  browserTimeZone,
  durationLabel,
  minutesLeftToday,
  shortDateLabel,
  supportedTimeZones,
  timeIn,
  timeZoneLabel,
  todayIn,
  useNow,
} from '@/lib/date'
import { useT } from '@/lib/i18n'

function offsetMinutes(timeZone: string, at: Date): number {
  const [h, m] = formatInTimeZone(at, timeZone, 'xxx').split(':').map(Number)
  return h * 60 + Math.sign(h || 1) * m
}

// Danh sách dựng một lần khi tải module: sắp theo độ lệch UTC rồi theo tên, các múi giờ cùng giờ đứng gần nhau.
const LOADED_AT = new Date()
const OPTIONS = supportedTimeZones()
  .map((tz) => ({ tz, label: timeZoneLabel(tz, LOADED_AT), offset: offsetMinutes(tz, LOADED_AT) }))
  .sort((a, b) => a.offset - b.offset || a.tz.localeCompare(b.tz, 'en'))
const DETECTED = browserTimeZone()

const byOffset = (a: { offset: number; tz: string }, b: { offset: number; tz: string }) => a.offset - b.offset || a.tz.localeCompare(b.tz, 'en')

/**
 * Danh sách của trình duyệt có thể thiếu múi giờ đang lưu: Chromium liệt kê "Asia/Saigon" chứ không có
 * "Asia/Ho_Chi_Minh". Thiếu thì thêm vào để ô chọn hiện đúng, không nhảy về mục đầu tiên.
 */
function optionsWith(value: string) {
  if (!value || OPTIONS.some((o) => o.tz === value)) return OPTIONS
  return [...OPTIONS, { tz: value, label: timeZoneLabel(value, LOADED_AT), offset: offsetMinutes(value, LOADED_AT) }].sort(byOffset)
}

type TimeZoneFieldProps = {
  value: string
  onChange: (timeZone: string) => void
  /** Múi giờ đang lưu trong hồ sơ; khác `value` thì hiện lời nhắc "chỉ áp dụng từ ngày đang viết". */
  saved?: string
}

/** Chọn múi giờ IANA (tự nhận theo trình duyệt), kèm giờ hiện tại và thời gian còn lại của hôm nay. */
export function TimeZoneField({ value, onChange, saved }: TimeZoneFieldProps) {
  const id = useId()
  const t = useT()
  const now = useNow()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm leading-[22px] font-semibold">
        {t('profile:timeZone.label')}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-hint`}
        className="h-12 w-full cursor-pointer rounded-md edge bg-paper px-3 text-body text-ink transition-shadow duration-(--dur-fast) ease-out focus-visible:shadow-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {optionsWith(value).map((o) => (
          <option key={o.tz} value={o.tz}>
            {o.label}
          </option>
        ))}
      </select>
      <span id={`${id}-hint`} className="inline-flex items-start gap-1.5 text-label leading-5 font-normal text-ink-soft sm:items-center">
        {value === DETECTED ? (
          <>
            <Check className="mt-[3px] size-3.5 shrink-0 sm:mt-0" strokeWidth={2.4} aria-hidden="true" />
            {t('profile:timeZone.detected')}
          </>
        ) : (
          t('profile:timeZone.hint')
        )}
      </span>

      <div className="mt-1 flex items-center gap-3.5 rounded-[16px] border-[1.5px] border-dashed border-ink-faint bg-sunk px-[18px] py-4">
        <Clock className="size-7 shrink-0" aria-hidden="true" />
        <div aria-live="polite" className="flex flex-col nums">
          <span className="text-body font-semibold">
            {t('profile:timeZone.now', { time: timeIn(value, now), date: shortDateLabel(todayIn(value, now)) })}
          </span>
          <span className="text-sm leading-[22px] text-ink-soft">
            {t('profile:timeZone.left', { left: durationLabel(minutesLeftToday(value, now)) })}
          </span>
        </div>
      </div>

      {saved && saved !== value ? (
        <p role="status" className="animate-fade text-label leading-5 font-normal text-ink-soft">
          {t('profile:timeZone.changed')}
        </p>
      ) : null}
    </div>
  )
}
