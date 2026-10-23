import { CircleCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { scoreLabel, type Score } from '@/lib/catalog'
import { DEMO_ICON_SET } from './demoData'

type Props = {
  iconSetId?: string
  /** Dòng trạng thái sau khi chấm (mặc định: câu của landing chưa đăng nhập). */
  status?: (score: Score, label: string) => ReactNode
  /** Thêm bên dưới, vd. link "Viết thêm cho hôm nay" khi đã đăng nhập. */
  footer?: ReactNode
  /** Điểm đang lưu (đã đăng nhập: điểm thật của hôm nay; null = chưa chấm). Bỏ trống = bản minh họa tại chỗ. */
  value?: Score | null
  onChange?: (score: Score) => void
}

/**
 * Chấm điểm ngay trên trang chủ. Chưa đăng nhập: bản minh họa, chỉ đổi tại chỗ.
 * Đã đăng nhập: nơi gọi truyền `value`/`onChange` để lưu thật cho hôm nay.
 */
export function OneTapDemo({ iconSetId = DEMO_ICON_SET, status, footer, value, onChange }: Props) {
  const [local, setLocal] = useState<Score>(4)
  const controlled = onChange !== undefined
  const score = controlled ? (value ?? null) : local
  const label = score ? scoreLabel(iconSetId, score) : ''
  return (
    <div className="reveal-on-scroll lift flex w-full max-w-[500px] flex-col gap-4 rounded-[20px] border-[1.5px] border-line bg-card p-5 shadow-ink sm:p-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-heading text-lg leading-[26px] font-semibold">Hôm nay của bạn thế nào?</legend>
        <ScorePicker iconSetId={iconSetId} value={score} onChange={controlled ? onChange : setLocal} caption="none" />
      </fieldset>
      {score ? (
        <p role="status" className="flex items-center gap-2 text-sm leading-[22px] text-muted-foreground">
          <CircleCheck className="size-[18px] shrink-0 text-foreground" aria-hidden="true" />
          <span>{status ? status(score, label) : `Điểm ${score} · ${label}. Đã ghi lại hôm nay.`}</span>
        </p>
      ) : (
        <p className="text-sm leading-[22px] text-muted-foreground">Chạm một mức là hôm nay đã được ghi.</p>
      )}
      {footer}
    </div>
  )
}
