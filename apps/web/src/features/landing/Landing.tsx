import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { googleLoginUrl } from '@/api/client'
import { Avatar } from '@/components/layout/Avatar'
import { GoogleMark } from '@/components/layout/GoogleMark'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import type { Score } from '@/lib/catalog'
import { addDays, browserTimeZone, dayOfMonth, todayIn, weekdayShort } from '@/lib/date'
import { flyTo } from '@/lib/flyTo'
import { cn } from '@/lib/utils'
import { AccountMenu } from './AccountMenu'
import { DayPageShowcase } from './DayPageShowcase'
import { DemoDayCard } from './DemoDayCard'
import { MonthPreview, type PreviewMonth } from './MonthPreview'
import { OneTapDemo, type WeekDay } from './OneTapDemo'
import { StoryScene } from './StoryScene'
import { greeting, useHomeSummary, type HomeSummary } from './useHomeSummary'

// "Bắt đầu viết" vào app (chưa đăng nhập thì RequireAuth đưa sang /login).
const START_HREF = '/today'

/** Người đang đăng nhập; có thì trang chủ dùng bản "đã đăng nhập" (thiết kế B5 · Landing-Signed). */
export type LandingAccount = {
  name: string
  email: string
  avatarUrl: string | null
  iconSetId: string
  timeZone: string
  shareCount: number
  /** Chấm điểm nhanh cho hôm nay (lưu thật qua API, routes/HomePage ghép từ feature entry). */
  quickScore?: QuickScore
}

export type QuickScore = {
  value: Score | null
  onPick: (score: Score) => void
  saving: boolean
  error: string | null
}

const wrap = 'mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,40px)]'
const sectionPad = 'py-[clamp(80px,10vw,128px)]'
// Thang chữ của trang (DESIGN.md mục 3): display cho tiêu đề hero, title cho tiêu đề mục; mảnh giao diện trong thẻ minh họa
// giữ cỡ của app.
const sectionTitle = 'font-heading text-[clamp(26px,2.4vw,30px)] leading-[1.25] font-bold text-balance'
const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring'

function GoogleButton({ inverted }: { inverted?: boolean }) {
  return (
    // Điều hướng thẳng tới API (không fetch) để cookie dd_oauth của luồng OAuth đi trọn vòng.
    <a
      href={googleLoginUrl(browserTimeZone())}
      className={cn(
        'inline-flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] pr-5 pl-4 text-[15px] font-semibold',
        focusRing,
        inverted
          ? 'press border-primary-foreground bg-primary-foreground text-primary'
          : 'lift border-line bg-card shadow-ink-sm',
      )}
    >
      <GoogleMark />
      Tiếp tục với Google
    </a>
  )
}

/** Chọn ngôn ngữ: MVP mới có tiếng Việt, EN hiện nhưng chưa bật (Project_Specs F-04). */
function LanguageSwitch() {
  const item = 'inline-flex h-full min-w-[34px] items-center justify-center rounded-[7px] px-1.5 text-[13px] font-semibold'
  return (
    <div role="group" aria-label="Ngôn ngữ" className="inline-flex h-9 gap-0.5 rounded-[10px] border-[1.5px] border-line p-[3px]">
      <span aria-current="true" className={cn(item, 'bg-primary text-primary-foreground')}>
        VI
      </span>
      <button type="button" disabled title="English sắp có" aria-label="English, sắp có" className={cn(item, 'cursor-not-allowed text-muted-foreground')}>
        EN
      </button>
    </div>
  )
}

