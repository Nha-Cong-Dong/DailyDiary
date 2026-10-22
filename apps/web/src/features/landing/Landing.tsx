import { Eye, Image, Lock, Pencil, Search, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { googleLoginUrl } from '@/api/client'
import { MoodMark } from '@/components/diary/MoodMark'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Avatar } from '@/components/layout/Avatar'
import { GoogleMark } from '@/components/layout/GoogleMark'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { flagColors, flagHex } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'
import { browserTimeZone, todayIn } from '@/lib/date'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { AccountMenu } from './AccountMenu'
import { DEMO_ICON_SET } from './demoData'
import { MonthPreview, type PreviewMonth } from './MonthPreview'
import { OneTapDemo } from './OneTapDemo'
import { YearPreview } from './YearPreview'
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
}

const wrap = 'mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,40px)]'
const sectionPad = 'py-[clamp(80px,10vw,128px)]'
// Thang chữ của trang: 13 nhỏ / 15 body / 17 dẫn / 20 H3 / 30 H2 / 60 Display (mảnh giao diện trong thẻ minh họa giữ cỡ của app).
const sectionTitle = 'font-heading text-[clamp(26px,2.4vw,30px)] leading-[1.25] font-bold text-balance'
const card = 'rounded-[20px] border-[1.5px] border-line bg-card'
const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring'
// Hiệu ứng nhỏ trong thẻ tính năng: nhấc nhẹ 2px theo đường cong chung, không nảy.
const nudge = 'transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:-translate-y-0.5'

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
    { href: '#tinh-nang', label: 'Tính năng' },
    { href: '#year-in-pixels', label: 'Year in Pixels' },
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
          className="rounded-sm transition-transform duration-150 hover:[&_svg]:animate-wiggle active:scale-[.97] focus-visible:outline-3 focus-visible:outline-ring [&_svg]:origin-[50%_60%]"
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

