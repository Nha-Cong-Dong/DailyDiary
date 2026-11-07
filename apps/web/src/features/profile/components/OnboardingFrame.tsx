import { useEffect, useRef, type ReactNode } from 'react'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/utils'

const STEPS = ['Tên & ảnh', 'Bộ icon', 'Múi giờ']

type OnboardingFrameProps = {
  step: 1 | 2 | 3
  /** Bước 2 rộng hơn để đủ chỗ cho 6 bộ icon (640 px thay vì 560 px). */
  wide?: boolean
  footer: ReactNode
  children: ReactNode
}

/**
 * Khung chung cho 3 bước lần đầu (B6-Onboard-1..3): logo, "Bước n/3", thanh tiến độ ba vạch, tờ giấy nội dung, hàng nút
 * dưới. Canvas chỉ vẽ máy tính 1280 px; điện thoại co đệm và khoảng cách, giữ cùng thứ tự.
 */
export function OnboardingFrame({ step, wide, footer, children }: OnboardingFrameProps) {
  const width = wide ? 'max-w-[640px]' : 'max-w-[560px]'
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 bg-paper px-4 pt-5 pb-10 text-ink sm:gap-10 sm:px-10 sm:pt-7">
      <header className="flex items-center justify-between self-stretch">
        <Logo size="sm" />
        <span className="text-label leading-5 font-normal text-ink-soft nums">Bước {step}/3</span>
      </header>

      <ol aria-label="Các bước" className={cn('m-0 grid w-full list-none grid-cols-3 gap-2 p-0', width)}>
        {STEPS.map((name, i) => {
          const n = i + 1
          return (
            <li key={name} aria-current={n === step ? 'step' : undefined} className="flex flex-col gap-1.5">
              <span
                aria-hidden="true"
                className={cn('h-1.5 rounded-full transition-colors duration-(--dur-base) ease-out', n <= step ? 'bg-ink' : 'bg-line-soft')}
              />
              <span className={cn('text-label leading-4', n === step ? 'text-ink' : 'font-normal text-ink-soft')}>{name}</span>
            </li>
          )
        })}
      </ol>

      <main
        key={step}
        className={cn('flex w-full animate-rise flex-col gap-7 rounded-[24px] edge bg-card p-6 shadow-md sm:p-10', width)}
      >
        {children}
      </main>

      <footer className={cn('flex w-full items-center justify-between gap-4', width)}>{footer}</footer>
    </div>
  )
}

/**
 * Tiêu đề và mô tả của một bước. Đổi bước thì đưa focus về tiêu đề mới (không cuộn) để trình đọc màn hình đọc ngay;
 * lần vào đầu tiên để focus tự nhiên ở ô nhập.
 */
export function StepHeading({ title, children, focusOnMount = true }: { title: string; children: ReactNode; focusOnMount?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true })
  }, [focusOnMount])
  return (
    <div className="flex flex-col gap-2">
      <h1 ref={ref} tabIndex={-1} className="text-title font-bold outline-none">
        {title}
      </h1>
      <p className="text-body text-ink-soft">{children}</p>
    </div>
  )
}
