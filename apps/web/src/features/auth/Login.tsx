import { AlertCircle, FlaskConical, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { API_URL, googleLoginUrl } from '@/api/client'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Avatar } from '@/components/layout/Avatar'
import { GoogleMark } from '@/components/layout/GoogleMark'
import { Logo, LogoMark } from '@/components/layout/Logo'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import type { Score } from '@/lib/catalog'
import { browserTimeZone } from '@/lib/date'
import { useMe } from '@/lib/profile'
import { isServerAwake, wakeServer } from '@/lib/serverWake'
import { useDevLogin } from '@/lib/session'
import { cn } from '@/lib/utils'
import { loginErrorMessage, type LoginState } from './loginState'
import { useT } from '@/lib/i18n'

/** Icon mầm cây đứng yên quanh thẻ (thiết kế B9 · Đăng nhập): vị trí, cỡ, góc nghiêng. Ẩn trên điện thoại. */
const SPROUTS: { score: Score; size: number; className: string; rotate: number }[] = [
  { score: 5, size: 72, className: 'left-[7%] top-[14%]', rotate: -10 },
  { score: 3, size: 52, className: 'right-[9%] top-[12%]', rotate: 8 },
  { score: 1, size: 48, className: 'left-[13%] bottom-[14%]', rotate: 6 },
  { score: 4, size: 64, className: 'right-[12%] bottom-[18%]', rotate: -6 },
  { score: 2, size: 40, className: 'left-[28%] top-[6%]', rotate: 12 },
  { score: 5, size: 40, className: 'right-[27%] bottom-[6%]', rotate: -14 },
]

type Mode = 'idle' | 'waking' | 'redirecting' | 'error' | 'expired'

/** Chữ của từng trạng thái (dịch lúc render để đổi ngôn ngữ là đổi theo). Lỗi không có câu phụ: khung lỗi bên dưới đã nói rõ. */
function copyFor(mode: Mode, t: TFunction): { title: string; text: string; button: string } {
  switch (mode) {
    case 'idle':
      return { title: t('auth:login.idle.title'), text: t('auth:login.idle.text'), button: t('auth:login.idle.button') }
    // Máy chủ miễn phí ngủ khi vắng người: chờ nó dậy rồi mới sang Google, để không treo ở trang trắng.
    case 'waking':
      return { title: t('auth:login.waking.title'), text: t('auth:login.waking.text'), button: '' }
    case 'redirecting':
      return { title: t('auth:login.redirecting.title'), text: t('auth:login.redirecting.text'), button: '' }
    case 'error':
      return { title: t('auth:login.error.title'), text: '', button: t('auth:login.error.button') }
    case 'expired':
      return { title: t('auth:login.expired.title'), text: t('auth:login.expired.text'), button: t('auth:login.expired.button') }
  }
}

/**
 * Trang đăng nhập (thiết kế B9 · Đăng nhập, các trạng thái).
 * Nút Google là link điều hướng thẳng tới API (không fetch, không cửa sổ bật lên), để cookie dd_oauth đi trọn vòng.
 * Vì là chuyển trang, "Đang chờ Google" chỉ hiện trong lúc trình duyệt rời trang; Hủy dừng việc chuyển trang.
 */