function Hero({ account, summary }: { account?: LandingAccount; summary?: HomeSummary | null }) {
  const dark = useDarkMode()
  const lavender = flagColors.find((f) => f.id === 'lavender')!
  return (
    <section className={cn(wrap, 'flex flex-wrap items-center gap-[72px] pt-[clamp(56px,8vw,112px)] pb-[clamp(80px,10vw,136px)]')}>
      <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-5">
        {account ? (
          <Link
            to="/profile"
            className="group/hi inline-flex animate-rise items-center gap-2.5 self-start rounded-full border-[1.5px] border-line bg-card py-1 pr-3.5 pl-1 text-[15px] leading-[22px] font-medium transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Avatar name={account.name} src={account.avatarUrl} size={28} className="group-hover/hi:animate-wiggle" />
            {greeting(account.name, account.timeZone)}
          </Link>
        ) : null}
        <h1 className="group/h1 max-w-[560px] animate-rise text-[clamp(34px,4.4vw,60px)] leading-[1.12] font-bold tracking-[-0.02em] text-balance">
          Chạm để ghi chú, mở để{' '}
          <span className="relative inline-block whitespace-nowrap">
            nhìn lại.
            {/* Nét gạch vẽ tay chạy ra sau khi tiêu đề hiện; dày lên khi di chuột. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 16"
              preserveAspectRatio="none"
              className="absolute -bottom-[0.3em] -left-[2%] h-[0.42em] w-[104%] overflow-visible"
            >
              <path
                className="draw-in group-hover/h1:stroke-[7]"
                pathLength={1}
                d="M4 11c38-6 92-9 192-4"
                fill="none"
                stroke="var(--score-3)"
                strokeWidth={4}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
        </h1>
        <p className="max-w-[400px] animate-rise text-[17px] leading-7 text-muted-foreground" style={{ animationDelay: '.12s' }}>
          Mỗi ngày một trang. Chấm điểm, chọn biểu tượng, viết vài dòng nếu muốn.
        </p>
        <div className="mt-3 flex animate-rise flex-wrap items-center gap-x-[22px] gap-y-3.5" style={{ animationDelay: '.24s' }}>
          {account ? (
            <>
              <Link
                to="/today"
                className={cn(
                  'lift inline-flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-card pr-[18px] pl-4 text-[15px] font-semibold shadow-ink-sm',
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
        <p className="animate-rise text-[13px] leading-5 text-muted-foreground" style={{ animationDelay: '.32s' }}>
          {account ? heroStatus(summary) : 'Đăng nhập bằng Gmail, không cần mật khẩu.'}
        </p>
      </div>

      <div aria-hidden="true" className="flex min-w-0 flex-[1_1_400px] flex-col items-end">
        <MonthPreview
          className="w-full max-w-[400px] rotate-2"
          // Đã đăng nhập: vẽ tháng hiện tại từ cùng số liệu với dòng "Tháng này bạn đã ghi X/Y ngày".
          month={account && summary ? previewMonth(account, summary) : undefined}
        />
        <article
          className={cn(card, 'group/tilt tilt -mt-[88px] w-full max-w-[340px] -rotate-[2.5deg] animate-drop-left self-start overflow-hidden shadow-ink')}
          style={{ animationDelay: '.5s' }}
        >
          <div className="h-14 border-b-[1.5px] border-line" style={{ backgroundColor: flagHex(lavender.hex, dark) }} />
          <div className="flex flex-col gap-2 px-5 pb-5">
            <span className="-mt-[30px] flex size-[60px] items-center justify-center rounded-full border-[1.5px] border-line bg-card group-hover/tilt:[&>span>svg]:animate-wiggle">
              <MoodMark
                iconSetId={DEMO_ICON_SET}
                score={4}
                subIcon="😌"
                size={44}
                subClassName="animate-pop transition-[translate,rotate] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/tilt:-translate-y-0.5 group-hover/tilt:-rotate-[4deg]"
                subStyle={{ animationDelay: '1.7s' }}
              />
            </span>
            <span className="text-xs leading-[18px] text-muted-foreground">Chủ nhật, 18/10 · Hôm nay</span>
            <span className="font-heading text-lg leading-[26px] font-semibold">Chiều mưa đọc sách</span>
            <span className="ruled text-sm leading-6">Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở.</span>
          </div>
        </article>
      </div>
    </section>
  )
}

function FeatureCard({ visual, title, children }: { visual: ReactNode; title: string; children: ReactNode }) {
  return (
    <article className={cn(card, 'group/card reveal-on-scroll lift flex flex-col gap-3 p-7 shadow-ink-sm')}>
      <div className="mb-2">{visual}</div>
      <h3 className="font-heading text-xl leading-7 font-semibold">{title}</h3>
      <p className="text-[15px] leading-6 text-muted-foreground">{children}</p>
    </article>
  )
}

function Features() {
  const dark = useDarkMode()
  const maxPhotos = tierLimits().photos.per_day_max
  const iconRow: [string, 1 | 2 | 3 | 4 | 5][] = [
    ['sprout', 5],
    ['face', 4],
    ['moon', 4],
    ['sakura', 4],
    ['sun', 4],
    ['bean', 3],
  ]
  return (
    <section id="tinh-nang" className={cn(wrap, sectionPad, 'flex flex-col gap-12')}>
      <h2 className={sectionTitle}>Mỗi ngày, theo cách của bạn</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-8">
        <FeatureCard
          title="Một trang mỗi ngày"
          visual={
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <span key={i} className={cn('flex size-12 items-center justify-center rounded-[10px] border-[1.5px] border-line bg-muted', nudge)}>
                  <Image className="size-[18px] text-muted-foreground" aria-hidden="true" />
                </span>
              ))}
              <span className={cn('flex h-12 items-center rounded-[10px] border-[1.5px] border-dashed border-line px-2.5 text-[13px] font-semibold', nudge)}>
                3/{maxPhotos}
              </span>
            </div>
          }
        >
          Tiêu đề, nội dung, từ khóa và tối đa {maxPhotos} ảnh.
        </FeatureCard>
        <FeatureCard
          title="Biểu tượng cho từng ngày"
          visual={
            <div className="flex flex-wrap items-center gap-1">
              {/* Di chuột lên thẻ: các icon nhún lần lượt như làn sóng. */}
              {iconRow.map(([set, score], i) => (
                <span key={set} className="group-hover/card:animate-bob" style={{ animationDelay: `${i * 0.06}s` }}>
                  <ScoreIcon iconSetId={set} score={score} size={40} />
                </span>
              ))}
            </div>
          }
        >
          Sáu bộ icon chấm điểm, chọn bộ bạn thích.
        </FeatureCard>
        <FeatureCard
          title="Cờ hiệu"
          visual={
            <div className="flex flex-wrap gap-1.5">
              {flagColors.map((f) => (
                <span
                  key={f.id}
                  className={cn('h-6 w-8 rounded-[6px] border-[1.5px] border-line', nudge)}
                  style={{ backgroundColor: flagHex(f.hex, dark) }}
                />
              ))}
            </div>
          }
        >
          Gắn một màu cho ngày đáng nhớ.
        </FeatureCard>
        <FeatureCard
          title="Lịch tháng và thống kê"
          visual={
            <dl className="flex flex-wrap gap-6">
              {[
                ['Ngày đã ghi', '15/18'],
                ['Điểm TB', '3,6'],
                ['Ảnh', '24'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col-reverse">
                  <dd className="font-heading text-[22px] leading-[30px] font-bold group-hover/card:animate-bob">{v}</dd>
                  <dt className="text-xs leading-[18px] text-muted-foreground">{k}</dt>
                </div>
              ))}
            </dl>
          }
        >
          Nhìn lại cả tháng chỉ trong một trang.
        </FeatureCard>
        <FeatureCard
          title="Tìm theo từ khóa"
          visual={
            <div className="flex h-11 items-center gap-2 rounded-[12px] border-[1.5px] border-line bg-background px-3">
              <Search className="size-[18px] text-muted-foreground group-hover/card:animate-seek" aria-hidden="true" />
              <span className="text-[15px]">mưa</span>
            </div>
          }
        >
          Mở lại những ngày có cùng kỷ niệm.
        </FeatureCard>
      </div>
    </section>
  )
}