function SiteHeader({ account, todayWritten }: { account?: LandingAccount; todayWritten: boolean }) {
  const links = [
    { href: '#mot-cham', label: 'Một chạm' },
    { href: '#nhin-lai', label: 'Nhìn lại' },
    { href: '#rieng-tu', label: 'Riêng tư' },
  ]
  return (
    <header className={cn(wrap, 'py-6')}>
      <nav
        aria-label="Điều hướng chính"
        className="flex items-center gap-2 rounded-[18px] border-[1.5px] border-line bg-card py-2 pr-2.5 pl-[18px] shadow-ink-sm"
      >
        <a
          href="#"
          aria-label="Jotly, trang chủ"
          className="rounded-sm transition-transform duration-150 active:scale-[.97] focus-visible:outline-3 focus-visible:outline-ring"
        >
          <Logo />
        </a>
        <ul className="ml-2 hidden gap-0.5 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative inline-flex h-10 items-center rounded-[12px] px-3 text-[15px] font-medium transition-[background-color,scale] duration-200 after:absolute after:inset-x-3 after:bottom-[7px] after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-250 hover:bg-secondary hover:after:scale-x-100 active:scale-[.97] focus-visible:outline-3 focus-visible:outline-ring"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2 lg:gap-4">
          <span className="hidden sm:inline-flex">
            <LanguageSwitch />
          </span>
          <ThemeToggle className="press size-10 rounded-[12px]" />
          <Link
            to={START_HREF}
            className={cn(
              'press inline-flex h-10 shrink-0 items-center rounded-[12px] bg-primary px-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary-hover sm:px-4',
              focusRing,
            )}
          >
            {account ? 'Mở nhật ký' : 'Bắt đầu viết'}
          </Link>
          {account ? (
            <AccountMenu
              name={account.name}
              email={account.email}
              avatarUrl={account.avatarUrl}
              todayWritten={todayWritten}
              shareCount={account.shareCount}
            />
          ) : null}
        </div>
      </nav>
    </header>
  )
}

function heroStatus(summary: HomeSummary | null | undefined): string {
  if (!summary) return 'Trang hôm nay đang chờ bạn.'
  return `Tháng này bạn đã ghi ${summary.recorded}/${summary.daysSoFar} ngày · chuỗi hiện tại ${summary.streak} ngày.`
}

function previewMonth(account: LandingAccount, summary: HomeSummary): PreviewMonth {
  const today = todayIn(account.timeZone)
  return {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
    today: summary.daysSoFar,
    days: summary.days,
    iconSetId: account.iconSetId,
  }
}

/** Lúc icon của thẻ ngày bay vào ô hôm nay của lịch: sau khi hai thẻ đã dán xuống và icon các ngày đã hiện. */
const FLY_AT_MS = 1000

