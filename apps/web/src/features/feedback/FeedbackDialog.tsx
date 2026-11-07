import { CircleCheck, Send } from 'lucide-react'
import { useId, useState } from 'react'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import { useSendFeedback } from './useSendFeedback'

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return 'Bạn vừa gửi khá nhiều góp ý. Thử lại sau ít phút nhé.'
  if (error instanceof ApiError && error.status === 422) return error.message
  return 'Chưa gửi được. Kiểm tra kết nối rồi thử lại.'
}

type FeedbackDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

/**
 * Form góp ý (F-09; canvas chỉ vẽ lối vào trong Hồ sơ B7/B10, hộp thoại dựng theo hệ 1.1; mở từ Hồ sơ và menu tài khoản). Ghi rõ góp ý đi kèm email tài
 * khoản để Jotly trả lời được. Gửi xong hiện lời cảm ơn; đóng lại thì form trống cho lần sau.
 */
export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { email } = useProfile()
  const send = useSendFeedback()
  const [message, setMessage] = useState('')
  const ids = useId()
  const max = tierLimits().feedback.message_max
  const text = message.trim()

  function change(next: boolean) {
    if (!next) {
      // Đóng sau khi gửi xong thì xóa form; đóng giữa chừng thì giữ chữ đang viết.
      if (send.isSuccess) setMessage('')
      send.reset()
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-w-[520px]">
        {send.isSuccess ? (
          <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
            <CircleCheck className="size-10 animate-pop text-sage-ink" aria-hidden="true" />
            <DialogTitle className="text-heading font-bold">Cảm ơn bạn!</DialogTitle>
            <DialogDescription className="text-body text-ink-soft">
              Góp ý đã tới Jotly. Nếu cần hỏi thêm, Jotly sẽ trả lời qua {email || 'email tài khoản của bạn'}.
            </DialogDescription>
            <Button className="mt-2" onClick={() => change(false)}>
              Đóng
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (text) send.mutate(text)
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-heading font-bold">Góp ý cho Jotly</DialogTitle>
              <DialogDescription className="text-body text-ink-soft">
                Điều gì làm bạn khó chịu, hay bạn muốn Jotly có thêm gì? Góp ý gửi kèm email tài khoản ({email}) để
                Jotly trả lời được.
              </DialogDescription>
            </DialogHeader>
            <label htmlFor={`${ids}-msg`} className="sr-only">
              Nội dung góp ý
            </label>
            <Textarea
              id={`${ids}-msg`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={max}
              rows={6}
              autoFocus
              placeholder="Ví dụ: mình muốn có nhắc viết lúc 21 giờ…"
              aria-describedby={`${ids}-count`}
              className="min-h-36"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span id={`${ids}-count`} className="text-label font-normal text-ink-soft nums">
                {message.length}/{max}
              </span>
              <Button type="submit" disabled={!text || send.isPending}>
                <Send aria-hidden="true" /> {send.isPending ? 'Đang gửi…' : 'Gửi góp ý'}
              </Button>
            </div>
            {send.isError ? (
              <p role="alert" className="text-label leading-5 font-medium text-danger">
                {errorText(send.error)}
              </p>
            ) : null}
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