function Privacy() {
  const items = [
    { icon: Lock, title: 'Riêng tư mặc định', text: 'Chỉ mình bạn xem được.' },
    // Chia sẻ một trang qua link (F-10, ADR 0005): người viết tự quyết.
    { icon: Eye, title: 'Bạn chọn người xem', text: 'Tự quyết định có chia sẻ hay không.' },
    { icon: Trash2, title: 'Xóa bất cứ lúc nào', text: 'Xóa từng trang hoặc toàn bộ dữ liệu.' },
  ]
  return (
    <section id="rieng-tu" className={cn(wrap, sectionPad, 'flex flex-col gap-12')}>
      <h2 className={sectionTitle}>Nhật ký của bạn là của bạn</h2>
      <div className="reveal-on-scroll grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-10">
        {items.map((item) => (
          <div key={item.title} className="group/pv flex flex-col gap-3">
            <span className="flex size-11 items-center justify-center rounded-[12px] border-[1.5px] border-line bg-card shadow-ink-sm transition-[transform,box-shadow] duration-200 group-hover/pv:[transform:translate(-2px,-2px)] group-hover/pv:shadow-[5px_5px_0_var(--ink-shadow)] group-hover/pv:[&_svg]:animate-wiggle">
              <item.icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="font-heading text-xl leading-7 font-semibold">{item.title}</h3>
            <p className="text-[15px] leading-6 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Trang chủ (thiết kế B5). Chưa đăng nhập: trang giới thiệu. Đã đăng nhập (`account`): lời chào, nút mở trang hôm
 * nay, menu tài khoản, chấm điểm nhanh cho hôm nay và Year in Pixels "của bạn".
 */
export function Landing({ account }: { account?: LandingAccount }) {
  const { data } = useHomeSummary(account?.timeZone ?? browserTimeZone())
  const summary = account ? data : undefined
  const todayWritten = Boolean(summary?.todayWritten)
  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteHeader account={account} todayWritten={todayWritten} />
      <main>
        <Hero account={account} summary={summary} />

        <section id="mot-cham" className="border-y-[1.5px] border-line bg-band">
          <div className={cn(wrap, sectionPad, 'flex flex-wrap items-center gap-16')}>
            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
              <h2 className={sectionTitle}>{account ? 'Một chạm cho hôm nay' : 'Bận quá? Một chạm là đủ.'}</h2>
              <p className="max-w-[380px] text-[17px] leading-7 text-muted-foreground">
                {account
                  ? 'Chấm điểm ngay tại đây, trang hôm nay của bạn sẽ được cập nhật. Muốn viết thêm thì mở trang hôm nay.'
                  : 'Chỉ cần chấm điểm, hôm nay đã được ghi lại. Viết thêm lúc nào cũng được.'}
              </p>
            </div>
            <div className="flex min-w-0 flex-[1_1_420px]">
              {account ? (
                <OneTapDemo
                  iconSetId={account.iconSetId}
                  // Chưa có API nhật ký (Bước 5): giống màn Hôm nay, chỉ là bản thử.
                  status={(score, label) => (
                    <>
                      Đã lưu cho hôm nay: điểm {score} · {label}. <span className="text-faint">Bản thử, chưa lưu.</span>
                    </>
                  )}
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

        <Features />

        <section id="year-in-pixels" className="border-t-[1.5px] border-line bg-band">
          <div className={cn(wrap, sectionPad, 'flex flex-col gap-10')}>
            <div className="flex flex-col gap-3">
              <h2 className={sectionTitle}>{account ? `Năm ${todayIn(account.timeZone).slice(0, 4)} của bạn` : 'Cả năm, trong một bức tranh'}</h2>
              <p className="text-[17px] leading-7 text-muted-foreground">
                {account ? (
                  <>
                    Mỗi ô là một ngày bạn đã ghi. Bấm chú thích để lọc, hoặc{' '}
                    <Link to="/pixels" className="link-underline font-semibold text-foreground">
                      mở Year in Pixels
                    </Link>
                    .
                  </>
                ) : (
                  'Mỗi ô là một ngày, mỗi màu là một mức điểm.'
                )}
              </p>
            </div>
            <YearPreview />
          </div>
        </section>

        <Privacy />

        <section className={cn(wrap, 'pb-[clamp(80px,10vw,128px)]')}>
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] border-[1.5px] border-line bg-primary p-[clamp(32px,5vw,56px)] text-primary-foreground shadow-[5px_5px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] hover:[transform:translate(-2px,-2px)] hover:shadow-[7px_7px_0_var(--cta-shadow)]">
            <h2 className="font-heading text-[clamp(24px,2.4vw,30px)] leading-[1.3] font-bold text-balance">
              {account && todayWritten ? 'Hôm nay đã có một trang. Viết thêm vài dòng?' : 'Hôm nay của bạn thế nào?'}
            </h2>
            {account ? (
              <Link
                to="/today"
                className={cn(
                  'press inline-flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-primary-foreground bg-primary-foreground pr-5 pl-4 text-[15px] font-semibold text-primary',
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

      <footer className="border-t-[1.5px] border-line">
        <div className={cn(wrap, 'flex flex-wrap items-center justify-between gap-4 py-7')}>
          <div className="flex flex-wrap items-center gap-2">
            <Logo size="sm" className="hover:[&_svg]:animate-wiggle [&_svg]:origin-[50%_60%]" />
            <span className="ml-2 text-[13px] text-muted-foreground">Jot it down, keep it forever.</span>
          </div>
          <div className="flex flex-wrap gap-5 text-[13px]">
            {/* Chờ nội dung điều khoản và chính sách thật trước khi ra mắt. */}
            <a href="#" className="link-underline">
              [Điều khoản sử dụng]
            </a>
            <a href="#" className="link-underline">
              [Chính sách quyền riêng tư]
            </a>
            <span className="text-muted-foreground">© 2026 Jotly</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
