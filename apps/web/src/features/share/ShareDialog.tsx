import { Check, ChevronDown, Copy, Info, Link2, TriangleAlert, X } from 'lucide-react'
import { useId, useState } from 'react'
import { BottomSheet, SheetClose, SheetDescription, SheetTitle } from '@/components/diary/BottomSheet'
import { Toast } from '@/components/diary/Toast'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { flagName, scoreLabel } from '@/lib/catalog'
import { longDateLabel } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { SharePreview } from './components/SharePreview'
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
  const revoke = useRevokeShare(entry.entry_date)
  const { copied, toast, copy } = useCopyLink()
  const shape = shapeOf(entry)
  // Bản đang chỉnh: lấy từ link khi mở hộp thoại; chưa bật link thì giữ cục bộ tới lúc bật.
  const [draft, setDraft] = useState<ShareSettings>(() => settingsOf(link))
  // Công tắc "Ảnh" tách khỏi danh sách ảnh đã chọn, để tắt rồi bật lại vẫn nhớ ảnh đã chọn.
  const [photosOn, setPhotosOn] = useState(() => (link ? link.photo_ids.length > 0 : false))
  const [picked, setPicked] = useState<string[]>(() => (link?.photo_ids.length ? link.photo_ids : entry.photos.map((p) => p.id)))
  const [justOff, setJustOff] = useState(false)
  // Điện thoại (thiết kế B10): xem trước gập lại, bấm để mở.
  const [previewOpen, setPreviewOpen] = useState(false)

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
    <>
      {/* Máy tính: hộp thoại 980 px; điện thoại: bảng trượt (chạm vùng tối phía trên để đóng). */}
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        layout="responsive"
        bare
        description="Chọn từng phần người nhận được xem."
        className="gap-0 px-0 pt-0 pb-0 md:gap-0 md:overflow-hidden md:rounded-[24px] md:p-0 md:max-w-[min(980px,calc(100%-2rem))]"
      >
        <div className="flex items-start justify-between gap-4 border-b-[1.5px] border-dashed border-border py-5 pr-5 pl-7 max-md:border-b-0 max-md:px-4 max-md:pt-4 max-md:pb-0">
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="font-heading text-title-3 font-bold max-md:text-xl max-md:leading-7">
              Chia sẻ trang {numericDate(entry.entry_date)}
            </SheetTitle>
            <SheetDescription className="text-sm leading-[22px] text-muted-foreground max-md:text-[13px] max-md:leading-5">
              <span className="max-md:hidden">Chọn từng phần người nhận được xem. Họ chỉ xem, không sửa được.</span>
              <span className="md:hidden">Người nhận chỉ xem, không sửa được.</span>
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="outline" size="icon" aria-label="Đóng" className="press shrink-0 rounded-[12px] hover:[&_svg]:rotate-90 [&_svg]:transition-transform max-md:hidden">
              <X aria-hidden="true" />
            </Button>
          </SheetClose>
        </div>

        {/* Từ 880 px: hai cột cuộn riêng, cột xem trước đứng yên khi danh sách dài (hàng Ảnh không bị chân hộp che). */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto max-md:flex-none max-md:overflow-visible min-[880px]:grid min-[880px]:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] min-[880px]:grid-rows-[minmax(0,1fr)] min-[880px]:overflow-hidden">
          <div className="flex min-w-0 flex-col gap-6 px-7 py-6 max-md:gap-4 max-md:px-4 max-md:pt-4 max-md:pb-0 min-[880px]:min-h-0 min-[880px]:overflow-y-auto">
            <section className="flex flex-col gap-3.5 rounded-[18px] border-[1.5px] border-line bg-background px-[18px] py-4 max-md:gap-3 max-md:rounded-[16px] max-md:px-3.5 max-md:py-3">
              <div className="flex items-center gap-3.5 max-md:gap-3">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border-[1.5px] border-line bg-card max-md:hidden">
                  <Link2 className={cn('size-5 transition-transform duration-300', linkOn && '-rotate-45')} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span id={`${ids}-link`} className="text-[15px] leading-6 font-semibold">
                    Link chia sẻ
                  </span>
                  <span role="status" className="text-[13px] leading-5 text-muted-foreground max-md:text-xs max-md:leading-[18px]">
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
              <div className="flex flex-wrap gap-2 max-md:flex-nowrap">
                <div
                  aria-label="Link chia sẻ"
                  className="flex h-11 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-[12px] border-[1.5px] border-line bg-card px-3.5 text-sm max-md:flex-1 max-md:px-3"
                >
                  <Link2 className="size-4 shrink-0 text-muted-foreground max-md:hidden" aria-hidden="true" />
                  {url ? (
                    <span key={url} className="animate-rise truncate tabular-nums select-all">
                      {displayUrl(url)}
                    </span>
                  ) : (
                    <span className="truncate text-muted-foreground">
                      <span className="max-md:hidden">Bật link chia sẻ để tạo link</span>
                      <span className="md:hidden">Bật để tạo link</span>
                    </span>
                  )}
                </div>
                <Button
                  className="press min-w-32 rounded-[12px] max-md:w-[104px] max-md:min-w-0 max-md:shrink-0 max-md:gap-1.5 max-md:px-0"
                  disabled={!url || !content}
                  onClick={() => url && copy(url, 'dialog')}
                >
                  {copied === 'dialog' ? (
                    <Check className="size-[18px] animate-stamp" aria-hidden="true" />
                  ) : (
                    <Copy className="size-[18px] max-md:hidden" aria-hidden="true" />
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
                  <button
                    type="button"
                    aria-label="Chọn tất cả"
                    className="link-underline cursor-pointer py-1 text-[13px] font-medium"
                    onClick={() => setAll(true)}
                  >
                    <span className="max-md:hidden">Chọn tất cả</span>
                    <span className="md:hidden">Tất cả</span>
                  </button>
                  <button type="button" className="link-underline cursor-pointer py-1 text-[13px] font-medium" onClick={() => setAll(false)}>
                    Bỏ hết
                  </button>
                </div>
              </div>
              <ul aria-label="Các phần được chia sẻ" className="flex flex-col rounded-[16px] border-[1.5px] border-line">
                <li className="flex min-h-[52px] items-center gap-3 border-b-[1.5px] border-dashed border-border px-4 py-2 max-md:px-3.5 max-md:py-1.5">
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
                  <li className="flex flex-col gap-2.5 px-4 py-2 transition-colors hover:bg-foreground/[0.035] max-md:gap-2 max-md:px-3.5 max-md:py-1.5">
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
                                'relative flex h-[54px] w-[72px] cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] border-line text-[11px] text-[#6A6255] transition-[transform,opacity,box-shadow] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[.97]',
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
                <p role="status" className="flex animate-pop items-center gap-2 rounded-[12px] border-[1.5px] border-destructive bg-destructive-soft px-3.5 py-2.5 text-[13px] leading-5 max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:text-destructive">
                  <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                  Bật ít nhất một phần để có thể chia sẻ.
                </p>
              ) : null}
            </section>

            <button
              type="button"
              aria-expanded={previewOpen}
              aria-controls={`${ids}-preview-panel`}
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex h-11 cursor-pointer items-center justify-between rounded-[12px] border-[1.5px] border-dashed border-border bg-muted px-3.5 text-sm font-semibold transition-colors active:bg-foreground/5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            >
              {previewOpen ? 'Ẩn xem trước' : 'Xem trước'}
              <ChevronDown className={cn('size-4 transition-transform duration-200', previewOpen && 'rotate-180')} aria-hidden="true" />
            </button>
          </div>

          <aside
            id={`${ids}-preview-panel`}
            aria-labelledby={`${ids}-preview`}
            className={cn(
              'flex min-w-0 flex-col gap-3.5 border-t-[1.5px] border-dashed border-border bg-muted px-7 py-6 min-[880px]:min-h-0 min-[880px]:overflow-y-auto min-[880px]:border-t-0 min-[880px]:border-l-[1.5px]',
              'max-md:border-t-0 max-md:bg-transparent max-md:px-4 max-md:pt-4 max-md:pb-0',
              !previewOpen && 'max-md:hidden',
            )}
          >
            <div className="flex items-baseline justify-between gap-3 max-md:sr-only">
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

        {/* Điện thoại: nút Xong rộng hết bảng và lối mở như người nhận ngay dưới. */}
        <div className="flex flex-col gap-4 px-4 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] md:hidden">
          <SheetClose asChild>
            <Button className="press h-[50px] rounded-[14px] text-[15px]">Xong</Button>
          </SheetClose>
          {link ? (
            <a href={`/s/${link.token}`} target="_blank" rel="noreferrer" className="link-underline self-center text-[13px] font-medium">
              Mở như người nhận
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-border py-3.5 pr-5 pl-7 max-md:hidden">
          <span className="inline-flex items-center gap-2 text-[13px] leading-5 text-muted-foreground">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            {linkOn ? 'Thay đổi được lưu ngay. Người nhận thấy bản mới khi mở lại link.' : 'Chọn xong thì bật link để chia sẻ.'}
          </span>
          <SheetClose asChild>
            <Button className="press rounded-[12px] px-[22px]">Xong</Button>
          </SheetClose>
        </div>
      </BottomSheet>
      <Toast>{toast}</Toast>
    </>
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
      return flagName(entry.flag_color) ?? ''
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
