import { CircleCheck, Send } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import { useSendFeedback } from './useSendFeedback'

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return t('feedback:rateLimited')
  if (error instanceof ApiError && error.status === 422) return error.message
  return t('feedback:failed')
}

type FeedbackDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

/**
 * Form góp ý (F-09; canvas chỉ vẽ lối vào trong Hồ sơ B7/B10, hộp thoại dựng theo hệ 1.1; mở từ Hồ sơ và menu tài khoản). Ghi rõ góp ý đi kèm email tài
 * khoản để Jotly trả lời được. Gửi xong hiện lời cảm ơn; đóng lại thì form trống cho lần sau.
 */
export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  useTranslation() // chỉ để vẽ lại khi đổi ngôn ngữ; gọi `t` của @/lib/i18n (kiểu chặt hơn khi có biến)
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
            <DialogTitle className="text-heading font-bold">{t('feedback:thanks')}</DialogTitle>
            <DialogDescription className="text-body text-ink-soft">
              {t('feedback:sent', { email: email || t('feedback:yourAccountEmail') })}
            </DialogDescription>
            <Button className="mt-2" onClick={() => change(false)}>
              {t('feedback:close')}
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
              <DialogTitle className="text-heading font-bold">{t('feedback:title')}</DialogTitle>
              <DialogDescription className="text-body text-ink-soft">
                {t('feedback:description', { email })}
              </DialogDescription>
            </DialogHeader>
            <label htmlFor={`${ids}-msg`} className="sr-only">
              {t('feedback:messageLabel')}
            </label>
            <Textarea
              id={`${ids}-msg`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={max}
              rows={6}
              autoFocus
              placeholder={t('feedback:placeholder')}
              aria-describedby={`${ids}-count`}
              className="min-h-36"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span id={`${ids}-count`} className="text-label font-normal text-ink-soft nums">
                {message.length}/{max}
              </span>
              <Button type="submit" disabled={!text || send.isPending}>
                <Send aria-hidden="true" /> {send.isPending ? t('feedback:sending') : t('feedback:send')}
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