export function Login() {
  const t = useT()
  const [params] = useSearchParams()
  const { state } = useLocation() as { state: LoginState | null }
  const navigate = useNavigate()
  const { data: me, error: meError } = useMe()
  const dev = useDevLogin()
  const errorCode = params.get('error')
  const expired = state?.expired
  const [redirecting, setRedirecting] = useState(false)
  const [waking, setWaking] = useState(false)
  const wakeAbort = useRef<AbortController | null>(null)

  // Rời trang thì thôi chờ máy chủ.
  useEffect(() => () => wakeAbort.current?.abort(), [])

  // Bấm Back từ trang Google: trình duyệt có thể trả lại trang này từ bộ nhớ đệm, còn nguyên "Đang chờ".
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setRedirecting(false)
    }
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  // Hồ sơ cũ còn trong cache nhưng /me vừa trả lỗi (phiên hết hạn) thì vẫn ở lại trang đăng nhập.
  if (me && !meError) return <Navigate to={me.onboarded ? '/today' : '/onboarding'} replace />

  const mode: Mode = waking ? 'waking' : redirecting ? 'redirecting' : errorCode ? 'error' : expired ? 'expired' : 'idle'
  const copy = copyFor(mode, t)

  /** Chờ máy chủ thức rồi mới chuyển sang Google (máy chủ đang thức thì chuyển ngay, không đi qua đây). */
  function wakeThenGo(href: string) {
    const ctrl = new AbortController()
    wakeAbort.current = ctrl
    setWaking(true)
    void wakeServer(`${API_URL}/health`, ctrl.signal).then(() => {
      if (ctrl.signal.aborted) return
      setWaking(false)
      setRedirecting(true)
      window.location.assign(href)
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-[2] mx-auto flex w-full max-w-[1120px] items-center gap-3 px-[clamp(16px,4vw,40px)] py-4">
        <a href="/" aria-label={t('auth:login.homeAria')} className="flex min-h-11 items-center rounded-sm">
          <Logo size="sm" />
        </a>
        <div className="flex-1" />
        <LanguageSwitch />
        <ThemeToggle className="press size-10 rounded-[12px]" />
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-[clamp(16px,4vw,40px)] pt-8 pb-16">
        {SPROUTS.map((f, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={cn('absolute hidden sm:block', f.className)}
            style={{ rotate: `${f.rotate}deg` }}
          >
            <ScoreIcon iconSetId="sprout" score={f.score} size={f.size} />
          </span>
        ))}

        <div className="relative z-[1] flex w-full max-w-[460px] animate-land flex-col items-center gap-[18px] rounded-[28px] border-[1.5px] border-stroke bg-card px-[clamp(24px,5vw,44px)] pt-10 pb-8 text-center shadow-lg">
          <LogoMark size={72} />

          <div aria-live="polite" className="flex flex-col gap-2">
            <h1 className="text-title">{copy.title}</h1>
            {copy.text ? <p className="text-body text-ink-soft">{copy.text}</p> : null}
          </div>

          {mode === 'error' ? (
            <div
              role="alert"
              className="flex w-full animate-shake items-start gap-2.5 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-left text-body"
            >
              <AlertCircle className="mt-0.5 size-[18px] shrink-0 text-danger" aria-hidden="true" />
              <span className="min-w-0">{loginErrorMessage(errorCode!)}</span>
            </div>
          ) : null}

          {mode === 'expired' && expired ? (
            <div className="flex w-full items-center gap-3 rounded-md border-[1.5px] border-dashed border-line-soft bg-sunk px-3.5 py-2.5 text-left">
              <Avatar name={expired.name} src={expired.avatarUrl} size={36} className="text-[13px]" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-semibold" title={expired.name}>
                  {expired.name}
                </span>
                <span className="truncate text-label font-normal text-ink-soft" title={expired.email}>
                  {expired.email}
                </span>
              </span>
            </div>
          ) : null}

          <div className="mt-1 flex w-full flex-col items-stretch gap-3">
            {mode === 'redirecting' || mode === 'waking' ? (
              <>
                <span
                  role="status"
                  className="inline-flex h-[52px] items-center justify-center gap-3 rounded-md border-[1.5px] border-line-soft bg-sunk text-body font-semibold text-ink-soft"
                >
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  {mode === 'waking' ? t('auth:login.waitingServer') : t('auth:login.waitingGoogle')}
                </span>
                <button
                  type="button"
                  className="link-underline min-h-11 cursor-pointer self-center px-2 py-1 text-body font-medium"
                  onClick={() => {
                    // Dừng việc chờ máy chủ, hoặc việc chuyển sang Google đang diễn ra (nếu trình duyệt chưa rời trang).
                    wakeAbort.current?.abort()
                    window.stop()
                    setWaking(false)
                    setRedirecting(false)
                  }}
                >
                  {t('auth:login.cancel')}
                </button>
              </>
            ) : (
              <a
                href={googleLoginUrl(browserTimeZone())}
                onClick={(e) => {
                  if (isServerAwake()) return setRedirecting(true)
                  e.preventDefault()
                  wakeThenGo(e.currentTarget.href)
                }}
                className="cta inline-flex h-[52px] items-center justify-center gap-3 rounded-md border-[1.5px] border-stroke bg-card pr-5 pl-4 text-body font-semibold text-ink select-none"
              >
                <GoogleMark />
                {copy.button}
              </a>
            )}
          </div>

          <p className="mt-1.5 text-label font-normal text-ink-soft">
            {t('auth:login.termsPrefix')}{' '}
            {/* Chờ nội dung điều khoản thật trước khi ra mắt (MVP Bước 14). */}
            <a href="#" className="link-underline">
              {t('auth:login.terms')}
            </a>{' '}
            {t('auth:login.and')}{' '}
            <Link to="/privacy" className="link-underline">
              {t('auth:login.privacy')}
            </Link>
            .
          </p>

          {import.meta.env.DEV ? (
            <div className="flex w-full flex-col gap-2 border-t-[1.5px] border-dashed border-line-soft pt-5">
              <Button
                variant="outline"
                disabled={dev.isPending}
                onClick={() =>
                  dev.mutate('dev@example.com', { onSuccess: ({ next }) => navigate(next, { replace: true }) })
                }
              >
                <FlaskConical aria-hidden="true" /> {t('auth:login.devLogin')}
              </Button>
              {dev.isError ? (
                <p role="alert" className="text-label font-normal text-danger">
                  {t('auth:login.devLoginFailed')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
