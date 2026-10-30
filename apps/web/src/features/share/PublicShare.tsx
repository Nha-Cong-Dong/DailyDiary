import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { KeywordChip } from '@/components/diary/KeywordChip'
import { MoodMark } from '@/components/diary/MoodMark'
import { PhotoTile, PhotoViewer, type PhotoItem } from '@/components/diary/PhotoViewer'
import { Avatar } from '@/components/layout/Avatar'
import { LogoMark } from '@/components/layout/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { longDateLabel } from '@/lib/date'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { PublicFrame } from './components/PublicFrame'
import { ShareOff } from './ShareOff'
import type { PublicShare as PublicShareData } from './shares'
import { usePublicShare } from './useShares'
import { GoogleMark } from '@/components/layout/GoogleMark'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring'

/** Trang người nhận link xem (thiết kế B8 · Chia sẻ · trang người nhận xem). Không cần đăng nhập, chỉ đọc. */
export function PublicShare({ token }: { token: string }) {
  const { data, isPending, isError } = usePublicShare(token)
  if (isPending) {
    return (
      <PublicFrame title="Jotly">
        <main className="flex flex-1 items-center justify-center p-10">
          <p role="status" className="text-muted-foreground">
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

function SharedPage({ share }: { share: PublicShareData }) {
  const dark = useDarkMode()
  const [photo, setPhoto] = useState<number | null>(null)
  // Link xem ảnh ký có hạn ~1 giờ; API không có `photos` (kho ảnh chưa cấu hình) thì hiện ô giữ chỗ theo số ảnh.
  const photos: PhotoItem[] = Array.from({ length: share.photo_count ?? 0 }, (_, i) => {
    const p = share.photos?.[i]
    return { id: `p${i}`, label: `[Ảnh ${i + 1}]`, url: p?.url, thumbUrl: p?.thumb_url, width: p?.width, height: p?.height }
  })
  const hasFlag = !!share.flag_color
  const iconSetId = share.icon_set_id ?? ''
  // Trường không được chọn vắng mặt khỏi JSON (undefined), nên so bằng `!= null`.
  const score = share.score != null ? (share.score as Score) : null
  const showIcons = score !== null || !!share.sub_icon

  return (
    <PublicFrame title={share.title ? `${share.title} · Jotly` : 'Một trang nhật ký · Jotly'}>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-[clamp(16px,4vw,40px)] pt-10 pb-[72px] max-sm:gap-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-7">
        <div className="flex animate-rise flex-wrap items-center gap-2.5 max-sm:gap-2">
          {share.author_name ? (
            <>
              <Avatar name={share.author_name} size={36} className="max-sm:hidden" />
              <Avatar name={share.author_name} size={30} className="sm:hidden" />
            </>
          ) : null}
          <p className="text-body leading-6 max-sm:min-w-0 max-sm:flex-1 max-sm:text-sm max-sm:leading-5">
            {share.author_name ? `${share.author_name} chia sẻ một trang nhật ký` : 'Một trang nhật ký được chia sẻ với bạn'}
          </p>
          <span className="rounded-full border-(length:--stroke-width) border-dashed border-border px-2.5 py-0.5 text-label leading-[18px] font-semibold text-muted-foreground max-sm:px-2 max-sm:py-px max-sm:text-[11px]">
            Chỉ xem
          </span>
        </div>

        <article className="animate-rise overflow-hidden rounded-[24px] border-(length:--stroke-width) border-line bg-card shadow-ink-lg [animation-delay:.1s] max-sm:rounded-[20px] max-sm:shadow-ink">
          {hasFlag ? (
            <div className="h-[120px] overflow-hidden border-b-(length:--stroke-width) border-line bg-muted max-sm:h-[88px]">
              <div
                className="h-full animate-in delay-450 duration-800 ease-move fill-mode-backwards slide-in-from-left-full"
                style={{ backgroundColor: flagHex(share.flag_color!, dark) }}
              />
            </div>
          ) : null}
          <div className={cn('flex flex-col gap-[18px] px-[clamp(20px,4vw,40px)] pb-10 max-sm:gap-3.5 max-sm:px-4 max-sm:pb-6', hasFlag ? 'pt-0' : 'pt-8 max-sm:pt-6')}>
            {showIcons ? (
              <div className={cn('flex', hasFlag && '-mt-[52px] max-sm:-mt-10')}>
                {score !== null ? (
                  <span
                    role="img"
                    aria-label={`Điểm ${score}, ${scoreLabel(iconSetId, score)}`}
                    className="flex size-[104px] animate-pop items-center justify-center rounded-full border-(length:--stroke-width) border-line bg-card [animation-delay:.75s] max-sm:size-20"
                  >
                    <span className="max-sm:hidden">
                      <MoodMark iconSetId={iconSetId} score={score} subIcon={share.sub_icon} size={76} />
                    </span>
                    <span className="sm:hidden">
                      <MoodMark iconSetId={iconSetId} score={score} subIcon={share.sub_icon} size={58} />
                    </span>
                  </span>
                ) : (
                  <span className="flex size-[72px] animate-pop items-center justify-center rounded-full border-(length:--stroke-width) border-line bg-card text-[40px] leading-none [animation-delay:.75s] max-sm:size-[60px] max-sm:text-[32px]">
                    {share.sub_icon}
                  </span>
                )}
              </div>
            ) : null}

            <div className="flex animate-rise flex-col gap-1.5 [animation-delay:.9s]">
              <p className="text-sm leading-[22px] text-muted-foreground max-sm:text-label max-sm:leading-5">
                {longDateLabel(share.entry_date)}
                {score !== null ? ` · Điểm ${score} · ${scoreLabel(iconSetId, score)}` : ''}
              </p>
              {share.title ? <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold max-sm:text-[25px] max-sm:leading-8">{share.title}</h1> : null}
            </div>

            {share.content ? (
              <div className="ruled flex animate-rise flex-col gap-8 text-reading leading-8 [animation-delay:1s] max-sm:gap-[30px] max-sm:text-reading max-sm:leading-[30px]">
                {share.content.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
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
                <h2 id="public-photos" className="font-sans text-sm leading-[22px] font-semibold">
                  Ảnh · {photos.length}
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-3 max-sm:grid-cols-2 max-sm:gap-2 max-sm:[&>button]:aspect-square">
                  {photos.map((p, i) => (
                    <PhotoTile key={p.id} photo={p} index={i} total={photos.length} onOpen={() => setPhoto(i)} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>

        <p className="flex animate-rise items-start gap-2 text-label leading-5 text-muted-foreground [animation-delay:1.2s] max-sm:text-label max-sm:leading-[18px]">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Người viết chọn phần nào được hiện ở đây, và có thể tắt link bất cứ lúc nào.
        </p>

        <section className="reveal-on-scroll mt-8 max-sm:mt-3">
          <div className="group/band flex flex-wrap items-center justify-between gap-5 rounded-[24px] border-(length:--stroke-width) border-line bg-primary p-[clamp(24px,4vw,36px)] text-primary-foreground shadow-accent transition-[transform,box-shadow] duration-300 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--cta-shadow)] max-sm:flex-col max-sm:items-stretch max-sm:gap-3.5 max-sm:rounded-[20px] max-sm:px-[18px] max-sm:py-[22px] max-sm:shadow-accent">
            <div className="flex items-center gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-primary-foreground max-sm:size-12 max-sm:rounded-[14px]">
                <LogoMark size={36} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-heading text-xl leading-7 font-bold">Chạm để ghi chú, mở để nhìn lại.</span>
                <span className="text-sm leading-[22px] opacity-80">Mỗi ngày một trang, riêng tư mặc định.</span>
              </div>
            </div>
            {/* Thiết kế B8/B10 dẫn nút này về trang giới thiệu, nơi có nút đăng nhập Google. */}
            <Link
              to="/"
              className={`press inline-flex h-12 items-center gap-2.5 rounded-[14px] border-(length:--stroke-width) border-primary-foreground bg-primary-foreground pr-5 pl-4 text-body font-semibold text-primary max-sm:justify-center ${focusRing}`}
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
