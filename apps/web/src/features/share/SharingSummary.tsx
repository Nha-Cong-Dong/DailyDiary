import { Lock } from 'lucide-react'
import { Link } from 'react-router'
import { useShareCount } from './useShares'
import { useT } from '@/lib/i18n'
import { rich } from '@/lib/rich'

/** Nội dung mục "Chia sẻ" trong Hồ sơ (B7-Profile, bản có Chia sẻ). */
export function SharingSummary() {
  const t = useT()
  const count = useShareCount()
  return (
    <div className="flex items-start gap-3.5">
      <span aria-hidden="true" className="edge flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-paper shadow-sm">
        <Lock className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body">
          {rich(t('share:summary.hint'), { b: (c) => <strong className="font-semibold">{c}</strong> })}
        </p>
        <p className="text-sm leading-[22px] text-ink-soft">{t('share:summary.hint2')}</p>
        <Link
          to="/profile/shares"
          className="press mt-1.5 self-start text-sm leading-[22px] font-semibold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {count ? t('share:summary.viewCount', { count }) : t('share:summary.viewAll')}
        </Link>
      </div>
    </div>
  )
}
