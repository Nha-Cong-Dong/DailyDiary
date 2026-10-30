import type { ReactNode } from 'react'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/utils'

const STEPS = ['Tên & ảnh', 'Bộ icon', 'Múi giờ']

type OnboardingFrameProps = {
  step: 1 | 2 | 3
  /** Bước 2 rộng hơn để đủ chỗ cho 6 bộ icon. */
  wide?: boolean
  footer: ReactNode
  children: ReactNode
}

/** Khung chung cho 3 bước lần đầu: logo, "Bước n/3", thanh tiến độ, thẻ nội dung, hàng nút dưới. */
export function OnboardingFrame({ step, wide, footer, children }: OnboardingFrameProps) {
  const width = wide ? 'max-w-[640px]' : 'max-w-[560px]'
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 px-4 pt-5 pb-10 sm:gap-10 sm:px-10 sm:pt-7">
      <header className="flex items-center justify-between self-stretch">
        <Logo size="sm" />
        <span className="text-label leading-5 text-muted-foreground">Bước {step}/3</span>
      </header>

      <ol aria-label="Các bước" className={cn('grid w-full grid-cols-3 gap-2', width)}>
        {STEPS.map((name, i) => {
          const n = i + 1
          return (
            <li key={name} aria-current={n === step ? 'step' : undefined} className="flex flex-col gap-1.5">
              <span className={cn('h-1.5 rounded-full transition-colors duration-300', n <= step ? 'bg-line' : 'bg-border')} />
              <span className={cn('text-label leading-4', n === step ? 'font-semibold' : 'text-muted-foreground')}>{name}</span>
            </li>
          )
        })}
      </ol>

      <main
        key={step}
        className={cn(
          'flex w-full animate-rise flex-col gap-7 rounded-[24px] border-(length:--stroke-width) border-line bg-card p-6 shadow-ink sm:p-10',
          width,
        )}
      >
        {children}
      </main>

      <footer className={cn('flex w-full items-center justify-between gap-4', width)}>{footer}</footer>
    </div>
  )
}

export function StepHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[24px] leading-8 font-bold sm:text-[28px] sm:leading-9">{title}</h1>
      <p className="text-body leading-6 text-muted-foreground">{children}</p>
    </div>
  )
}
