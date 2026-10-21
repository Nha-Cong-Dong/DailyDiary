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
}

/** Thử chấm điểm ngay trên trang chủ; chỉ đổi trạng thái tại chỗ, không gửi đi đâu. */
export function OneTapDemo({ iconSetId = DEMO_ICON_SET, status, footer }: Props) {
  const [score, setScore] = useState<Score>(4)
  const label = scoreLabel(iconSetId, score)
  return (
    <div className="reveal-on-scroll lift flex w-full max-w-[500px] flex-col gap-4 rounded-[20px] border-[1.5px] border-line bg-card p-5 shadow-ink sm:p-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-heading text-lg leading-[26px] font-semibold">Hôm nay của bạn thế nào?</legend>
        <ScorePicker iconSetId={iconSetId} value={score} onChange={setScore} caption="none" />
      </fieldset>
      <p role="status" className="flex items-center gap-2 text-sm leading-[22px] text-muted-foreground">
        <CircleCheck className="size-[18px] shrink-0 text-foreground" aria-hidden="true" />
        <span>{status ? status(score, label) : `Điểm ${score} · ${label}. Đã ghi lại hôm nay.`}</span>
      </p>
      {footer}
    </div>
  )
}
