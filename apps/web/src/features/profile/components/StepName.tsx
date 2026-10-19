import { useId } from 'react'
import { Avatar } from '@/components/layout/Avatar'
import { Input } from '@/components/ui/input'
import { tierLimits } from '@/lib/limits'
import { StepHeading } from './OnboardingFrame'

type StepNameProps = {
  name: string
  onChange: (name: string) => void
  error: string | null
}

/** Bước 1: tên hiển thị (mặc định lấy từ Google ở Bước 3) và ảnh đại diện. */
export function StepName({ name, onChange, error }: StepNameProps) {
  const id = useId()
  return (
    <>
      <StepHeading title="Chào bạn! Jotly nên gọi bạn là gì?">Lấy sẵn từ tài khoản Google, bạn có thể sửa.</StepHeading>
      <div className="flex items-center gap-5">
        <Avatar name={name} size={88} className="font-heading text-[30px] font-bold shadow-ink-sm" />
        {/* Đổi ảnh đại diện (tối đa 2 MB, cắt 256×256) chưa làm: cần kho ảnh, F-04 ghi là tùy chọn. */}
        <span className="text-xs leading-[18px] text-muted-foreground">[Ảnh đại diện từ Google]</span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm leading-[22px] font-semibold">
          Tên hiển thị
        </label>
        <Input
          id={id}
          value={name}
          maxLength={tierLimits().profile.display_name_max}
          autoComplete="nickname"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background"
        />
        <span id={`${id}-hint`} className={error ? 'text-[13px] leading-5 font-medium text-destructive' : 'text-[13px] leading-5 text-muted-foreground'}>
          {error ?? 'Tên và ảnh hiện trên hồ sơ của bạn.'}
        </span>
      </div>
    </>
  )
}
