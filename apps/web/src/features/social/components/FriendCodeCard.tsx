import { useState } from 'react'
import { Check, Copy, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useT } from '@/lib/i18n'
import { useFriendCode, useRotateFriendCode } from '../useSocial'

export function FriendCodeCard() {
  const t = useT()
  const code = useFriendCode()
  const rotate = useRotateFriendCode()
  const [copied, setCopied] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)
  async function copy() {
    if (!code.data?.friend_code) return
    try { await navigator.clipboard.writeText(code.data.friend_code); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) }
  }
  return <section><h2 className="font-semibold">{t('social:friendCode.title')}</h2><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 rounded-md border border-stroke bg-sunk px-3 py-3 text-center text-xl font-bold tracking-[0.18em]">{code.data?.friend_code ?? '········'}</code><Button variant="outline" size="icon" onClick={copy} disabled={!code.data} aria-label={copied ? t('social:friendCode.copied') : t('social:friendCode.copy')}>{copied ? <Check /> : <Copy />}</Button></div><Button className="mt-3 w-full" variant="outline" onClick={() => setConfirmRotate(true)} disabled={rotate.isPending}><RotateCw className="size-4" />{t('social:friendCode.rotate')}</Button>
    <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('social:friendCode.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('social:friendCode.confirmBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('social:friendCode.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => rotate.mutate()}>
            {t('social:friendCode.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
}
