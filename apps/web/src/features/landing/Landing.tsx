import { Download, Image, Lock, Search, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { flagColors, flagHex } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { DEMO_ICON_SET } from './demoData'
import { MonthPreview } from './MonthPreview'
import { OneTapDemo } from './OneTapDemo'
import { YearPreview } from './YearPreview'

// Đăng nhập Google làm ở Bước 3; tới lúc đó nút chỉ dẫn vào app.
const START_HREF = '/today'

const wrap = 'mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,40px)]'
const sectionPad = 'py-[clamp(80px,10vw,128px)]'
// Thang chữ T1 · Sổ tay: 12 nhãn / 14 nhỏ / 16 body / 18 nội dung / 22 H3 / 30 H2 / 56 Display.
const sectionTitle = 'font-heading text-[clamp(26px,2.6vw,30px)] leading-[1.3] font-bold text-balance'
const card = 'rounded-[20px] border-[1.5px] border-line bg-card'

/** Ô vuông nét đứt giữ chỗ cho logo Google (lấy từ bộ tài nguyên chính thức ở Bước 3). */
function GoogleMarkPlaceholder({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('size-5 rounded-[4px] border-[1.5px] border-dashed', className)} />
}

function GoogleButton({ inverted }: { inverted?: boolean }) {
  return (
    <Link
      to={START_HREF}
      className={cn(
        'inline-flex h-12 items-center gap-2.5 rounded-md border-[1.5px] pr-5 pl-4 text-base font-semibold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
        inverted
          ? 'press border-primary-foreground bg-primary-foreground text-primary'
          : 'lift border-line bg-card shadow-ink-sm',
      )}
    >
      <GoogleMarkPlaceholder className={inverted ? 'border-primary' : 'border-muted-foreground'} />
      Tiếp tục với Google
    </Link>
  )
}

function SiteHeader() {
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
          className="rounded-sm transition-transform duration-150 hover:[&_svg]:animate-wiggle active:scale-95 focus-visible:outline-3 focus-visible:outline-ring [&_svg]:origin-[50%_60%]"
        >
          <Logo />
        </a>
        <ul className="ml-4 hidden gap-0.5 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative inline-flex h-10 items-center rounded-[12px] px-3 text-sm font-medium transition-[background-color,scale] duration-200 after:absolute after:inset-x-3 after:bottom-[7px] after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-250 hover:bg-secondary hover:after:scale-x-100 active:scale-95 focus-visible:outline-3 focus-visible:outline-ring"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <ThemeToggle className="press ml-auto size-10 rounded-[12px] [&_svg]:transition-[rotate] [&_svg]:duration-450 [&_svg]:ease-[cubic-bezier(.3,1.5,.5,1)] hover:[&_svg]:-rotate-[25deg] active:[&_svg]:-rotate-[110deg]" />
        <Link
          to={START_HREF}
          className="press inline-flex h-10 shrink-0 items-center rounded-[12px] bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring sm:px-4"
        >
          Bắt đầu viết
        </Link>
      </nav>
    </header>
  )
}

