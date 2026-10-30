import { AlertCircle, FlaskConical, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { googleLoginUrl } from '@/api/client'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Avatar } from '@/components/layout/Avatar'
import { Logo, LogoMark } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import type { Score } from '@/lib/catalog'
import { browserTimeZone } from '@/lib/date'
import { useMe } from '@/lib/profile'
import { useDevLogin } from '@/lib/session'
import { cn } from '@/lib/utils'
import { loginErrorMessage, type LoginState } from './loginState'
import { GoogleMark } from '@/components/layout/GoogleMark'

/** Icon mầm cây trôi quanh thẻ (thiết kế B9 · Đăng nhập): vị trí, cỡ, góc nghiêng, độ trễ. */
const FLOATS: { score: Score; size: number; className: string; rotate: number; delay: number }[] = [
  { score: 5, size: 72, className: 'left-[7%] top-[14%]', rotate: -10, delay: 0 },
  { score: 3, size: 52, className: 'right-[9%] top-[12%]', rotate: 8, delay: 1.1 },
  { score: 1, size: 48, className: 'left-[13%] bottom-[14%]', rotate: 6, delay: 2 },
  { score: 4, size: 64, className: 'right-[12%] bottom-[18%]', rotate: -6, delay: 0.6 },
  { score: 2, size: 40, className: 'left-[28%] top-[6%]', rotate: 12, delay: 1.6 },
  { score: 5, size: 40, className: 'right-[27%] bottom-[6%]', rotate: -14, delay: 2.4 },
]

type Mode = 'idle' | 'redirecting' | 'error' | 'expired'

const COPY: Record<Mode, { title: string; text: string; button: string }> = {
  idle: {
    title: 'Đăng nhập vào Jotly',
    text: 'Dùng tài khoản Gmail, không cần nhớ thêm mật khẩu nào.',
    button: 'Tiếp tục với Google',
  },
  redirecting: { title: 'Đang đăng nhập', text: 'Đang chuyển sang trang đăng nhập của Google.', button: '' },
  // Lỗi không có câu phụ: khung lỗi bên dưới đã nói chuyện gì xảy ra và cần làm gì.
  error: { title: 'Chưa đăng nhập được', text: '', button: 'Thử lại với Google' },
  expired: {
    title: 'Phiên đăng nhập đã hết hạn',
    text: 'Đăng nhập lại để tiếp tục. Những gì bạn đang viết vẫn được giữ trên trình duyệt này.',
    button: 'Đăng nhập lại với Google',
  },
}

/**
 * Trang đăng nhập (thiết kế B9 · Đăng nhập, các trạng thái).
 * Nút Google là link điều hướng thẳng tới API (không fetch, không cửa sổ bật lên), để cookie dd_oauth đi trọn vòng.
 * Vì là chuyển trang, "Đang chờ Google" chỉ hiện trong lúc trình duyệt rời trang; Hủy dừng việc chuyển trang.
 */
