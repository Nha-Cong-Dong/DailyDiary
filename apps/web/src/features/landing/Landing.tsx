import { CircleCheck, Image as ImageIcon, Lock, Pencil } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { googleLoginUrl } from '@/api/client'
import { EntryCard } from '@/components/diary/EntryCard'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Stamp } from '@/components/diary/Stamp'
import { Avatar } from '@/components/layout/Avatar'
import { GoogleMark } from '@/components/layout/GoogleMark'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { flagColors, SCORES, scoreLabel, type Score } from '@/lib/catalog'
import { browserTimeZone, daysEndingAt, todayIn, type DateString } from '@/lib/date'
import { t, useT } from '@/lib/i18n'
import { tierLimits } from '@/lib/limits'
import { cn } from '@/lib/utils'
import { AccountMenu } from './AccountMenu'
import { DEMO_ICON_SET } from './demoData'
import { LookBack } from './LookBack'
import { OneTapDemo, OneTapGuest } from './OneTapDemo'
import { greeting, useHomeSummary, useRecentDays, type HomeSummary } from './useHomeSummary'

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
  /** Chấm điểm nhanh (lưu thật qua API, routes/HomePage ghép từ feature entry). */
  quickScore?: QuickScore
}

/** Chấm điểm nhanh cho ngày đang chọn trong dải 7 ngày (mặc định hôm nay; ngày trống thì thành ghi bù). */
export type QuickScore = {
  selected: DateString
  onSelect: (date: DateString) => void
  value: Score | null
  onPick: (score: Score) => void
  loading: boolean
  saving: boolean
  error: string | null
}

const wrap = 'mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,40px)]'
const wide = 'mx-auto w-full max-w-[1680px] px-[clamp(16px,4vw,56px)]'
const sectionPad = 'py-[clamp(56px,7vw,96px)]'
const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'
const LAVENDER = flagColors.find((f) => f.id === 'lavender')?.hex ?? null

function GoogleButton({ inverted }: { inverted?: boolean }) {
  const t = useT()
  return (
    // Điều hướng thẳng tới API (không fetch) để cookie dd_oauth của luồng OAuth đi trọn vòng.
    <a
      href={googleLoginUrl(browserTimeZone())}
      className={cn(
        'inline-flex items-center gap-2.5 rounded-[16px] border-2 pr-5 pl-4 text-body font-semibold',
        focusRing,
        inverted ? 'press h-12 border-on-primary bg-on-primary text-primary' : 'lift-sm h-[52px] border-stroke bg-card text-ink shadow-sm',
      )}
    >
      <GoogleMark />
      {t('landing:google.continue')}
    </a>
  )
}

function SiteHeader({ account, todayWritten }: { account?: LandingAccount; todayWritten: boolean }) {
  const t = useT()
  const links = [
    { href: '#mot-cham', label: t('landing:header.links.oneTap') },
    { href: '#nhin-lai', label: t('landing:header.links.lookBack') },
    { href: '#rieng-tu', label: t('landing:header.links.privacy') },
  ]
  return (
    <header className={cn(wide, 'relative z-10 pt-5 pb-2')}>
      <nav
        aria-label={t('landing:header.nav')}
        className="flex items-center gap-2 rounded-full border-2 border-stroke bg-card py-2 pr-2.5 pl-[22px] shadow-sm"
      >
        <a href="#" aria-label={t('landing:header.home')} className={cn('rounded-sm transition-[scale] duration-150 active:scale-[.97] motion-reduce:scale-100!', focusRing)}>
          <Logo />
        </a>
        <ul className="ml-2 hidden gap-0.5 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cn(
                  'relative inline-flex h-10 items-center rounded-md px-3 text-body font-medium transition-[background-color] duration-(--dur-fast) ease-out after:absolute after:inset-x-3 after:bottom-[7px] after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-(--dur-base) after:ease-out pointer-fine:hover:bg-secondary pointer-fine:hover:after:scale-x-100',
                  focusRing,
                )}
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
          <ThemeToggle className="size-10 rounded-md border-2" />
          <Link
            to={START_HREF}
            className={cn(
              'press-solid inline-flex h-10 shrink-0 items-center rounded-md bg-primary px-4 text-body font-semibold text-on-primary pointer-fine:hover:bg-primary-hover',
              focusRing,
            )}
          >
            {account ? t('landing:header.openJournal') : t('landing:header.start')}
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
  if (!summary) return t('landing:hero.statusWaiting')
  return t('landing:hero.statusSummary', {
    recorded: summary.recorded,
    daysSoFar: summary.daysSoFar,
    streak: t('landing:hero.days', { count: summary.streak }),
  })
}

