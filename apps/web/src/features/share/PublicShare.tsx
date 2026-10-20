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
  // Bước 7 có link xem ảnh có thời hạn; trước đó API chỉ báo số ảnh nên hiện ô giữ chỗ.
  const photos: PhotoItem[] = Array.from({ length: share.photo_count ?? 0 }, (_, i) => ({ id: `p${i}`, label: `[Ảnh ${i + 1}]` }))
  const hasFlag = !!share.flag_color
  const iconSetId = share.icon_set_id ?? ''
  // Trường không được chọn vắng mặt khỏi JSON (undefined), nên so bằng `!= null`.
  const score = share.score != null ? (share.score as Score) : null
  const showIcons = score !== null || !!share.sub_icon

  return (
    <PublicFrame title={share.title ? `${share.title} · Jotly` : 'Một trang nhật ký · Jotly'}>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-[clamp(16px,4vw,40px)] pt-10 pb-[72px]">
        <div className="flex animate-rise flex-wrap items-center gap-2.5">
          {share.author_name ? <Avatar name={share.author_name} size={36} /> : null}
          <p className="text-[15px] leading-6">
            {share.author_name ? `${share.author_name} chia sẻ một trang nhật ký` : 'Một trang nhật ký được chia sẻ với bạn'}
          </p>
          <span className="rounded-full border-[1.5px] border-dashed border-border px-2.5 py-0.5 text-xs leading-[18px] font-semibold text-muted-foreground">
            Chỉ xem
          </span>
        </div>

        <article className="animate-rise overflow-hidden rounded-[24px] border-[1.5px] border-line bg-card shadow-[5px_5px_0_var(--ink-shadow)] [animation-delay:.1s]">
          {hasFlag ? (
            <div className="h-[120px] overflow-hidden border-b-[1.5px] border-line bg-muted">
              <div
                className="h-full animate-in delay-450 duration-800 ease-[cubic-bezier(.6,0,.3,1)] fill-mode-backwards slide-in-from-left-full"
                style={{ backgroundColor: flagHex(share.flag_color!, dark) }}
              />
            </div>
          ) : null}
          <div className={cn('flex flex-col gap-[18px] px-[clamp(20px,4vw,40px)] pb-10', hasFlag ? 'pt-0' : 'pt-8')}>
            {showIcons ? (
              <div className={cn('flex', hasFlag && '-mt-[52px]')}>
                {score !== null ? (
                  <span
                    role="img"
                    aria-label={`Điểm ${score}, ${scoreLabel(iconSetId, score)}`}
                    className="flex size-[104px] animate-pop items-center justify-center rounded-full border-[1.5px] border-line bg-card [animation-delay:.75s]"
                  >
                    <MoodMark iconSetId={iconSetId} score={score} subIcon={share.sub_icon} size={76} />
                  </span>
                ) : (
                  <span className="flex size-[72px] animate-pop items-center justify-center rounded-full border-[1.5px] border-line bg-card text-[40px] leading-none [animation-delay:.75s]">
                    {share.sub_icon}
                  </span>
                )}
              </div>
            ) : null}

            <div className="flex animate-rise flex-col gap-1.5 [animation-delay:.9s]">
              <p className="text-sm leading-[22px] text-muted-foreground">
                {longDateLabel(share.entry_date)}
                {score !== null ? ` · Điểm ${score} · ${scoreLabel(iconSetId, score)}` : ''}
              </p>
              {share.title ? <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">{share.title}</h1> : null}
            </div>

            {share.content ? (
              <div className="ruled flex animate-rise flex-col gap-8 text-reading leading-8 [animation-delay:1s]">
                {share.content.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : null}

            {share.keywords?.length ? (
              <ul aria-label="Từ khóa" className="flex animate-rise flex-wrap gap-2 [animation-delay:1.05s]">
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-3">
                  {photos.map((p, i) => (
                    <PhotoTile key={p.id} photo={p} index={i} total={photos.length} onOpen={() => setPhoto(i)} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>

        <p className="flex animate-rise items-start gap-2 text-[13px] leading-5 text-muted-foreground [animation-delay:1.2s]">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Người viết chọn phần nào được hiện ở đây, và có thể tắt link bất cứ lúc nào.
        </p>

        <section className="reveal-on-scroll mt-8">
          <div className="group/band flex flex-wrap items-center justify-between gap-5 rounded-[24px] border-[1.5px] border-line bg-primary p-[clamp(24px,4vw,36px)] text-primary-foreground shadow-[5px_5px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-300 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_var(--cta-shadow)]">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-primary-foreground group-hover/band:[&_svg]:animate-wiggle">
                <LogoMark size={36} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-heading text-xl leading-7 font-bold">Chạm để ghi chú, mở để nhìn lại.</span>
                <span className="text-sm leading-[22px] opacity-80">Mỗi ngày một trang, riêng tư mặc định.</span>
              </div>
            </div>
            <Link
              to="/login"
              className={`press inline-flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-primary-foreground bg-primary-foreground pr-5 pl-4 text-[15px] font-semibold text-primary ${focusRing}`}
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
