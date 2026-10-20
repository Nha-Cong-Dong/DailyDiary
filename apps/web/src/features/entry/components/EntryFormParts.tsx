import { ArrowLeft, Check, Info } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { FlagPicker } from '@/components/diary/FlagPicker'
import { SubIconPicker } from '@/components/diary/SubIconPicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { flagColors } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'
import { cn } from '@/lib/utils'

const legendClass = 'mb-3 p-0 text-[15px] leading-6 font-semibold'

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="press inline-flex h-10 items-center gap-1.5 self-start rounded-[12px] pr-3 pl-2 text-sm font-medium hover:[&_svg]:-translate-x-1 focus-visible:outline-3 focus-visible:outline-ring [&_svg]:transition-transform"
    >
      <ArrowLeft className="size-[18px]" aria-hidden="true" />
      {children}
    </Link>
  )
}

/** Nhãn nhóm (legend) của một trường trong form trang. */
export function Legend({ children }: { children: ReactNode }) {
  return <legend className={legendClass}>{children}</legend>
}

/** Hộp ghi chú nền chìm, viền nét đứt. */
export function Notice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-border bg-muted px-4 py-3 text-sm leading-[22px]',
        className,
      )}
    >
      <Info className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/** Thông báo nổi ở cuối màn, tự ẩn sau 2,4 giây. */
export function SavedToast({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(id)
  }, [onDone])
  return (
    <div
      role="status"
      className="fixed bottom-[104px] left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 animate-rise items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-primary py-3 pr-[18px] pl-3.5 text-sm leading-[22px] font-semibold text-primary-foreground shadow-ink md:bottom-24"
    >
      <span className="inline-flex size-[22px] shrink-0 animate-stamp items-center justify-center rounded-full bg-score-5 text-[#272218]">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
      {children}
    </div>
  )
}

type ExtraFieldsProps = {
  sub: string | null
  onSub: (v: string | null) => void
  flag: string | null
  onFlag: (v: string | null) => void
  title: string
  onTitle: (v: string) => void
  content: string
  onContent: (v: string) => void
  titlePlaceholder: string
  contentPlaceholder: string
  contentRows?: number
}

/** Sub icon, cờ hiệu, tiêu đề, nội dung: phần "không bắt buộc" dùng chung cho màn Sửa và Ghi bù. */
export function ExtraFields(props: ExtraFieldsProps) {
  const ids = useId()
  const limits = tierLimits().entry
  const flagName = flagColors.find((f) => f.hex.toLowerCase() === props.flag?.toLowerCase())?.name ?? 'Không cờ'
  return (
    <>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Legend>Sub icon</Legend>
        <SubIconPicker value={props.sub} onChange={props.onSub} className="gap-2" />
      </fieldset>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Legend>Cờ hiệu · {flagName}</Legend>
        <FlagPicker value={props.flag} onChange={props.onFlag} />
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-title`} className="text-[15px] leading-6 font-semibold">
          Tiêu đề
        </label>
        <Input
          id={`${ids}-title`}
          value={props.title}
          maxLength={limits.title_max}
          onChange={(e) => props.onTitle(e.target.value)}
          placeholder={props.titlePlaceholder}
          className="h-12 bg-background font-heading text-lg font-semibold"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-body`} className="text-[15px] leading-6 font-semibold">
          Nội dung
        </label>
        <Textarea
          id={`${ids}-body`}
          value={props.content}
          maxLength={limits.content_max}
          onChange={(e) => props.onContent(e.target.value)}
          placeholder={props.contentPlaceholder}
          rows={props.contentRows ?? 4}
          className="min-h-[124px] resize-y bg-background text-reading leading-[30px]"
        />
      </div>
    </>
  )
}