// Nền hero: lưới ô kiểu Year in Pixels (1200 ô đủ phủ màn 1920 px), giả ngẫu nhiên cố định, chỉ để trang trí.
const FIELD: string[] = (() => {
  let seed = 2026
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: 1200 }, () => {
    const x = rnd()
    if (x < 0.06) return 'border-line-soft'
    if (x < 0.14) return 'border-line-soft bg-sunk'
    const sc = x < 0.21 ? 1 : x < 0.36 ? 2 : x < 0.62 ? 3 : x < 0.85 ? 4 : 5
    return `border-score-${sc} bg-score-${sc}`
  })
})()
// Tailwind cần thấy tên lớp đầy đủ: border-score-1 bg-score-1 border-score-2 bg-score-2 border-score-3 bg-score-3
// border-score-4 bg-score-4 border-score-5 bg-score-5

// "Rõ ở giữa" (canvas huongMo mặc định): lưới hiện rõ nhất ở giữa hero, mờ dần ra mép; hai đốm nhỏ hai bên.
const FIELD_MASK =
  'radial-gradient(ellipse 30% 42% at 50% 50%, rgba(0,0,0,.62) 0%, rgba(0,0,0,.4) 40%, rgba(0,0,0,.14) 76%, rgba(0,0,0,0) 100%),' +
  'radial-gradient(ellipse 17% 24% at 33% 35%, rgba(0,0,0,.26) 0%, rgba(0,0,0,.1) 55%, rgba(0,0,0,0) 100%),' +
  'radial-gradient(ellipse 17% 24% at 67% 66%, rgba(0,0,0,.26) 0%, rgba(0,0,0,.1) 55%, rgba(0,0,0,0) 100%)'

function HeroField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 grid animate-fade [animation-duration:800ms] grid-cols-[repeat(auto-fill,32px)] auto-rows-[32px] content-center justify-center gap-2 overflow-hidden p-4"
      style={{ maskImage: FIELD_MASK, WebkitMaskImage: FIELD_MASK } as CSSProperties}
    >
      {FIELD.map((cls, i) => (
        <span key={i} className={cn('rounded-[6px] border', cls)} />
      ))}
    </div>
  )
}

/** Ba lỗ đục bên lề trang sổ. */
function Holes({ className, rings }: { className?: string; rings?: boolean }) {
  return (
    <div aria-hidden="true" className={cn('absolute inset-y-0 left-4 flex flex-col justify-evenly', className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="relative size-4 rounded-full border-2 border-stroke bg-paper">
          {rings ? (
            <span className="absolute -top-1.5 -left-6 h-6 w-10 rounded-full border-[3px] border-stroke shadow-[inset_0_0_0_2.5px_var(--color-line-soft)]" />
          ) : null}
        </span>
      ))}
    </div>
  )
}

