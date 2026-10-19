import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CONFIRM_WORD = 'XÓA'

type DeleteAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageCount: number
  onConfirm: () => void
}

/** Xóa tài khoản (F-08): xác nhận hai lần, lần hai phải gõ "XÓA". */
export function DeleteAccountDialog({ open, onOpenChange, pageCount, onConfirm }: DeleteAccountDialogProps) {
  const id = useId()
  const [text, setText] = useState('')
  const ok = text.trim().normalize('NFC').toLocaleUpperCase('vi') === CONFIRM_WORD
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setText('')
        onOpenChange(o)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa tài khoản và toàn bộ dữ liệu?</AlertDialogTitle>
          <AlertDialogDescription>
            {pageCount} trang nhật ký, kèm mọi điểm và ảnh, cùng tài khoản sẽ bị xóa vĩnh viễn. Muốn giữ lại thì tải dữ
            liệu về trước.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className="text-sm leading-[22px] font-semibold">
            Gõ <strong>{CONFIRM_WORD}</strong> để xác nhận
          </label>
          <Input id={id} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} className="bg-background" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ lại</AlertDialogCancel>
          <Button
            variant="destructive-solid"
            disabled={!ok}
            onClick={() => {
              onConfirm()
              setText('')
              onOpenChange(false)
            }}
          >
            Xóa vĩnh viễn
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
