import { ArrowLeft, ChevronUp, Info, Plus } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BottomSheet, SheetActions } from '@/components/diary/BottomSheet'
import { FlagPicker } from '@/components/diary/FlagPicker'
import { SubIconPicker } from '@/components/diary/SubIconPicker'
import { Toast } from '@/components/diary/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { flagName, subIcons } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'
import { cn } from '@/lib/utils'
import { FREQUENT_COUNT } from '../useFrequentSubIcons'

const legendClass = 'mb-2.5 p-0 text-sm leading-5 font-semibold md:mb-3 md:text-[15px] md:leading-6'
/** Nhãn trường (label/tiêu đề nhóm) cùng cỡ với legend: điện thoại 14px, máy tính 15px. */
export const fieldLabelClass = 'text-sm leading-5 font-semibold md:text-[15px] md:leading-6'

export function BackLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'press inline-flex h-10 items-center gap-1.5 self-start rounded-[12px] pr-3 pl-2 text-sm font-medium hover:[&_svg]:-translate-x-0.5 focus-visible:outline-3 focus-visible:outline-ring [&_svg]:transition-transform',
        className,
      )}
    >
      <ArrowLeft className="size-[18px]" aria-hidden="true" />
      {children}
    </Link>
  )
}

/** Nút/link chỉ có icon 44×44 trên thanh điện thoại; nền tối nhẹ khi bấm. */
export const phoneIconButton =
  'inline-flex size-11 cursor-pointer items-center justify-center rounded-[12px] text-foreground transition-colors active:bg-foreground/8 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-ring'

/**
 * Thanh trên của một màn trên điện thoại (thiết kế B10): trái / tiêu đề giữa / phải, cột 96px hai bên.
 * Đặt cố định đè lên thanh trên của app (cao 60px) vì màn này có thanh riêng; chỉ hiện dưới 768px.
 * Tiêu đề là `h1` chỉ khi trang không có tiêu đề riêng hiện trên điện thoại (màn Sửa); còn lại là chữ thường.
 */
export function PhoneBar({
  start,
  title,
  end,
  heading = false,
}: {
  start?: ReactNode
  title: ReactNode
  end?: ReactNode
  heading?: boolean
}) {
  const Title = heading ? 'h1' : 'p'
  return (
    <div className="fixed inset-x-0 top-0 z-[31] grid h-[60px] grid-cols-[96px_minmax(0,1fr)_96px] items-center border-b-[1.5px] border-line bg-background px-1.5 md:hidden">
      <div className="flex items-center">{start}</div>
      <Title className="truncate text-center font-sans text-base leading-[22px] font-semibold">{title}</Title>
      <div className="flex items-center justify-end">{end}</div>
    </div>
  )
}

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  /** Nút giữ nguyên (đóng hộp thoại). */
  cancelLabel: string
  /** Nút hành động phá hủy (xóa, bỏ thay đổi). */
  actionLabel: string
  onAction: () => void
  /** `true`: nút giữ nguyên là nút chính (nền mực), như "Tiếp tục sửa"; mặc định nút hành động là nút đặc màu đỏ. */
  cancelIsPrimary?: boolean
}

/**
 * Hộp xác nhận: máy tính là hộp giữa màn, điện thoại là bảng trượt từ đáy (thiết kế B10), cùng một BottomSheet
 * với hai nút cao 50px xếp dọc trên điện thoại: nút chính ở trên.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  actionLabel,
  onAction,
  cancelIsPrimary = false,
}: ConfirmDialogProps) {
  const cancel = (
    <Button variant={cancelIsPrimary ? 'default' : 'outline'} onClick={() => onOpenChange(false)}>
      {cancelLabel}
    </Button>
  )
  const action = (
    <Button
      variant={cancelIsPrimary ? 'outline' : 'destructive-solid'}
      className={cn(cancelIsPrimary && 'border-destructive text-destructive hover:bg-destructive-soft')}
      onClick={onAction}
    >
      {actionLabel}
    </Button>
  )
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      layout="responsive"
      role="alertdialog"
      danger={!cancelIsPrimary}
      title={title}
      description={description}
      showDescription
    >
      <SheetActions reverseOnDesktop={!cancelIsPrimary}>
        {cancelIsPrimary ? cancel : action}
        {cancelIsPrimary ? action : cancel}
      </SheetActions>
    </BottomSheet>
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

/** Thông báo nổi sau khi lưu, tự ẩn sau 2,4 giây (Toast chung của app). */
export function SavedToast({ children, onDone, className }: { children: ReactNode; onDone: () => void; className?: string }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(id)
  }, [onDone])
  return <Toast className={className}>{children}</Toast>
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
  /** Điện thoại: các trường nằm thẳng trên nền trang (màn Sửa, B10) nên ô nhập dùng nền thẻ. */
  flatOnPhone?: boolean
  /** Sub icon hay dùng (useFrequentSubIcons); chưa có thì lấy đầu danh mục. */
  frequentIcons?: string[]
}