/** Hai trang sổ MẪU bên phải hero: trang hôm qua phía sau, trang hôm nay phía trước, chạm thử đổi điểm tại chỗ. */
function HeroNotebook() {
  const t = useT()
  const [score, setScore] = useState<Score>(4)
  const name = scoreLabel(DEMO_ICON_SET, score)
  return (
    <div className="relative w-full max-w-[420px] pt-2 pr-1.5 pb-3.5">
      <div
        aria-hidden="true"
        className="ruled absolute top-0 left-0 flex h-[84%] w-[74%] -rotate-4 animate-stamp flex-col gap-0.5 rounded-lg border-2 border-stroke bg-card pt-4 pl-[50px] shadow-md [animation-delay:100ms]"
      >
        <Holes rings />
        <span className="text-label text-ink-soft">{t('landing:hero.notebook.yesterdayDate')}</span>
        <span className="text-body font-semibold">{t('landing:hero.notebook.yesterdayTitle')}</span>
      </div>

      <article
        aria-label={t('landing:hero.notebook.ariaLabel')}
        className="tilt relative mt-11 ml-[clamp(36px,10vw,56px)] flex rotate-[1.5deg] animate-stamp flex-col gap-3.5 rounded-lg border-2 border-stroke bg-card pt-[22px] pr-[22px] pb-5 pl-[54px] shadow-lg [animation-delay:220ms]"
      >
        <Holes />
        <span aria-hidden="true" className="absolute inset-y-0 left-[42px] w-0.5 bg-notebook-margin" />
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-label text-ink-soft">{t('landing:hero.notebook.todayDate')}</span>
            <span className="text-label">{t('landing:hero.notebook.todayName', { name })}</span>
          </span>
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-stroke bg-card shadow-sm">
            <span role="img" aria-label={t('landing:hero.notebook.scoreLabel', { score, name })} className="flex">
              <ScoreIcon key={score} iconSetId={DEMO_ICON_SET} score={score} size={38} className="animate-pop" />
            </span>
            <span
              aria-hidden="true"
              className="absolute -right-2 -bottom-1.5 flex size-[26px] items-center justify-center rounded-full border-2 border-stroke bg-card text-[15px] leading-none"
            >
              😌
            </span>
          </span>
        </div>
        <h3 className="text-heading">{t('landing:sample.title')}</h3>
        <p className="ruled pb-[30px] text-reading">{t('landing:sample.excerptShort')}</p>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-label">{t('landing:hero.notebook.tapToChange')}</legend>
          <div className="flex gap-1">
            {SCORES.map((n) => {
              const on = n === score
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={t('landing:hero.notebook.scoreLabel', { score: n, name: scoreLabel(DEMO_ICON_SET, n) })}
                  aria-pressed={on}
                  onClick={() => setScore(n)}
                  className={cn(
                    'pick flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md border-2',
                    focusRing,
                    on ? 'border-stroke bg-lavender-soft shadow-sm' : 'border-line-soft pointer-fine:hover:border-stroke pointer-fine:hover:bg-card',
                  )}
                >
                  <ScoreIcon iconSetId={DEMO_ICON_SET} score={n} size={28} />
                </button>
              )
            })}
          </div>
        </fieldset>
        <p className="flex items-center gap-1.5 text-label text-sage-ink">
          <CircleCheck className="size-4" strokeWidth={2.5} aria-hidden="true" />
          {t('landing:hero.notebook.savedAt')}
        </p>
      </article>
    </div>
  )
}

