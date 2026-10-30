import { CircleCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CalendarCell } from '@/components/diary/CalendarCell'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { scoreLabel, type Score } from '@/lib/catalog'
import { flyTo } from '@/lib/flyTo'
import { DEMO_ICON_SET, demoWeek } from './demoData'

/** Một ngày trong dải 7 ngày cạnh bộ chấm điểm (6 ngày trước hôm nay). */
export type WeekDay = { day: number; weekday: string; score: Score | null; sub?: string | null }

type Props = {
  iconSetId?: string
  /** Dòng trạng thái sau khi chấm (mặc định: câu của landing chưa đăng nhập). */
  status?: (score: Score, label: string) => ReactNode
  /** Thêm bên dưới, vd. link "Viết thêm cho hôm nay" khi đã đăng nhập. */
  footer?: ReactNode
  /** Điểm đang lưu (đã đăng nhập: điểm thật của hôm nay; null = chưa chấm). Bỏ trống = bản minh họa tại chỗ. */
  value?: Score | null
  onChange?: (score: Score) => void
  /** 6 ngày trước hôm nay; bỏ trống = tuần mẫu (12–17/10/2026). */
  week?: WeekDay[]
  /** Ngày hôm nay (số ngày và thứ) cho ô cuối dải. */
  today?: { day: number; weekday: string }
}

/**
 * Chấm điểm ngay trên trang chủ (DESIGN.md mục 7, cảnh "Một chạm"). Chưa đăng nhập: bản minh họa, chỉ đổi tại chỗ.
 * Đã đăng nhập: nơi gọi truyền `value`/`onChange` để lưu thật cho hôm nay. Lần chạm đầu, icon vừa chọn bay vào ô hôm
 * nay của dải 7 ngày ngay bên dưới; chọn lại mức khác thì ô đổi ngay.
 */
export function OneTapDemo({ iconSetId = DEMO_ICON_SET, status, footer, value, onChange, week, today }: Props) {
  const [local, setLocal] = useState<Score | null>(null)
  const controlled = onChange !== undefined
  const score = controlled ? (value ?? null) : local
  const label = score ? scoreLabel(iconSetId, score) : ''
  const days = week ?? demoWeek.days
  const now = today ?? demoWeek.today

  function pick(next: Score) {
    const apply = () => (controlled ? onChange(next) : setLocal(next))
    if (score === null) flyTo({ from: `[data-score-option="${next}"] svg`, to: '[data-today-cell] [data-cell-icon]', update: apply })
    else apply()
  }

  return (
    <div data-ui="" className="reveal-on-scroll lift flex w-full max-w-[520px] flex-col gap-5 rounded-[20px] border-[1.5px] border-line bg-card p-5 shadow-ink [--lift:4px] sm:p-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-heading text-lg leading-[26px] font-semibold">Hôm nay của bạn thế nào?</legend>
        <ScorePicker iconSetId={iconSetId} value={score} onChange={pick} caption="none" />
      </fieldset>
      {score ? (
        <p role="status" className="flex items-center gap-2 text-sm leading-[22px] text-muted-foreground">
          <CircleCheck className="size-[18px] shrink-0 text-foreground" aria-hidden="true" />
          <span>{status ? status(score, label) : `Điểm ${score} · ${label}. Đã ghi lại hôm nay.`}</span>
        </p>
      ) : (
        <p className="text-sm leading-[22px] text-muted-foreground">Chạm một mức là hôm nay đã được ghi.</p>
      )}
      <div role="list" aria-label="7 ngày gần nhất" className="grid grid-cols-7 gap-1.5 border-t-[1.5px] border-dashed border-border pt-4">
        {days.map((d) => (
          <div key={d.day} role="listitem">
            <CalendarCell
              day={d.day}
              weekday={d.weekday}
              score={d.score}
              subIcon={d.sub}
              iconSetId={iconSetId}
              state="past"
              label={`Ngày ${d.day}${d.score ? `, điểm ${d.score}` : ', chưa ghi'}`}
              className="w-full"
            />
          </div>
        ))}
        <div role="listitem" data-today-cell="">
          <CalendarCell
            day={now.day}
            weekday={now.weekday}
            score={score}
            iconSetId={iconSetId}
            state="today"
            label={`Hôm nay${score ? `, điểm ${score}` : ', chưa chấm'}`}
            className="w-full"
          />
        </div>
      </div>
      {footer}
    </div>
  )
}