function Hero({ account, summary }: { account?: LandingAccount; summary?: HomeSummary | null }) {
  // Khách: ô hôm nay của lịch để trống tới khi icon của thẻ ngày bay vào (DESIGN.md mục 7, cảnh 1). Người đã cuộn đi
  // hoặc tab đang ẩn thì điền ngay, không diễn. Đã đăng nhập: lịch là tháng thật, không diễn.
  const [landed, setLanded] = useState(Boolean(account))
  useEffect(() => {
    if (account) return
    const timer = window.setTimeout(() => {
      if (window.scrollY > 8 || document.hidden) {
        setLanded(true)
        return
      }
      flyTo({
        from: '[data-hero] [data-hero-day-icon]',
        to: '[data-hero] [data-month-preview] [data-state="today"] [data-cell-icon]',
        update: () => setLanded(true),
      })
    }, FLY_AT_MS)
    return () => window.clearTimeout(timer)
  }, [account])

  return (
    <section data-hero="" className={cn(wrap, 'flex flex-wrap items-center gap-[72px] pt-[clamp(56px,8vw,112px)] pb-[clamp(80px,10vw,136px)]')}>
      <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-5">
        {account ? (
          <Link
            to="/profile"
            className="group/hi inline-flex animate-rise items-center gap-2.5 self-start rounded-full border-[1.5px] border-line bg-card py-1 pr-3.5 pl-1 text-[15px] leading-[22px] font-medium transition-transform duration-(--dur-fast) hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Avatar name={account.name} src={account.avatarUrl} size={28} />
            {greeting(account.name, account.timeZone)}
          </Link>
        ) : null}
        <h1 className="max-w-[600px] animate-rise-story font-display text-display font-extrabold text-balance">
          Chạm để ghi chú, mở để{' '}
          <span className="relative inline-block whitespace-nowrap">
            nhìn lại.
            {/* Nét bút màu đào chạy dưới chữ sau khi tiêu đề hiện. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 16"
              preserveAspectRatio="none"
              className="absolute -bottom-[0.22em] -left-[2%] h-[0.36em] w-[104%] overflow-visible"
            >
              <path
                className="draw-in"
                pathLength={1}
                d="M4 11c38-6 92-9 192-4"
                fill="none"
                stroke="var(--peach)"
                strokeWidth={5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
        </h1>
        <p className="max-w-[420px] animate-rise-story text-[17px] leading-7 text-muted-foreground" style={{ animationDelay: '70ms' }}>
          Nhật ký mỗi ngày một trang. Chấm điểm, chọn biểu tượng, viết vài dòng nếu muốn.
        </p>
        <div className="mt-3 flex animate-rise-story flex-wrap items-center gap-x-[22px] gap-y-3.5" style={{ animationDelay: '140ms' }}>
          {account ? (
            <>
              <Link
                to="/today"
                className={cn(
                  'lift inline-flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-card pr-[18px] pl-4 text-body font-semibold shadow-ink-sm',
                  focusRing,
                )}
              >
                <Pencil className="size-[18px]" aria-hidden="true" />
                Mở trang hôm nay
              </Link>
              <Link to="/timeline" className="link-underline text-[15px] font-medium">
                Xem Dòng thời gian
              </Link>
            </>
          ) : (
            <>
              <GoogleButton />
              <a href="#mot-cham" className="link-underline text-[15px] font-medium">
                Xem cách hoạt động
              </a>
            </>
          )}
        </div>
        <p className="animate-rise-story text-label text-muted-foreground" style={{ animationDelay: '210ms' }}>
          {account ? heroStatus(summary) : 'Đăng nhập bằng Gmail, không cần mật khẩu.'}
        </p>
      </div>

      <div aria-hidden="true" className="flex min-w-0 flex-[1_1_400px] flex-col items-end">
        <MonthPreview
          className="w-full max-w-[400px] rotate-2"
          // Đã đăng nhập: vẽ tháng hiện tại từ cùng số liệu với dòng "Tháng này bạn đã ghi X/Y ngày".
          month={account && summary ? previewMonth(account, summary) : undefined}
          todayPending={!landed}
        />
        <DemoDayCard
          hero
          className="tilt -mt-[88px] w-full max-w-[340px] -rotate-[2.5deg] animate-paste self-start"
          style={{ animationDelay: '.4s' }}
        />
      </div>
    </section>
  )
}

/** 6 ngày trước hôm nay cho dải 7 ngày ở cảnh "Một chạm" (đã đăng nhập): ngày trong tháng lấy từ tóm tắt tháng. */
function accountWeek(account: LandingAccount, summary: HomeSummary | null | undefined): { week: WeekDay[]; today: { day: number; weekday: string } } {
  const today = todayIn(account.timeZone)
  const month = today.slice(0, 7)
  const week = [6, 5, 4, 3, 2, 1].map((back) => {
    const date = addDays(today, -back)
    const entry = date.startsWith(month) ? summary?.days[dayOfMonth(date)] : undefined
    return { day: dayOfMonth(date), weekday: weekdayShort(date), score: entry?.score ?? null, sub: entry?.sub ?? null }
  })
  return { week, today: { day: dayOfMonth(today), weekday: weekdayShort(today) } }
}

function Privacy() {
  const facts = [
    ['Riêng tư mặc định.', 'Chỉ mình bạn xem được nhật ký của mình.'],
    ['Bạn chọn người xem.', 'Chia sẻ từng trang qua link chỉ xem, tắt link lúc nào cũng được.'],
    ['Xóa bất cứ lúc nào.', 'Xóa từng trang hoặc toàn bộ dữ liệu.'],
  ] as const
  return (
    <section id="rieng-tu" aria-labelledby="rieng-tu-title" className="border-y-[1.5px] border-line bg-sage-soft">
      <div className={cn(wrap, sectionPad, 'grid items-end gap-x-16 gap-y-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]')}>
        <h2
          id="rieng-tu-title"
          className="reveal-on-scroll font-display text-[clamp(36px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-0.025em] text-balance"
        >
          Nhật ký của bạn là của bạn.
        </h2>
        <div className="flex flex-col gap-4 text-[17px] leading-7">
          {facts.map(([lead, rest]) => (
            <p key={lead} className="reveal-on-scroll">
              <strong className="font-semibold">{lead}</strong> <span className="text-muted-foreground">{rest}</span>
            </p>
          ))}
          <Link to="/privacy" className="link-underline self-start text-[15px] font-semibold">
            Đọc chính sách quyền riêng tư
          </Link>
        </div>
      </div>
    </section>
  )
}

/**
 * Trang chủ (thiết kế B5, làm lại theo DESIGN.md mục 7). Chưa đăng nhập: trang giới thiệu. Đã đăng nhập (`account`):
 * lời chào, nút mở trang hôm nay, menu tài khoản, chấm điểm nhanh cho hôm nay.
 * Trình tự: hero → Một chạm → Một ngày, một tháng, một năm (cảnh cuộn) → Một trang ngày → Riêng tư → CTA → chân trang.
 */
export function Landing({ account }: { account?: LandingAccount }) {
  const { data } = useHomeSummary(account?.timeZone ?? browserTimeZone(), Boolean(account))
  const summary = account ? data : undefined
  const todayWritten = Boolean(summary?.todayWritten)
  const week = account ? accountWeek(account, summary) : undefined
  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteHeader account={account} todayWritten={todayWritten} />
      <main>
        <Hero account={account} summary={summary} />

        <section id="mot-cham" aria-labelledby="mot-cham-title" className="border-y-[1.5px] border-line bg-peach-soft">
          <div className={cn(wrap, sectionPad, 'flex flex-wrap items-center gap-16')}>
            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
              <h2 id="mot-cham-title" className={cn(sectionTitle, 'reveal-on-scroll')}>
                {account ? 'Một chạm cho hôm nay' : 'Bận quá? Một chạm là đủ.'}
              </h2>
              <p className="reveal-on-scroll max-w-[380px] text-[17px] leading-7 text-muted-foreground">
                {account
                  ? 'Chấm điểm ngay tại đây, trang hôm nay của bạn sẽ được cập nhật. Muốn viết thêm thì mở trang hôm nay.'
                  : 'Thử chấm một mức: ngày hôm đó vào ngay lịch của bạn. Viết thêm lúc nào cũng được.'}
              </p>
            </div>
            <div className="flex min-w-0 flex-[1_1_420px]">
              {account ? (
                <OneTapDemo
                  iconSetId={account.iconSetId}
                  value={account.quickScore?.value ?? null}
                  onChange={account.quickScore?.onPick}
                  week={week?.week}
                  today={week?.today}
                  status={(score, label) =>
                    account.quickScore?.error ??
                    (account.quickScore?.saving ? 'Đang lưu…' : `Đã lưu cho hôm nay: điểm ${score} · ${label}.`)
                  }
                  footer={
                    <Link to="/today" className="link-underline self-start text-[15px] font-semibold">
                      Viết thêm cho hôm nay
                    </Link>
                  }
                />
              ) : (
                <OneTapDemo />
              )}
            </div>
          </div>
        </section>

        <StoryScene signedIn={Boolean(account)} />

        <div className="border-t-[1.5px] border-line">
          <DayPageShowcase />
        </div>

        <Privacy />

        <section aria-labelledby="cta-title" className={cn(wrap, 'py-[clamp(80px,10vw,128px)]')}>
          <div className="cta-paste flex flex-wrap items-center justify-between gap-6 rounded-[28px] border-[1.5px] border-line bg-primary p-[clamp(32px,5vw,56px)] text-primary-foreground shadow-[5px_5px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-(--dur-base) ease-out hover:[transform:translate(-2px,-2px)] hover:shadow-[7px_7px_0_var(--cta-shadow)]">
            <h2 id="cta-title" className="font-heading text-[clamp(24px,2.4vw,30px)] leading-[1.3] font-bold text-balance">
              {account && todayWritten ? 'Hôm nay đã có một trang. Viết thêm vài dòng?' : 'Hôm nay của bạn thế nào?'}
            </h2>
            {account ? (
              <Link
                to="/today"
                className={cn(
                  'press inline-flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-primary-foreground bg-primary-foreground pr-5 pl-4 text-body font-semibold text-primary',
                  focusRing,
                )}
              >
                <Pencil className="size-[18px]" aria-hidden="true" />
                Mở trang hôm nay
              </Link>
            ) : (
              <GoogleButton inverted />
            )}
          </div>
        </section>
      </main>

      <footer className="overflow-hidden border-t-[1.5px] border-line">
        <div className={cn(wrap, 'flex flex-col gap-6 pt-10 pb-7')}>
          {/* Chân trang khép lại bằng chính tên Jotly, cỡ lớn (chữ logo Young Serif). */}
          <p aria-hidden="true" className="-mb-[0.12em] font-brand text-[clamp(88px,22vw,264px)] leading-[0.8] tracking-[-0.02em]">
            Jotly
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-line pt-5">
            <span className="text-label text-muted-foreground">Chạm để ghi chú, mở để nhìn lại.</span>
            <div className="flex flex-wrap gap-5 text-label">
              {/* Chờ nội dung điều khoản thật trước khi ra mắt. */}
              <a href="#" className="link-underline">
                [Điều khoản sử dụng]
              </a>
              <Link to="/privacy" className="link-underline">
                Chính sách quyền riêng tư
              </Link>
              <span className="text-muted-foreground">© 2026 Jotly</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
