import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { KeywordChip } from '@/components/diary/KeywordChip'
import { PhotoTile, PhotoViewer, type PhotoItem } from '@/components/diary/PhotoViewer'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Avatar } from '@/components/layout/Avatar'
import { GoogleMark } from '@/components/layout/GoogleMark'
import { LogoMark } from '@/components/layout/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { longDateLabel } from '@/lib/date'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { NotebookPage } from '@/components/diary/NotebookPage'
import { PublicFrame } from './components/PublicFrame'
import { ShareOff } from './ShareOff'
import type { PublicShare as PublicShareData } from './shares'
import { usePublicShare } from './useShares'

/** Trang người nhận link xem (B8-Public máy tính, B10-Public điện thoại). Không cần đăng nhập, chỉ đọc. */
export function PublicShare({ token }: { token: string }) {
  const { data, isPending, isError } = usePublicShare(token)
  if (isPending) {
    return (
      <PublicFrame title="Jotly">
        <main className="flex flex-1 items-center justify-center p-10">
          <p role="status" className="text-ink-soft">
            Đang mở trang…
          </p>
        </main>
      </PublicFrame>
    )
  }
  if (isError) {
    return (
      <PublicFrame title="Jotly">
        <main className="mx-auto w-full max-w-[760px] flex-1 px-[clamp(16px,4vw,40px)] py-10">
          <Alert variant="destructive">
            <AlertDescription>Chưa mở được trang này. Thử tải lại sau ít phút nhé.</AlertDescription>
          </Alert>
        </main>
      </PublicFrame>
    )
  }
  if (!data) return <ShareOff />
  return <SharedPage share={data} />
}

/**
 * Chỉ vẽ những trường có trong JSON công khai: trường người viết không chọn vắng mặt khỏi phản hồi, nên không có gì
 * để lộ. Ảnh đại diện không bao giờ được gửi; vòng tên dùng chữ cái đầu của `author_name`.
 */