function Hero({ account, summary }: { account?: LandingAccount; summary?: HomeSummary | null }) {
  const t = useT()
  const rise = (delay: number) => ({ animationDelay: `${delay}ms` })
  return (
    <section aria-labelledby="hero-title" className="relative">
      <HeroField />
      <div
        className={cn(
          wide,
          'relative z-[1] grid grid-cols-[minmax(0,1fr)] gap-y-14 pt-[clamp(32px,5vw,64px)] pb-[clamp(72px,8vw,112px)]',
          'md:min-h-[640px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-x-10',
          'min-[1180px]:min-h-[760px] min-[1180px]:grid-cols-[minmax(0,400px)_minmax(0,1fr)_minmax(0,420px)] min-[1180px]:gap-x-[clamp(28px,2.6vw,48px)]',
        )}
      >
        <div className="flex min-w-0 flex-col gap-[22px] md:col-start-1 md:row-start-1 md:self-start md:pt-4 min-[1180px]:pt-6">
          {account ? (
            <Link
              to="/profile"
              className={cn(
                'inline-flex animate-rise items-center gap-2.5 self-start rounded-full border-2 border-stroke bg-card py-1 pr-3.5 pl-1 text-body font-medium transition-[translate] duration-(--dur-fast) ease-out pointer-fine:hover:-translate-y-0.5 motion-reduce:translate-none!',
                focusRing,
              )}
            >
              <Avatar name={account.name} src={account.avatarUrl} size={28} className="text-[10px]" />
              {greeting(account.name, account.timeZone)}
            </Link>
          ) : null}
          <h1 id="hero-title" className="max-w-[520px] animate-rise text-display">
            {t('landing:hero.titleLead')}
            <span className="relative inline-block whitespace-nowrap">
              {t('landing:hero.titleAccent')}
              <svg
                aria-hidden="true"
                viewBox="0 0 200 16"
                preserveAspectRatio="none"
                className="absolute -bottom-[0.22em] -left-[2%] h-[0.36em] w-[104%] overflow-visible"
              >
                <path
                  className="draw-in stroke-peach"
                  pathLength={1}
                  d="M4 11c38-6 92-9 192-4"
                  fill="none"
                  strokeWidth={5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
          </h1>
          <p className="max-w-[380px] animate-rise text-reading text-ink-soft" style={rise(70)}>
            {t('landing:hero.subtitle')}
          </p>
          <div className="mt-3 flex animate-rise flex-wrap items-center gap-x-[22px] gap-y-3.5" style={rise(140)}>
            {account ? (
              <>
                <Link
                  to="/today"
                  className={cn(
                    'lift-sm inline-flex h-[52px] items-center gap-2.5 rounded-[16px] border-2 border-stroke bg-card pr-[18px] pl-4 text-body font-semibold shadow-sm',
                    focusRing,
                  )}
                >
                  <Pencil className="size-[18px]" aria-hidden="true" />
                  {t('landing:hero.openToday')}
                </Link>
                <Link to="/timeline" className="link-underline text-body font-medium">
                  {t('landing:hero.viewTimeline')}
                </Link>
              </>
            ) : (
              <>
                <GoogleButton />
                <a href="#mot-cham" className="link-underline text-body font-medium">
                  {t('landing:hero.howItWorks')}
                </a>
              </>
            )}
          </div>
          <p className="animate-rise text-label font-normal text-ink-soft" style={rise(210)}>
            {account ? heroStatus(summary) : t('landing:hero.signInNote')}
          </p>
        </div>
        <div className="flex min-w-0 justify-end md:col-start-2 md:row-start-1 md:self-end min-[1180px]:col-start-3">
          <HeroNotebook />
        </div>
      </div>
    </section>
  )
}

/** Vạch chia giữa các mục (canvas "Mầm lớn dần"): icon mầm lớn dần từ Hạt tới Nở rộ khi cuộn xuống. */
function Divider({ score }: { score: Score }) {
  return (
    <div aria-hidden="true" className="reveal-on-scroll flex h-[76px] items-center gap-3.5">
      <span className="h-[2.5px] min-w-0 flex-1 rounded-full bg-stroke" />
      <span
        title={scoreLabel(DEMO_ICON_SET, score)}
        className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-stroke bg-card shadow-sm"
      >
        <ScoreIcon iconSetId={DEMO_ICON_SET} score={score} size={30} />
      </span>
      <span className="h-[2.5px] min-w-0 flex-1 rounded-full bg-stroke" />
    </div>
  )
}

function OneTapSection({ account, todayIso, week }: { account?: LandingAccount; todayIso: DateString; week: ReturnType<typeof weekOf> }) {
  const t = useT()
  const q = account?.quickScore
  return (
    <section id="mot-cham" aria-labelledby="mot-cham-title">
      <div className={cn(wrap, sectionPad, 'flex flex-wrap items-center gap-16')}>
        <div className="reveal-on-scroll flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
          <h2 id="mot-cham-title" className="text-title">
            {account ? t('landing:oneTap.titleSigned') : t('landing:oneTap.titleGuest')}
          </h2>
          <p className="max-w-[380px] text-reading text-ink-soft">
            {account
              ? t('landing:oneTap.textSigned')
              : t('landing:oneTap.textGuest')}
          </p>
        </div>
        <div className="reveal-on-scroll flex min-w-0 flex-[1_1_420px]">
          {account && q ? (
            <OneTapDemo
              signed
              iconSetId={account.iconSetId}
              today={todayIso}
              week={week}
              selected={q.selected}
              onSelect={q.onSelect}
              value={q.value}
              onPick={q.onPick}
              loading={q.loading}
              saving={q.saving}
              error={q.error}
              footer={
                <Link to="/today" className="link-underline self-start text-body font-semibold">
                  {t('landing:oneTap.writeMore')}
                </Link>
              }
            />
          ) : (
            <OneTapGuest />
          )}
        </div>
      </div>
    </section>
  )
}

/** Dải 7 ngày thật tới hôm nay (đã đăng nhập). */
function weekOf(today: DateString, recent: ReturnType<typeof useRecentDays>['data']) {
  return daysEndingAt(today, 7).map((date) => {
    const r = recent?.[date]
    return { date, score: r?.score ?? null, sub: r?.sub ?? null, backfilled: r?.backfilled ?? false }
  })
}

/** Chồng ba ảnh minh họa cạnh nội dung trang mẫu. */
function PhotoStack() {
  const t = useT()
  return (
    <div aria-hidden="true" className="relative my-1.5 mr-1.5 w-[132px] shrink-0">
      <span className="absolute inset-0 -rotate-5 rounded-md border-2 border-stroke bg-card" />
      <span className="absolute inset-0 rotate-[7deg] rounded-md border-2 border-stroke bg-card" />
      <span className="relative flex rotate-2 flex-col gap-1.5 rounded-md border-2 border-stroke bg-card p-[9px] pb-[7px] shadow-lg">
        <span className="absolute top-[7px] left-1/2 -ml-[13px] h-1.5 w-[26px] -rotate-[8deg] rounded-[3px] border-2 border-stroke bg-tape" />
        <svg viewBox="0 0 112 92" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="block h-auto w-full rounded-[6px] stroke-ink">
          <rect x="1" y="1" width="110" height="90" rx="6" className="fill-lavender-soft" />
          <rect x="16" y="10" width="80" height="44" rx="4" className="fill-rule" />
          <path d="M56 10v44 M16 32h80" />
          <path d="M28 16l-3 7 M44 21l-3 7 M68 15l-3 7 M86 19l-3 7 M36 37l-3 7 M64 38l-3 7 M80 40l-3 7" strokeWidth={1.6} />
          <path d="M8 60h96" />
          <rect x="70" y="64" width="16" height="18" rx="3" className="fill-peach" />
          <path d="M86 68c5 0 5 9 0 9" />
          <rect x="20" y="73" width="38" height="10" rx="2" className="fill-sage" />
          <rect x="24" y="64" width="32" height="9" rx="2" className="fill-lavender" />
        </svg>
        <span className="flex items-center justify-center gap-1.5 text-label text-ink-soft">
          <ImageIcon className="size-4" aria-hidden="true" />
          {t('landing:anatomy.photos', { count: 3 })}
        </span>
      </span>
    </div>
  )
}

function DayAnatomy() {
  const t = useT()
  const maxPhotos = tierLimits().photos.per_day_max
  const items: [string, ReactNode][] = [
    [t('landing:anatomy.scoreTerm'), t('landing:anatomy.scoreText')],
    [t('landing:anatomy.flagTerm'), t('landing:anatomy.flagText')],
    [t('landing:anatomy.wordsTerm'), t('landing:anatomy.wordsText', { count: maxPhotos })],
    [t('landing:anatomy.keywordsTerm'), t('landing:anatomy.keywordsText')],
    [
      t('landing:anatomy.backfillTerm'),
      <>
        {t('landing:anatomy.backfillPre')}
        <span className="relative inline-block whitespace-nowrap">
          <del className="relative text-ink-soft no-underline">
            {t('landing:anatomy.backfillWord')}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
              className="absolute top-1/2 -left-[6%] -mt-1 h-2.5 w-[112%] overflow-visible"
            >
              <path d="M2 8C28 2 64 10 98 3" fill="none" strokeWidth={2.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-ink" />
            </svg>
          </del>
          <ins className="absolute bottom-[72%] left-1/2 -translate-x-1/2 -rotate-5 text-[15px] leading-[18px] font-bold whitespace-nowrap text-peach-ink no-underline">
            {t('landing:anatomy.backfillDate')}
          </ins>
        </span>
        {t('landing:anatomy.backfillPost')}
      </>,
    ],
  ]
  return (
    <section id="mot-trang" aria-labelledby="mot-trang-title" className={cn(wrap, sectionPad)}>
      <div className="grid items-center gap-x-16 gap-y-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col gap-8">
          <h2 id="mot-trang-title" className="reveal-on-scroll text-title">
            {t('landing:anatomy.title')}
          </h2>
          <div className="ruled reveal-on-scroll relative bg-[position:0_-4px] pl-[46px] leading-[30px]">
            <span aria-hidden="true" className="absolute -top-3 -bottom-3 left-7 w-0.5 bg-notebook-margin" />
            <dl className="flex flex-col gap-[30px]">
              {items.map(([term, desc]) => (
                <div key={term} className="flex flex-col">
                  <dt className="text-body leading-[30px] font-semibold">{term}</dt>
                  <dd className="text-body leading-[30px] text-ink-soft">{desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="reveal-on-scroll relative min-w-0">
          {/* Kẹp giấy giữ trang mẫu. */}
          <svg
            aria-hidden="true"
            width="30"
            height="74"
            viewBox="0 0 30 74"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute -top-[34px] left-16 z-[2] rotate-[7deg] overflow-visible"
          >
            <path d="M11 24v34a6 6 0 0 0 12 0V13a9 9 0 0 0-18 0v47a11 11 0 0 0 22 0V28" strokeWidth={5.5} className="stroke-ink" />
            <path d="M11 24v34a6 6 0 0 0 12 0V13a9 9 0 0 0-18 0v47a11 11 0 0 0 22 0V28" strokeWidth={2.2} className="stroke-line-soft" />
          </svg>
          <EntryCard
            variant="page"
            ariaLabel={t('landing:sample.pageLabel')}
            iconSetId={DEMO_ICON_SET}
            score={4}
            subIcon="😌"
            flagColor={LAVENDER}
            dateLabel={t('landing:sample.pageDate')}
            dateParts={{ weekday: t('common:date.weekdayLong.0'), day: 18, month: 10, year: 2026 }}
            statusLine={`${scoreLabel(DEMO_ICON_SET, 4)} · ${t('landing:sample.onTime')}`}
            title={t('landing:sample.title')}
            excerpt={t('landing:sample.excerptLong')}
            photo={<PhotoStack />}
            keywords={[t('landing:sample.keyword1'), t('landing:sample.keyword2'), t('landing:sample.keyword3')]}
            footer={
              <>
                <Stamp kind="saved">{t('landing:sample.savedAt')}</Stamp>
                <span>{t('landing:sample.editedAt')}</span>
              </>
            }
          />
        </div>
      </div>
    </section>
  )
}

/** Ô tích vẽ tay trước mỗi cam kết riêng tư (mỗi ô nghiêng một chút, nét tích hơi khác nhau). */
function HandCheck({ d, tilt }: { d: string; tilt: string }) {
  return (
    <span aria-hidden="true" className={cn('relative mt-0.5 size-6 shrink-0 rounded-[6px] border-2 border-stroke bg-card', tilt)}>
      <svg
        width="16"
        height="14"
        viewBox="0 0 30 26"
        fill="none"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-1/2 left-1/2 -translate-1/2 overflow-visible stroke-ink"
      >
        <path d={d} vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  )
}

function Privacy() {
  const t = useT()
  const items = [
    {
      title: t('landing:privacy.defaultTitle'),
      text: t('landing:privacy.defaultText'),
      d: 'M4 13c3 2.6 5.2 5.3 6.6 8.4C14 12.5 19.5 5.5 27 1.5',
      tilt: '-rotate-2',
    },
    {
      // Chia sẻ một trang qua link (F-10, ADR 0005): người viết tự quyết.
      title: t('landing:privacy.chooseTitle'),
      text: t('landing:privacy.chooseText'),
      d: 'M3.5 14.5c3.4 2 5.6 4.6 7 7.6C14.6 13 20 6.8 26.5 2.6',
      tilt: 'rotate-[1.5deg]',
    },
    {
      title: t('landing:privacy.deleteTitle'),
      text: t('landing:privacy.deleteText'),
      d: 'M4.5 12.8c2.8 2.8 4.8 5.4 6.2 8.6C14.4 12 19 6 27.5 2',
      tilt: '-rotate-1',
    },
  ]
  return (
    <section id="rieng-tu" aria-labelledby="rieng-tu-title">
      <div className={cn(wrap, sectionPad, 'grid items-end gap-x-16 gap-y-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]')}>
        <div className="reveal-on-scroll flex flex-col items-start gap-7">
          <span
            aria-hidden="true"
            className="inline-flex -rotate-7 items-center gap-2 rounded-[12px] border-[2.5px] border-stroke bg-sage py-2 pr-4 pl-3 text-body font-bold text-on-accent shadow-sm outline-[1.5px] -outline-offset-[7px] outline-on-accent outline-dashed"
          >
            <Lock className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
            {t('landing:privacy.badge')}
          </span>
          <h2
            id="rieng-tu-title"
            className="text-[clamp(36px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-0.025em] [font-variation-settings:'FLAR'_100]"
          >
            {t('landing:privacy.titleLead')}
            <span className="rounded-[6px] bg-[linear-gradient(transparent_56%,color-mix(in_oklab,var(--color-sage)_55%,transparent)_56%,color-mix(in_oklab,var(--color-sage)_55%,transparent)_94%,transparent_94%)] px-[0.06em] [box-decoration-break:clone]">
              {t('landing:privacy.titleAccent')}
            </span>
            {t('landing:privacy.titleEnd')}
          </h2>
        </div>
        <div className="reveal-on-scroll flex flex-col gap-4 text-reading leading-7">
          <ul className="flex flex-col gap-[18px]">
            {items.map((item) => (
              <li key={item.title} className="flex items-start gap-3.5">
                <HandCheck d={item.d} tilt={item.tilt} />
                <p>
                  <strong className="font-semibold">{item.title}</strong> <span className="text-ink-soft">{item.text}</span>
                </p>
              </li>
            ))}
          </ul>
          <Link to="/privacy" className="link-underline self-start text-body font-semibold">
            {t('landing:privacy.readPolicy')}
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Khối kêu gọi cuối trang: tờ giấy mực có góc gấp, bóng đào (vùng peach duy nhất của trang). */
function CallToAction({ account, todayWritten }: { account?: LandingAccount; todayWritten: boolean }) {
  const t = useT()
  return (
    <section aria-labelledby="cta-title" className={cn(wrap, 'reveal-on-scroll pt-[clamp(40px,5vw,64px)] pb-[clamp(80px,10vw,128px)]')}>
      <div className="relative flex flex-wrap items-center justify-between gap-6 rounded-[36px] rounded-tr-none border-2 border-stroke bg-primary p-[clamp(32px,5vw,56px)] text-on-primary shadow-accent-lg transition-[transform,box-shadow] duration-(--dur-fast) ease-out pointer-fine:hover:-translate-x-0.5 pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-[8px_8px_0_var(--color-peach)] motion-reduce:transform-none!">
        <span aria-hidden="true" className="pointer-events-none absolute -top-0.5 -right-0.5 size-[52px]">
          <svg width="100%" height="100%" viewBox="0 0 52 52" className="block overflow-visible">
            <path d="M0 0H52V52Z" className="fill-paper" />
            <path d="M8 8H56V56Z" className="fill-peach" />
            <path d="M1 1L51 51H9Q1 51 1 43Z" strokeWidth={2} strokeLinejoin="round" className="fill-secondary stroke-stroke" />
          </svg>
        </span>
        {/* Cây bút chì trang trí ở mép dưới. */}
        <svg
          aria-hidden="true"
          width="168"
          height="34"
          viewBox="0 0 168 34"
          fill="none"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute right-[clamp(20px,4vw,40px)] -bottom-[22px] -rotate-12 overflow-visible stroke-ink"
        >
          <path d="M29 11H147a9 9 0 0 1 0 18H29Z M29 11L9 20L29 29Z" stroke="none" className="fill-ink-shadow" />
          <path d="M26 8H144a9 9 0 0 1 0 18H26Z" className="fill-peach" />
          <path d="M26 8L6 17L26 26Z" className="fill-card" />
          <path d="M6 17L12.5 14.1V19.9Z" className="fill-ink" />
          <path d="M116 8V26 M122 8V26" />
          <path d="M124 8V3.5H148" />
        </svg>
        <h2 id="cta-title" className="font-heading text-[clamp(24px,2.4vw,30px)] leading-[1.3] font-bold">
          {account && todayWritten ? t('landing:cta.titleWritten') : t('landing:cta.title')}
        </h2>
        {account ? (
          <Link
            to="/today"
            className={cn('press inline-flex h-12 items-center gap-2.5 rounded-[16px] border-2 border-on-primary bg-on-primary pr-5 pl-4 text-body font-semibold text-primary', focusRing)}
          >
            <Pencil className="size-[18px]" aria-hidden="true" />
            {t('landing:cta.openToday')}
          </Link>
        ) : (
          <GoogleButton inverted />
        )}
      </div>
    </section>
  )
}

function SiteFooter() {
  const t = useT()
  return (
    <footer className="overflow-hidden">
      {/* Dải lỗ gáy sổ. */}
      <div
        aria-hidden="true"
        className={cn(
          wide,
          'h-4 bg-[radial-gradient(circle,var(--color-paper)_0,var(--color-paper)_3px,var(--color-stroke)_3.4px,var(--color-stroke)_5px,transparent_5.4px)] bg-[length:22px_16px] bg-center bg-repeat-x bg-clip-content',
        )}
      />
      <div className={cn(wrap, 'flex flex-col gap-6 pt-10 pb-7')}>
        <p aria-hidden="true" className="reveal-on-scroll -mb-[0.12em] font-brand text-[clamp(88px,22vw,264px)] leading-[0.8] tracking-[-0.02em]">
          Jotly
        </p>
        <div className="reveal-on-scroll flex flex-wrap items-center justify-between gap-4 pt-5">
          <span className="text-label font-normal text-ink-soft">{t('landing:footer.tagline')}</span>
          <LanguageSwitch className="sm:hidden" />
          <div className="flex flex-wrap gap-5 text-label font-normal">
            {/* Chờ nội dung điều khoản thật trước khi ra mắt. */}
            <a href="#" className="link-underline">
              {t('landing:footer.terms')}
            </a>
            <Link to="/privacy" className="link-underline">
              {t('landing:footer.privacy')}
            </Link>
            <span className="text-ink-soft">© 2026 Jotly</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * Trang chủ (thiết kế B5). Chưa đăng nhập: trang giới thiệu với dữ liệu mẫu. Đã đăng nhập (`account`): lời chào, nút
 * mở trang hôm nay, menu tài khoản, tóm tắt tháng và chấm điểm nhanh lưu thật cho 7 ngày gần nhất.
 */
export function Landing({ account }: { account?: LandingAccount }) {
  const timeZone = account?.timeZone ?? browserTimeZone()
  const { data } = useHomeSummary(timeZone, Boolean(account))
  const { data: recent } = useRecentDays(timeZone, Boolean(account))
  const summary = account ? data : undefined
  const todayWritten = Boolean(summary?.todayWritten)
  const todayIso = todayIn(timeZone)
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <SiteHeader account={account} todayWritten={todayWritten} />
      <main>
        <Hero account={account} summary={summary} />
        <Divider score={1} />
        <OneTapSection account={account} todayIso={todayIso} week={weekOf(todayIso, recent)} />
        <Divider score={2} />
        <LookBack signed={Boolean(account)} />
        <Divider score={3} />
        <DayAnatomy />
        <Divider score={4} />
        <Privacy />
        <Divider score={5} />
        <CallToAction account={account} todayWritten={todayWritten} />
      </main>
      <SiteFooter />
    </div>
  )
}
