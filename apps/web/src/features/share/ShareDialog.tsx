import { Check, Copy, Info, Link2, TriangleAlert, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useId, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { flagColors, scoreLabel } from '@/lib/catalog'
import { longDateLabel } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { SharePreview } from './components/SharePreview'
import { Toast } from './components/Toast'
import {
  availableParts,
  defaultSettings,
  displayUrl,
  hasContent,
  numericDate,
  PART_LABELS,
  partField,
  shapeOf,
  type PartKey,
  type ShareLink,
  type ShareSettings,
} from './shares'
import { useCopyLink } from './useCopyLink'
import { useRevokeShare, useSaveShare } from './useShares'

// Ô ảnh giữ chỗ cùng tông với PhotoTile (ảnh thật có ở Bước 7).
const TINTS = ['bg-[#E7DCEB]', 'bg-[#F6E3D6]', 'bg-[#DCE6D5]']

type ShareDialogProps = {
  entry: DemoEntry
  link: ShareLink | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function settingsOf(link: ShareLink | null): ShareSettings {
  if (!link) return defaultSettings()
  const { entry_date: _d, token: _t, url: _l, created_at: _c, updated_at: _u, ...settings } = link
  return settings
}

/**
 * Hộp thoại Chia sẻ một trang (thiết kế B8 · Chia sẻ): bật/tắt link, chọn từng phần người nhận được xem, xem trước.
 * Khi link đang bật, mỗi thay đổi được lưu ngay; tắt link thì link cũ hết hiệu lực, bật lại tạo link mới.
 */
export function ShareDialog({ entry, link, open, onOpenChange }: ShareDialogProps) {
  const { displayName, avatarUrl, iconSetId } = useProfile()
  const ids = useId()
  const save = useSaveShare(entry.entry_date)
  const revoke = useRevokeShare()
  const { copied, toast, copy } = useCopyLink()
  const shape = shapeOf(entry)
  // Bản đang chỉnh: lấy từ link khi mở hộp thoại; chưa bật link thì giữ cục bộ tới lúc bật.
  const [draft, setDraft] = useState<ShareSettings>(() => settingsOf(link))
  // Công tắc "Ảnh" tách khỏi danh sách ảnh đã chọn, để tắt rồi bật lại vẫn nhớ ảnh đã chọn.
  const [photosOn, setPhotosOn] = useState(() => (link ? link.photo_ids.length > 0 : false))
  const [picked, setPicked] = useState<string[]>(() => (link?.photo_ids.length ? link.photo_ids : entry.photos.map((p) => p.id)))
  const [justOff, setJustOff] = useState(false)

  const linkOn = !!link
  const settings: ShareSettings = { ...draft, photo_ids: photosOn ? picked : [] }
  const content = hasContent(settings, shape)
  const url = link?.url ?? null
  const parts = availableParts(shape)

  function apply(next: ShareSettings, nextPhotosOn = photosOn, nextPicked = picked) {
    setDraft(next)
    setPhotosOn(nextPhotosOn)
    setPicked(nextPicked)
    if (linkOn) save.mutate({ ...next, photo_ids: nextPhotosOn ? nextPicked : [] })
  }

  function togglePart(key: PartKey, on: boolean) {
    apply({ ...draft, [partField(key)]: on })
  }

  function setAll(on: boolean) {
    const next = { ...draft }
    for (const k of parts) next[partField(k)] = on
    const nextPicked = on && picked.length === 0 ? entry.photos.map((p) => p.id) : picked
    apply(next, on && shape.photos > 0, nextPicked)
  }

  function toggleLink(on: boolean) {
    if (on) {
      setJustOff(false)
      save.mutate(settings)
    } else {
      setJustOff(true)
      revoke.mutate(entry.entry_date)
    }
  }

  const linkDesc = linkOn
    ? 'Đang bật · ai có link đều xem được phần bạn chọn.'
    : justOff
      ? 'Đã tắt · link cũ không mở được nữa. Bật lại sẽ tạo link mới.'
      : 'Đang tắt · chỉ mình bạn xem được trang này.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-[24px] p-0 sm:max-w-[980px]"
      >
        <div className="flex items-start justify-between gap-4 border-b-[1.5px] border-dashed border-border py-5 pr-5 pl-7">
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="font-heading text-title-3 font-bold">Chia sẻ trang {numericDate(entry.entry_date)}</DialogTitle>
            <DialogDescription className="text-sm leading-[22px] text-muted-foreground">
              Chọn từng phần người nhận được xem. Họ chỉ xem, không sửa được.
            </DialogDescription>
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="outline" size="icon" aria-label="Đóng" className="press shrink-0 rounded-[12px] hover:[&_svg]:rotate-90 [&_svg]:transition-transform">
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        </div>

        <div className="flex min-h-0 flex-1 flex-wrap overflow-y-auto">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6 px-7 py-6">
            <section className="flex flex-col gap-3.5 rounded-[18px] border-[1.5px] border-line bg-background px-[18px] py-4">
              <div className="flex items-center gap-3.5">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border-[1.5px] border-line bg-card">
                  <Link2 className={cn('size-5 transition-transform duration-300', linkOn && '-rotate-45')} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span id={`${ids}-link`} className="text-[15px] leading-6 font-semibold">
                    Link chia sẻ
                  </span>
                  <span role="status" className="text-[13px] leading-5 text-muted-foreground">
                    {linkDesc}
                  </span>
                </div>
                <Switch
                  aria-labelledby={`${ids}-link`}
                  checked={linkOn}
                  disabled={revoke.isPending || (!linkOn && save.isPending)}
                  onCheckedChange={toggleLink}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <div
                  aria-label="Link chia sẻ"
                  className="flex h-11 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-[12px] border-[1.5px] border-line bg-card px-3.5 text-sm"
                >
                  <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {url ? (
                    <span key={url} className="animate-rise truncate tabular-nums select-all">
                      {displayUrl(url)}
                    </span>
                  ) : (
                    <span className="truncate text-muted-foreground">Bật link chia sẻ để tạo link</span>
                  )}
                </div>
                <Button
                  className="press min-w-32 rounded-[12px]"
                  disabled={!url || !content}
                  onClick={() => url && copy(url, 'dialog')}
                >
                  {copied === 'dialog' ? (
                    <Check className="size-[18px] animate-stamp" aria-hidden="true" />
                  ) : (
                    <Copy className="size-[18px]" aria-hidden="true" />
                  )}
                  {copied === 'dialog' ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
            </section>

            <section aria-labelledby={`${ids}-parts`} className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 id={`${ids}-parts`} className="font-sans text-[15px] leading-[22px] font-semibold">
                  Người nhận được xem
                </h3>
                <div className="flex shrink-0 gap-3.5 whitespace-nowrap">
                  <button type="button" className="link-underline cursor-pointer py-1 text-[13px] font-medium" onClick={() => setAll(true)}>
                    Chọn tất cả
                  </button>
                  <button type="button" className="link-underline cursor-pointer py-1 text-[13px] font-medium" onClick={() => setAll(false)}>
                    Bỏ hết
                  </button>
                </div>
              </div>
              <ul aria-label="Các phần được chia sẻ" className="flex flex-col rounded-[16px] border-[1.5px] border-line">
                <li className="flex min-h-[52px] items-center gap-3 border-b-[1.5px] border-dashed border-border px-4 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm leading-[22px] font-medium">Ngày viết</span>
                    <span className="text-xs leading-[18px] text-muted-foreground">{longDateLabel(entry.entry_date)}</span>
                  </span>
                  <span className="text-xs leading-[18px] font-semibold text-muted-foreground">Luôn hiện</span>
                </li>
                {parts.map((k) => (
                  <PartRow
                    key={k}
                    id={`${ids}-${k}`}
                    label={PART_LABELS[k]}
                    desc={partDesc(k, entry, displayName, iconSetId)}
                    checked={draft[partField(k)]}
                    onChange={(on) => togglePart(k, on)}
                  />
                ))}
                {shape.photos > 0 ? (
                  <li className="flex flex-col gap-2.5 px-4 py-2 transition-colors hover:bg-foreground/[0.035]">
                    <div className="flex min-h-9 items-center gap-3">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span id={`${ids}-photos`} className="text-sm leading-[22px] font-medium">
                          Ảnh
                        </span>
                        <span className="truncate text-xs leading-[18px] text-muted-foreground">
                          {photosOn ? `${picked.length}/${shape.photos} ảnh được chọn` : `${shape.photos} ảnh`}
                        </span>
                      </span>
                      <Switch aria-labelledby={`${ids}-photos`} checked={photosOn} onCheckedChange={(on) => apply(draft, on)} />
                    </div>
                    {photosOn ? (
                      <div role="group" aria-label="Chọn ảnh" className="flex animate-pop flex-wrap gap-2 pb-1.5">
                        {entry.photos.map((p, i) => {
                          const on = picked.includes(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              aria-label={`Chia sẻ ảnh ${i + 1}`}
                              aria-pressed={on}
                              onClick={() => apply(draft, true, on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
                              className={cn(
                                'relative flex h-[54px] w-[72px] cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] border-line text-[11px] text-[#6A6255] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-[3px] hover:-rotate-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95',
                                TINTS[i % TINTS.length],
                                on ? 'shadow-ink-sm' : 'opacity-45',
                              )}
                            >
                              {p.label}
                              {on ? (
                                <span aria-hidden="true" className="absolute -top-2 -right-2 flex size-[22px] animate-stamp items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="size-3" strokeWidth={3} />
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </li>
                ) : null}
              </ul>
              {!content ? (
                <p role="status" className="flex animate-pop items-center gap-2 rounded-[12px] border-[1.5px] border-destructive bg-destructive-soft px-3.5 py-2.5 text-[13px] leading-5">
                  <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                  Bật ít nhất một phần để có thể chia sẻ.
                </p>
              ) : null}
            </section>
          </div>

          <aside
            aria-labelledby={`${ids}-preview`}
            className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 border-t-[1.5px] border-dashed border-border bg-muted px-7 py-6 min-[820px]:border-t-0 min-[820px]:border-l-[1.5px]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 id={`${ids}-preview`} className="font-sans text-[15px] leading-[22px] font-semibold">
                Xem trước
              </h3>
              {link ? (
                <a href={`/s/${link.token}`} target="_blank" rel="noreferrer" className="link-underline text-[13px] leading-5 font-medium">
                  Mở như người nhận
                </a>
              ) : null}
            </div>
            <SharePreview entry={entry} settings={settings} authorName={displayName} avatarUrl={avatarUrl} iconSetId={iconSetId} />
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-border py-3.5 pr-5 pl-7">
          <span className="inline-flex items-center gap-2 text-[13px] leading-5 text-muted-foreground">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            {linkOn ? 'Thay đổi được lưu ngay. Người nhận thấy bản mới khi mở lại link.' : 'Chọn xong thì bật link để chia sẻ.'}
          </span>
          <DialogPrimitive.Close asChild>
            <Button className="press rounded-[12px] px-[22px]">Xong</Button>
          </DialogPrimitive.Close>
        </div>
      </DialogContent>
      <Toast text={toast} />
    </Dialog>
  )
}

function partDesc(key: PartKey, entry: DemoEntry, name: string, iconSetId: string): string {
  switch (key) {
    case 'name':
      return name
    case 'score':
      return `Điểm ${entry.score} · ${scoreLabel(iconSetId, entry.score)}`
    case 'sub_icon':
      return entry.sub_icon ?? ''
    case 'flag':
      return flagColors.find((f) => f.hex.toLowerCase() === entry.flag_color?.toLowerCase())?.name ?? ''
    case 'title':
      return entry.title ?? ''
    case 'content': {
      const n = entry.content?.split(/\n{2,}/).length ?? 0
      return `${n} đoạn`
    }
    case 'keywords':
      return entry.keywords.join(', ')
  }
}

function PartRow({
  id,
  label,
  desc,
  checked,
  onChange,
}: {
  id: string
  label: string
  desc: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <li className="flex min-h-[52px] items-center gap-3 border-b-[1.5px] border-dashed border-border px-4 py-2 transition-colors last:border-b-0 hover:bg-foreground/[0.035]">
      <span className="flex min-w-0 flex-1 flex-col">
        <span id={id} className="text-sm leading-[22px] font-medium">
          {label}
        </span>
        <span className="truncate text-xs leading-[18px] text-muted-foreground">{desc}</span>
      </span>
      <Switch aria-labelledby={id} checked={checked} onCheckedChange={onChange} />
    </li>
  )
}