function SharedPage({ share }: { share: PublicShareData }) {
  const dark = useDarkMode()
  const [photo, setPhoto] = useState<number | null>(null)
  // Link xem ảnh ký có hạn ~1 giờ; API không có `photos` (kho ảnh chưa cấu hình) thì hiện ô giữ chỗ theo số ảnh.
  const photos: PhotoItem[] = Array.from({ length: share.photo_count ?? 0 }, (_, i) => {
    const p = share.photos?.[i]
    return { id: `p${i}`, label: `[Ảnh ${i + 1}]`, url: p?.url, thumbUrl: p?.thumb_url, width: p?.width, height: p?.height }
  })
  const iconSetId = share.icon_set_id ?? ''
  // Trường không được chọn vắng mặt khỏi JSON (undefined), nên so bằng `!= null`.
  const score = share.score != null ? (share.score as Score) : null
  const sub = share.sub_icon ?? null
  const showIcons = score !== null || !!sub

  return (
    <PublicFrame title={share.title ? `${share.title} · Jotly` : 'Một trang nhật ký · Jotly'}>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-[clamp(16px,4vw,40px)] pt-10 pb-[72px] max-sm:gap-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-7">
        <div className="flex animate-rise flex-wrap items-center gap-2.5 max-sm:flex-nowrap max-sm:gap-2">
          {share.author_name ? (
            <>
              <Avatar name={share.author_name} size={36} className="max-sm:hidden" />
              <Avatar name={share.author_name} size={30} className="sm:hidden" />
            </>
          ) : null}
          <p className="text-body max-sm:min-w-0 max-sm:flex-1 max-sm:text-sm max-sm:leading-5">
            {share.author_name ? `${share.author_name} chia sẻ một trang nhật ký` : 'Một trang nhật ký được chia sẻ với bạn'}
          </p>
          <span className="shrink-0 rounded-full border-[1.5px] border-dashed border-line-soft px-2.5 py-0.5 text-label text-ink-soft max-sm:px-2 max-sm:py-px max-sm:text-[11px]">
            Chỉ xem
          </span>
        </div>

        <NotebookPage
          size="public"
          as="article"
          label={share.title ?? `Trang nhật ký ${longDateLabel(share.entry_date)}`}
          flag={share.flag_color ? flagHex(share.flag_color, dark) : null}
          className="animate-rise [animation-delay:100ms]"
          bodyClassName="flex flex-col gap-[18px] pt-[clamp(28px,4vw,40px)] pr-[clamp(20px,4vw,40px)] pb-10 pl-[clamp(64px,9vw,92px)] max-sm:gap-3.5 max-sm:py-6 max-sm:pr-4 max-sm:pl-[52px]"
        >
          {showIcons ? (
            <div className="flex">
              {score !== null ? (
                <span
                  role="img"
                  aria-label={`Điểm ${score}, ${scoreLabel(iconSetId, score)}`}
                  className="relative flex size-[104px] shrink-0 animate-pop items-center justify-center rounded-full border-[1.5px] border-stroke bg-card shadow-[3px_3px_0_var(--ink-shadow)] [animation-delay:750ms] max-sm:size-20"
                >
                  <ScoreIcon iconSetId={iconSetId} score={score} size={72} className="max-sm:hidden" />
                  <ScoreIcon iconSetId={iconSetId} score={score} size={56} className="sm:hidden" />
                  {sub ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-3.5 -bottom-1.5 flex size-12 items-center justify-center rounded-full border-[1.5px] border-stroke bg-card text-[28px] leading-none max-sm:-right-3 max-sm:size-[38px] max-sm:text-[22px]"
                    >
                      {sub}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-[72px] animate-pop items-center justify-center rounded-full border-[1.5px] border-stroke bg-card text-[40px] leading-none [animation-delay:750ms] max-sm:size-[60px] max-sm:text-[32px]"
                >
                  {sub}
                </span>
              )}
            </div>
            ) : null}

            <div className="flex animate-rise flex-col gap-2.5 [animation-delay:900ms] max-sm:gap-2">
            <p className="text-sm leading-[22px] text-ink-soft max-sm:text-[13px] max-sm:leading-5">
              {longDateLabel(share.entry_date)}
              {score !== null ? ` · Điểm ${score} · ${scoreLabel(iconSetId, score)}` : ''}
            </p>
            {share.title ? <h1 className="text-display text-balance">{share.title}</h1> : null}
            </div>

            {share.content ? (
            <div className="ruled flex animate-rise flex-col gap-8 text-reading leading-8 [animation-delay:1s] max-sm:gap-[30px] max-sm:leading-[30px]">
              {share.content.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
            ) : null}

            {share.keywords?.length ? (
            <ul aria-label="Từ khóa" className="flex animate-rise flex-wrap gap-2 [animation-delay:1.05s] max-sm:gap-1.5">
              {share.keywords.map((k) => (
                <li key={k}>
                  <KeywordChip>{k}</KeywordChip>
                </li>
              ))}
            </ul>
            ) : null}

            {photos.length ? (
            <section aria-labelledby="public-photos" className="flex flex-col gap-2.5">
              <h2 id="public-photos" className="text-sm leading-[22px] font-semibold">
                Ảnh · {photos.length}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-3 max-sm:grid-cols-2 max-sm:gap-2">
                {photos.map((p, i) => (
                  <PhotoTile
                    key={p.id}
                    photo={p}
                    index={i}
                    total={photos.length}
                    onOpen={() => setPhoto(i)}
                    className="rounded-[14px] max-sm:aspect-square"
                  />
                ))}
              </div>
            </section>
            ) : null}
        </NotebookPage>

        <p className="flex animate-rise items-start gap-2 text-[13px] leading-5 text-ink-soft [animation-delay:1.2s] max-sm:leading-[18px]">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Người viết chọn phần nào được hiện ở đây, và có thể tắt link bất cứ lúc nào.
        </p>

        <section className="reveal-on-scroll mt-8 max-sm:mt-3">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-[24px] border-[1.5px] border-stroke bg-primary p-[clamp(24px,4vw,36px)] text-on-primary shadow-accent transition-[transform,box-shadow] duration-(--dur-fast) ease-out pointer-fine:hover:-translate-x-0.5 pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-accent-lg motion-reduce:transform-none! max-sm:flex-col max-sm:items-stretch max-sm:gap-3.5 max-sm:rounded-[20px] max-sm:px-[18px] max-sm:py-[22px]">
            <div className="flex items-center gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-on-primary max-sm:size-12 max-sm:rounded-[14px]">
                <LogoMark size={36} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[22px] leading-[30px] font-bold [font-variation-settings:'FLAR'_60]">Chạm để ghi chú, mở để nhìn lại.</span>
                <span className="text-sm leading-[22px] opacity-80">Mỗi ngày một trang, riêng tư mặc định.</span>
              </div>
            </div>
            {/* B8/B10 dẫn nút này về trang giới thiệu, nơi có nút đăng nhập Google. */}
            <Link
              to="/"
              className={cn(
                'press inline-flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-on-primary bg-on-primary pr-5 pl-4 text-body font-semibold text-primary max-sm:justify-center',
                'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-peach',
              )}
            >
              <GoogleMark />
              Tiếp tục với Google
            </Link>
          </div>
        </section>
      </main>
      <PhotoViewer photos={photos} index={photo} onIndexChange={setPhoto} />
    </PublicFrame>
  )
}