export function Login() {
  const [params] = useSearchParams()
  const { state } = useLocation() as { state: LoginState | null }
  const navigate = useNavigate()
  const { data: me, error: meError } = useMe()
  const dev = useDevLogin()
  const errorCode = params.get('error')
  const expired = state?.expired
  const [redirecting, setRedirecting] = useState(false)

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

  const mode: Mode = redirecting ? 'redirecting' : errorCode ? 'error' : expired ? 'expired' : 'idle'
  const copy = COPY[mode]
  const text = copy.text

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-[2] mx-auto flex w-full max-w-[1120px] items-center gap-3 px-4 py-4 sm:px-[clamp(16px,4vw,40px)]">
        <a
          href="/"
          aria-label="Jotly, trang chủ"
          className="rounded-sm hover:[&_svg]:animate-wiggle focus-visible:outline-3 focus-visible:outline-ring [&_svg]:origin-[50%_60%]"
        >
          <Logo size="sm" />
        </a>
        <div className="flex-1" />
        <ThemeToggle className="press size-10 rounded-[12px]" />
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pt-8 pb-16 sm:px-[clamp(16px,4vw,40px)]">
        {FLOATS.map((f, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={cn('absolute hidden animate-float sm:block', f.className)}
            style={{ rotate: `${f.rotate}deg`, animationDelay: `${f.delay}s` }}
          >
            <ScoreIcon iconSetId="sprout" score={f.score} size={f.size} />
          </span>
        ))}

        <div className="relative z-[1] flex w-full max-w-[460px] animate-land flex-col items-center gap-[18px] rounded-[28px] border-[1.5px] border-line bg-card px-[clamp(24px,5vw,44px)] pt-10 pb-8 text-center shadow-ink-lg">
          <LogoMark size={72} className={cn('origin-[50%_80%]', mode === 'redirecting' && 'animate-writing')} />

          <div aria-live="polite" className="flex flex-col gap-2">
            <h1 className="text-[26px] leading-[34px] font-bold">{copy.title}</h1>
            {text ? <p className="text-[15px] leading-6 text-muted-foreground">{text}</p> : null}
          </div>

          {mode === 'error' ? (
            <div
              role="alert"
              className="flex w-full animate-shake items-start gap-2.5 rounded-md border-[1.5px] border-destructive bg-destructive-soft px-3.5 py-3 text-left text-sm leading-[22px]"
            >
              <AlertCircle className="mt-0.5 size-[18px] shrink-0 text-destructive" aria-hidden="true" />
              <span>{loginErrorMessage(errorCode!)}</span>
            </div>
          ) : null}

          {mode === 'expired' && expired ? (
            <div className="flex w-full items-center gap-3 rounded-md border-[1.5px] border-dashed border-border bg-muted px-3.5 py-2.5 text-left">
              <Avatar name={expired.name} src={expired.avatarUrl} size={36} className="text-[13px]" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm leading-[22px] font-semibold">{expired.name}</span>
                <span className="truncate text-[13px] leading-5 text-muted-foreground">{expired.email}</span>
              </span>
            </div>
          ) : null}

          <div className="mt-1 flex w-full flex-col items-stretch gap-3">
            {mode === 'redirecting' ? (
              <>
                <span
                  role="status"
                  className="inline-flex h-[52px] items-center justify-center gap-3 rounded-md border-[1.5px] border-border bg-muted text-base font-semibold text-muted-foreground"
                >
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  <span>
                    Đang chờ Google
                    <span aria-hidden="true">
                      {[0, 0.15, 0.3].map((d) => (
                        <span key={d} className="inline-block animate-dot" style={{ animationDelay: `${d}s` }}>
                          .
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  className="link-underline cursor-pointer self-center px-0 py-1 text-sm font-medium focus-visible:outline-3 focus-visible:outline-ring"
                  onClick={() => {
                    // Dừng việc chuyển sang Google đang diễn ra (nếu trình duyệt chưa rời trang).
                    window.stop()
                    setRedirecting(false)
                  }}
                >
                  Hủy
                </button>
              </>
            ) : (
              <a
                href={googleLoginUrl(browserTimeZone())}
                onClick={() => setRedirecting(true)}
                className="inline-flex h-[52px] items-center justify-center gap-3 rounded-md border-[1.5px] border-line bg-card pr-5 pl-4 text-base font-semibold shadow-[3px_3px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--cta-shadow)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--cta-shadow)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring"
              >
                <GoogleMark />
                {copy.button}
              </a>
            )}
          </div>

          <p className="mt-1.5 text-xs leading-[18px] text-muted-foreground">
            Khi tiếp tục, bạn đồng ý với{' '}
            {/* Chờ nội dung điều khoản thật trước khi ra mắt (MVP Bước 14). */}
            <a href="#" className="link-underline">
              [Điều khoản sử dụng]
            </a>{' '}
            và{' '}
            <Link to="/privacy" className="link-underline">
              Chính sách quyền riêng tư
            </Link>
            .
          </p>

          {import.meta.env.DEV ? (
            <div className="flex w-full flex-col gap-2 border-t-[1.5px] border-dashed border-border pt-5">
              <Button
                variant="outline"
                disabled={dev.isPending}
                onClick={() =>
                  dev.mutate('dev@example.com', { onSuccess: ({ next }) => navigate(next, { replace: true }) })
                }
              >
                <FlaskConical aria-hidden="true" /> Đăng nhập thử (chỉ khi chạy dev)
              </Button>
              {dev.isError ? (
                <p role="alert" className="text-[13px] leading-5 text-destructive">
                  Chưa đăng nhập thử được. Bật DEV_LOGIN=true trong apps/api/.env rồi chạy lại API.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
