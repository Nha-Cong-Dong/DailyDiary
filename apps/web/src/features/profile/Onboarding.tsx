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

/**
 * Ba bước sau lần đăng nhập Google đầu tiên (thiết kế B6): tên → bộ icon → múi giờ.
 * Xong bước 3 thì PATCH /me một lần (tên, bộ icon, múi giờ, onboarded) rồi vào màn Hôm nay.
 */
export function Onboarding() {
  const navigate = useNavigate()
  const start = useProfile()
  const save = useUpdateProfile()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState(start.displayName)
  const [nameError, setNameError] = useState<string | null>(null)
  const [iconSetId, setIconSetId] = useState(start.iconSetId)
  const [timeZone, setTimeZone] = useState(start.timeZone)

  function next() {
    if (step === 1) {
      const trimmed = name.trim()
      const max = tierLimits().profile.display_name_max
      if (!trimmed) return setNameError('Tên không được để trống')
      if (trimmed.length > max) return setNameError(`Tên tối đa ${max} ký tự`)
      setName(trimmed)
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
      <Button variant="ghost" className="px-2" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>
        Quay lại
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
            <span role="alert" className="text-label text-destructive">
              Chưa lưu được. Thử lại nhé.
            </span>
          ) : null}
          <Button size="lg" className="press" onClick={next} disabled={save.isPending}>
            {step === 3 ? (
              <>
                Bắt đầu viết <Pencil aria-hidden="true" />
              </>
            ) : (
              <>
                Tiếp tục <ArrowRight aria-hidden="true" />
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
        />
      ) : step === 2 ? (
        <>
          <StepHeading title="Chọn bộ icon chấm điểm">
            Năm mức, từ ngày tệ nhất đến ngày tuyệt nhất. Đổi lại được trong Hồ sơ.
          </StepHeading>
          <IconSetPicker value={iconSetId} onChange={setIconSetId} />
        </>
      ) : (
        <>
          <StepHeading title="Ngày của bạn kết thúc lúc nào?">Jotly chốt mỗi ngày vào nửa đêm theo múi giờ của bạn.</StepHeading>
          <TimeZoneField value={timeZone} onChange={setTimeZone} />
        </>
      )}
    </OnboardingFrame>
  )
}
