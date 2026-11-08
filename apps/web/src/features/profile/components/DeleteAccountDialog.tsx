import { useId, useState, type ReactNode } from 'react'
import { BottomSheet, SheetActions } from '@/components/diary/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isConfirmWord, isSameEmail } from '../confirm'
import { useT } from '@/lib/i18n'
import { rich } from '@/lib/rich'

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
  const t = useT()
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-paper"
        />
      </div>
      <SheetActions reverseOnDesktop>
        <Button variant="destructive-solid" disabled={!ok} onClick={onAction}>
          {actionLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t('profile:delete.keep')}
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
  const t = useT()
  const [text, setText] = useState('')
  const word = t('profile:delete.data.word')
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
      title={t('profile:delete.data.title')}
      description={t('profile:delete.data.description', {
        pages: pageCount !== undefined ? t('profile:delete.data.pages', { count: pageCount }) : t('profile:delete.data.allPages'),
        photos: photoCount ? t('profile:delete.data.photos', { count: photoCount }) : t('profile:delete.data.photosWord'),
      })}
      showDescription
      className="md:max-w-[min(460px,calc(100%-2rem))]"
    >
      <ConfirmField
        label={
          rich(t('profile:delete.data.confirmLabel', { word }), {
            b: (c) => <strong className="font-bold text-danger">{c}</strong>,
          })
        }
        type="text"
        value={text}
        onChange={setText}
        ok={isConfirmWord(text, word)}
        actionLabel={t('profile:delete.data.action')}
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
  const t = useT()
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
      title={t('profile:delete.account.title')}
      description={t('profile:delete.account.description')}
      showDescription
      className="md:max-w-[min(480px,calc(100%-2rem))]"
    >
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body text-ink">
        <li>
          {pageCount === undefined
            ? t('profile:delete.account.allPages')
            : pageCount
              ? photoCount
                ? t('profile:delete.account.pagesPhotos', { pages: pageCount, photos: photoCount })
                : t('profile:delete.account.pagesNoPhotos', { pages: pageCount })
              : t('profile:delete.account.empty')}
        </li>
        {shareCount ? <li>{t('profile:delete.account.shares', { count: shareCount })}</li> : null}
        <li>{t('profile:delete.account.profile')}</li>
      </ul>
      <p className="text-sm leading-[22px] text-ink-soft">
        {t('profile:delete.account.note', { email })}
      </p>
      <ConfirmField
        label={
          rich(t('profile:delete.account.confirmLabel', { email }), {
            b: (c) => <strong className="font-bold break-all text-danger">{c}</strong>,
          })
        }
        type="email"
        value={text}
        onChange={setText}
        ok={isSameEmail(text, email)}
        actionLabel={t('profile:delete.account.action')}
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
  const t = useT()
  return (
    <BottomSheet
      open={open}
      onOpenChange={() => undefined}
      layout="responsive"
      role="alertdialog"
      title={t('profile:delete.done.title')}
      description={t('profile:delete.done.description')}
      showDescription
    >
      <SheetActions>
        <Button variant="cta" onClick={onHome}>
          {t('profile:delete.done.home')}
        </Button>
      </SheetActions>
    </BottomSheet>
  )
}