function Hero() {
  const dark = useDarkMode()
  const lavender = flagColors.find((f) => f.id === 'lavender')!
  return (
    <section className={cn(wrap, 'flex flex-wrap items-center gap-[72px] pt-[clamp(56px,8vw,112px)] pb-[clamp(80px,10vw,136px)]')}>
      <div className="flex min-w-0 flex-[1.2_1_440px] flex-col gap-5">
        <h1 className="group/h1 max-w-[560px] animate-rise text-[clamp(32px,4.4vw,56px)] leading-[1.2] font-bold tracking-[-0.01em] text-balance">
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
        <p className="max-w-[440px] animate-rise text-reading text-muted-foreground" style={{ animationDelay: '.12s' }}>
          Mỗi ngày một trang. Chấm điểm, chọn biểu tượng, viết vài dòng nếu muốn.
        </p>
        <div className="mt-3 flex animate-rise flex-wrap items-center gap-x-[22px] gap-y-3.5" style={{ animationDelay: '.24s' }}>
          <GoogleButton />
          <a href="#mot-cham" className="link-underline text-base font-medium">
            Xem cách hoạt động
          </a>
        </div>
        <p className="animate-rise text-sm leading-[22px] text-muted-foreground" style={{ animationDelay: '.32s' }}>
          Đăng nhập bằng Gmail, không cần mật khẩu.
        </p>
      </div>

      <div aria-hidden="true" className="flex min-w-0 flex-[1_1_380px] flex-col items-end">
        <MonthPreview className="w-full max-w-[400px] rotate-2" />
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
                subClassName="animate-pop transition-[translate,rotate] duration-300 ease-[cubic-bezier(.3,1.6,.5,1)] group-hover/tilt:-translate-y-[5px] group-hover/tilt:-rotate-12"
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

function FeatureCard({
  visual,
  title,
  children,
  className,
}: {
  visual: ReactNode
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <article className={cn(card, 'group/card reveal-on-scroll lift flex flex-col gap-3 p-7 shadow-ink-sm', className)}>
      <div className="mb-2">{visual}</div>
      <h3 className="text-lg leading-[26px] font-semibold">{title}</h3>
      <p className="text-base leading-[26px] text-muted-foreground">{children}</p>
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
      {/* 5 thẻ: máy tính 3 + 2 (hàng dưới rộng hơn), máy tính bảng 2 + 2 + 1, điện thoại 1 cột; không hàng nào hụt ô. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-6">
        <FeatureCard
          className="lg:col-span-2"
          title="Một trang mỗi ngày"
          visual={
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="flex size-12 items-center justify-center rounded-[10px] border-[1.5px] border-line bg-muted transition-[translate,rotate] duration-300 ease-[cubic-bezier(.3,1.5,.5,1)] group-hover/card:-translate-y-1 group-hover/card:-rotate-[5deg]"
                >
                  <Image className="size-[18px] text-muted-foreground" aria-hidden="true" />
                </span>
              ))}
              <span className="flex h-12 items-center rounded-[10px] border-[1.5px] border-dashed border-line px-2.5 text-sm font-semibold transition-[translate,rotate] duration-300 ease-[cubic-bezier(.3,1.5,.5,1)] group-hover/card:-translate-y-1 group-hover/card:-rotate-[5deg]">
                3/{maxPhotos}
              </span>
            </div>
          }
        >
          Tiêu đề, nội dung, từ khóa và tối đa {maxPhotos} ảnh.
        </FeatureCard>
        <FeatureCard
          className="lg:col-span-2"
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
          className="lg:col-span-2"
          title="Cờ hiệu"
          visual={
            <div className="flex flex-wrap gap-1.5">
              {flagColors.map((f) => (
                <span
                  key={f.id}
                  className="h-6 w-8 rounded-[6px] border-[1.5px] border-line transition-[translate,rotate] duration-300 ease-[cubic-bezier(.3,1.5,.5,1)] group-hover/card:-translate-y-1 group-hover/card:-rotate-[7deg]"
                  style={{ backgroundColor: flagHex(f.hex, dark) }}
                />
              ))}
            </div>
          }
        >
          Gắn một màu cho ngày đáng nhớ.
        </FeatureCard>
        <FeatureCard
          className="lg:col-span-3"
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
          className="md:col-span-2 lg:col-span-3"
          title="Tìm theo từ khóa"
          visual={
            <div className="flex h-11 items-center gap-2 rounded-[12px] border-[1.5px] border-line bg-background px-3">
              <Search className="size-[18px] text-muted-foreground group-hover/card:animate-seek" aria-hidden="true" />
              <span className="text-base">mưa</span>
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
    // Chia sẻ nhật ký nằm ngoài MVP (Project_Specs 2.2); xuất dữ liệu là F-07, cam kết luôn miễn phí.
    { icon: Download, title: 'Tải về bất cứ lúc nào', text: 'Xuất toàn bộ nhật ký ra file, luôn miễn phí.' },
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
            <h3 className="text-lg leading-[26px] font-semibold">{item.title}</h3>
            <p className="text-base leading-[26px] text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Trang giới thiệu cho người chưa đăng nhập (thiết kế B5 · Landing page). */
export function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteHeader />
      <main>
        <Hero />

        <section id="mot-cham" className="border-y-[1.5px] border-line bg-band">
          <div className={cn(wrap, sectionPad, 'flex flex-wrap items-center gap-16')}>
            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
              <h2 className={sectionTitle}>Bận quá? Một chạm là đủ.</h2>
              <p className="max-w-[380px] text-base leading-[26px] text-muted-foreground">
                Chỉ cần chấm điểm, hôm nay đã được ghi lại. Viết thêm lúc nào cũng được.
              </p>
            </div>
            <div className="flex min-w-0 flex-[1_1_420px]">
              <OneTapDemo />
            </div>
          </div>
        </section>

        <Features />

        <section id="year-in-pixels" className="border-t-[1.5px] border-line bg-band">
          <div className={cn(wrap, sectionPad, 'flex flex-col gap-10')}>
            <div className="flex flex-col gap-3">
              <h2 className={sectionTitle}>Cả năm, trong một bức tranh</h2>
              <p className="text-base leading-[26px] text-muted-foreground">Mỗi ô là một ngày, mỗi màu là một mức điểm.</p>
            </div>
            <YearPreview />
          </div>
        </section>

        <Privacy />

        <section className={cn(wrap, 'pb-[clamp(80px,10vw,128px)]')}>
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] border-[1.5px] border-line bg-primary p-[clamp(32px,5vw,56px)] text-primary-foreground shadow-[5px_5px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] hover:[transform:translate(-3px,-3px)] hover:shadow-[9px_9px_0_var(--cta-shadow)]">
            <h2 className={sectionTitle}>Hôm nay của bạn thế nào?</h2>
            <GoogleButton inverted />
          </div>
        </section>
      </main>

      <footer className="border-t-[1.5px] border-line">
        <div className={cn(wrap, 'flex flex-wrap items-center justify-between gap-4 py-7')}>
          <div className="flex flex-wrap items-center gap-2">
            <Logo size="sm" className="hover:[&_svg]:animate-wiggle [&_svg]:origin-[50%_60%]" />
            <span className="ml-2 text-sm text-muted-foreground">Jot it down, keep it forever.</span>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
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
