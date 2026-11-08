import { useId } from 'react'
import { Avatar } from '@/components/layout/Avatar'
import { Input } from '@/components/ui/input'
import { tierLimits } from '@/lib/limits'
import { StepHeading } from './OnboardingFrame'
import { useT } from '@/lib/i18n'

type StepNameProps = {
  name: string
  onChange: (name: string) => void
  error: string | null
  /** Quay lại từ bước 2 thì đưa focus về tiêu đề; lần vào đầu tiên thì không. */
  revisit?: boolean
}

/** Bước 1 (B6-Onboard-1): tên hiển thị (mặc định lấy từ Google) và ảnh đại diện. */
export function StepName({ name, onChange, error, revisit = false }: StepNameProps) {
  const id = useId()
  const t = useT()
  return (
    <>
      <StepHeading title={t('profile:onboarding.nameStep.title')} focusOnMount={revisit}>
        {t('profile:onboarding.nameStep.desc')}
      </StepHeading>
      <div className="flex items-center gap-5">
        <Avatar name={name} size={88} className="font-bold shadow-sm" />
        {/* Đổi ảnh đại diện làm trong Hồ sơ; bước này chỉ hiện ảnh lấy từ Google (F-04 ghi là tùy chọn). */}
        <span className="text-label leading-[18px] font-normal text-ink-soft">{t('profile:onboarding.nameStep.googlePhoto')}</span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm leading-[22px] font-semibold">
          {t('profile:name.label')}
        </label>
        <Input
          id={id}
          value={name}
          maxLength={tierLimits().profile.display_name_max}
          autoComplete="nickname"
          enterKeyHint="next"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          onChange={(e) => onChange(e.target.value)}
          className="bg-paper"
        />
        <span
          id={`${id}-hint`}
          className={error ? 'text-label leading-5 font-medium text-danger' : 'text-label leading-5 font-normal text-ink-soft'}
        >
          {error ?? t('profile:name.hint')}
        </span>
      </div>
    </>
  )
}
