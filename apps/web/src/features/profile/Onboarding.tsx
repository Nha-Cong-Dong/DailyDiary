import { ArrowRight, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { tierLimits } from '@/lib/limits'
import { useProfile, useUpdateProfile } from '@/lib/profile'
import { IconSetPicker } from './components/IconSetPicker'
import { OnboardingFrame, StepHeading } from './components/OnboardingFrame'
import { StepName } from './components/StepName'
import { TimeZoneField } from './components/TimeZoneField'
import { useT } from '@/lib/i18n'

/**
 * Ba bước sau lần đăng nhập Google đầu tiên (thiết kế B6-Onboard-1..3): tên → bộ icon → múi giờ.
 * Xong bước 3 thì PATCH /me một lần (tên, bộ icon, múi giờ, onboarded) rồi vào màn Hôm nay.
 */
export function Onboarding() {
  const navigate = useNavigate()
  const t = useT()
  const start = useProfile()
  const save = useUpdateProfile()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState(start.displayName)
  const [nameError, setNameError] = useState<string | null>(null)
  const [iconSetId, setIconSetId] = useState(start.iconSetId)
  const [timeZone, setTimeZone] = useState(start.timeZone)
  // Đã rời bước 1 ít nhất một lần: quay lại thì đưa focus về tiêu đề.
  const [visited, setVisited] = useState(false)

  function next() {
    if (step === 1) {
      const trimmed = name.trim()
      const max = tierLimits().profile.display_name_max
      if (!trimmed) return setNameError(t('profile:name.empty'))
      if (trimmed.length > max) return setNameError(t('profile:name.tooLong', { max }))
      setName(trimmed)
      setVisited(true)
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else {
      save.mutate(
        { display_name: name, icon_set_id: iconSetId, timezone: timeZone, onboarded: true },
        { onSuccess: () => navigate('/today', { replace: true }) },
      )
    }
  }

  const back =
    step > 1 ? (
      <Button variant="ghost" className="h-11 px-2" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>
        {t('profile:onboarding.back')}
      </Button>
    ) : (
      <span />
    )

  return (
    <OnboardingFrame
      step={step}
      wide={step === 2}
      footer={
        <>
          {back}
          {save.isError ? (
            <span role="alert" className="text-label leading-5 font-medium text-danger">
              {t('profile:name.saveError')}
            </span>
          ) : null}
          <Button size="lg" onClick={next} disabled={save.isPending}>
            {save.isPending ? (
              t('profile:onboarding.saving')
            ) : step === 3 ? (
              <>
                {t('profile:onboarding.start')} <Pencil aria-hidden="true" />
              </>
            ) : (
              <>
                {t('profile:onboarding.next')} <ArrowRight aria-hidden="true" />
              </>
            )}
          </Button>
        </>
      }
    >
      {step === 1 ? (
        <StepName
          name={name}
          onChange={(v) => {
            setName(v)
            setNameError(null)
          }}
          error={nameError}
          revisit={visited}
        />
      ) : step === 2 ? (
        <>
          <StepHeading title={t('profile:onboarding.iconStep.title')}>{t('profile:onboarding.iconStep.desc')}</StepHeading>
          <IconSetPicker
            value={iconSetId}
            onChange={setIconSetId}
            className="grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3"
          />
        </>
      ) : (
        <>
          <StepHeading title={t('profile:onboarding.timeZoneStep.title')}>{t('profile:onboarding.timeZoneStep.desc')}</StepHeading>
          <TimeZoneField value={timeZone} onChange={setTimeZone} />
        </>
      )}
    </OnboardingFrame>
  )
}
