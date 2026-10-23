import { useId, useState, type ReactNode } from 'react'
import { BottomSheet, SheetActions } from '@/components/diary/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isConfirmWord, isSameEmail } from '../confirm'

type DialogBase = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** Ô xác nhận và hai nút cuối hộp (điện thoại: nút xóa ở trên; máy tính: Giữ lại bên trái). */
function ConfirmField({
  label,
  type,
  value,
  onChange,
  ok,
  actionLabel,
  onCancel,
  onAction,
}: {
  label: ReactNode
  type: 'text' | 'email'
  value: string
  onChange: (v: string) => void
  ok: boolean
  actionLabel: string
  onCancel: () => void
  onAction: () => void
}) {
  const id = useId()
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm leading-[22px] font-semibold">
          {label}
        </label>
        <Input
          id={id}
          type={type}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 bg-background text-base"
        />
      </div>
      <SheetActions reverseOnDesktop>
        <Button variant="destructive-solid" disabled={!ok} onClick={onAction}>
          {actionLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Giữ lại
        </Button>
      </SheetActions>
    </>
  )
}

/** Xóa toàn bộ dữ liệu: xóa mọi trang, điểm, ảnh; giữ tài khoản. Gõ "XÓA" để xác nhận. */
export function DeleteDataDialog({
  open,
  onOpenChange,
  onConfirm,
  pageCount,
  photoCount,
}: DialogBase & { pageCount?: number; photoCount?: number }) {
  const [text, setText] = useState('')
  const close = (o: boolean) => {
    if (!o) setText('')
    onOpenChange(o)
  }
  return (
    <BottomSheet
      open={open}
      onOpenChange={close}
      layout="responsive"
      role="alertdialog"
      danger
      title="Xóa toàn bộ dữ liệu?"
      description={`${pageCount !== undefined ? `${pageCount} trang` : 'Mọi trang'}, kèm mọi điểm, ${photoCount ? `${photoCount} ảnh` : 'ảnh'} và link chia sẻ, sẽ bị xóa vĩnh viễn (cả trang đang trong thùng rác). Tài khoản, cài đặt và ảnh đại diện vẫn giữ để bạn viết tiếp.`}
      showDescription
      className="md:max-w-[min(460px,calc(100%-2rem))]"
    >
      <ConfirmField
        label={
          <>
            Gõ <strong className="font-bold text-destructive">XÓA</strong> để xác nhận
          </>
        }
        type="text"
        value={text}
        onChange={setText}
        ok={isConfirmWord(text)}
        actionLabel="Xóa vĩnh viễn"
        onCancel={() => close(false)}
        onAction={() => {
          onConfirm()
          close(false)
        }}
      />
    </BottomSheet>
  )
}

/** Xóa tài khoản: liệt kê những gì mất, gõ đúng email để xác nhận. */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
  email,
  pageCount,
  photoCount,
  shareCount = 0,
}: DialogBase & { email: string; pageCount?: number; photoCount?: number; shareCount?: number }) {
  const [text, setText] = useState('')
  const close = (o: boolean) => {
    if (!o) setText('')
    onOpenChange(o)
  }
  return (
    <BottomSheet
      open={open}
      onOpenChange={close}
      layout="responsive"
      role="alertdialog"
      danger
      title="Xóa tài khoản Jotly?"
      description="Bạn sẽ được đăng xuất ngay. Những thứ sau sẽ bị xóa vĩnh viễn:"
      showDescription
      className="md:max-w-[min(480px,calc(100%-2rem))]"
    >
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-6 marker:text-destructive">
        <li>
          {pageCount === undefined
            ? 'Mọi trang nhật ký, kèm điểm và ảnh'
            : pageCount
              ? `${pageCount} trang nhật ký, kèm điểm${photoCount ? ` và ${photoCount} ảnh` : ' và ảnh'}`
              : 'Hồ sơ trống, không còn trang nhật ký nào'}
        </li>
        {shareCount ? <li>{shareCount} link chia sẻ, người nhận sẽ không mở được nữa</li> : null}
        <li>Hồ sơ, ảnh đại diện, bộ icon, múi giờ và cài đặt</li>
      </ul>
      <p className="text-sm leading-[22px] text-muted-foreground">
        Góp ý bạn từng gửi được giữ lại nhưng không còn tên hay email của bạn. Tài khoản Google của bạn không bị ảnh
        hưởng; đăng nhập lại sau này sẽ bắt đầu một cuốn nhật ký mới.
      </p>
      <ConfirmField
        label={
          <>
            Gõ email <strong className="font-bold break-all text-destructive">{email}</strong> để xác nhận
          </>
        }
        type="email"
        value={text}
        onChange={setText}
        ok={isSameEmail(text, email)}
        actionLabel="Xóa tài khoản"
        onCancel={() => close(false)}
        onAction={() => {
          onConfirm()
          close(false)
        }}
      />
    </BottomSheet>
  )
}

/** Màn kết thúc sau khi xóa tài khoản (thiết kế B7 · Hồ sơ): không đóng được bằng chạm nền, chỉ có Về trang chủ. */
export function AccountDeletedDialog({ open, onHome }: { open: boolean; onHome: () => void }) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={() => undefined}
      layout="responsive"
      role="alertdialog"
      title="Tài khoản đã được xóa"
      description="Cảm ơn bạn đã viết cùng Jotly. Nhật ký, link chia sẻ và hồ sơ của bạn đã được xóa; ảnh được dọn khỏi kho trong ít phút."
      showDescription
    >
      <SheetActions>
        <Button variant="cta" onClick={onHome}>
          Về trang chủ
        </Button>
      </SheetActions>
    </BottomSheet>
  )
}