/** Máy tính: hàng "hay dùng" + nút mở đủ bộ. Icon đang chọn luôn có trong hàng, kể cả khi không nằm trong top. */
function FrequentSubIcons({
  value,
  onChange,
  frequent,
}: {
  value: string | null
  onChange: (v: string | null) => void
  frequent?: string[]
}) {
  const [open, setOpen] = useState(false)
  const top = frequent?.length ? frequent : subIcons.slice(0, FREQUENT_COUNT)
  const row = value && !top.includes(value) ? [value, ...top.slice(0, FREQUENT_COUNT - 1)] : top
  const more = subIcons.length - row.length
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <SubIconPicker value={value} onChange={onChange} icons={open ? subIcons : row} className="contents" />
        {more > 0 ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="press inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[12px] border-[1.5px] border-dashed border-line px-3 text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring"
          >
            {open ? (
              <>
                <ChevronUp className="size-4" aria-hidden="true" /> Thu gọn
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden="true" /> Thêm {more}
              </>
            )}
          </button>
        ) : null}
      </div>
      {open ? null : <p className="text-xs leading-[18px] text-muted-foreground">Hay dùng nhất trong nhật ký của bạn.</p>}
    </div>
  )
}

/** Sub icon, cờ hiệu, tiêu đề, nội dung: phần "không bắt buộc" dùng chung cho màn Sửa và Ghi bù. */
export function ExtraFields(props: ExtraFieldsProps) {
  const ids = useId()
  const limits = tierLimits().entry
  const flagLabel = flagName(props.flag) ?? 'Không cờ'
  const fieldBg = props.flatOnPhone ? 'bg-card md:bg-background' : 'bg-background'
  return (
    <>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Legend>Sub icon</Legend>
        {/* Điện thoại: một hàng cuộn ngang tràn tới mép (B10). */}
        <SubIconPicker
          value={props.sub}
          onChange={props.onSub}
          className="-mx-4 flex-nowrap gap-2 overflow-x-auto px-4 pt-0.5 pb-1.5 [scrollbar-width:none] md:hidden"
        />
        {/* Máy tính: một hàng "hay dùng", bấm Thêm mới mở đủ bộ (đỡ thành bức tường 40+ ô). */}
        <div className="max-md:hidden">
          <FrequentSubIcons value={props.sub} onChange={props.onSub} frequent={props.frequentIcons} />
        </div>
      </fieldset>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Legend>Cờ hiệu · {flagLabel}</Legend>
        <FlagPicker value={props.flag} onChange={props.onFlag} form />
      </fieldset>
      <div className="flex flex-col gap-1.5 md:gap-2">
        <label htmlFor={`${ids}-title`} className={fieldLabelClass}>
          Tiêu đề
        </label>
        <Input
          id={`${ids}-title`}
          value={props.title}
          maxLength={limits.title_max}
          onChange={(e) => props.onTitle(e.target.value)}
          placeholder={props.titlePlaceholder}
          className={cn('h-12 font-heading text-[17px] font-semibold md:text-lg', fieldBg)}
        />
      </div>
      <div className="flex flex-col gap-1.5 md:gap-2">
        <label htmlFor={`${ids}-body`} className={fieldLabelClass}>
          Nội dung
        </label>
        <Textarea
          id={`${ids}-body`}
          value={props.content}
          maxLength={limits.content_max}
          onChange={(e) => props.onContent(e.target.value)}
          placeholder={props.contentPlaceholder}
          rows={props.contentRows ?? 4}
          className={cn('min-h-[124px] resize-y text-[17px] leading-[30px] md:text-reading', fieldBg)}
        />
      </div>
    </>
  )
}
