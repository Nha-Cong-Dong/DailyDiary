import { ImageUp } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Avatar } from '@/components/layout/Avatar'
import { Button } from '@/components/ui/button'
import { checkPhoto, megabytesLabel, photoAccept, photoFormatsLabel } from '@/lib/image'
import { tierLimits } from '@/lib/limits'

type AvatarFieldProps = {
  name: string
  src: string | null
  /** Đang tải ảnh mới lên. */
  busy?: boolean
  /** Lỗi tải lên từ màn cha (mạng, máy chủ từ chối). */
  uploadError?: string | null
  onPick: (file: File) => void
  onRemove: () => void
}

/**
 * Đổi / gỡ ảnh đại diện (F-04). Ảnh chọn được cắt vuông `profile.avatar_edge_px` và nén trên trình duyệt
 * (lib/image.ts, prepareAvatar) rồi mới tải lên; nhận cùng định dạng và dung lượng gốc như ảnh nhật ký.
 */
export function AvatarField({ name, src, busy, uploadError, onPick, onRemove }: AvatarFieldProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { avatar_edge_px } = tierLimits().profile
  const maxSource = megabytesLabel(tierLimits().photos.source_max_bytes)
  const shown = error ?? uploadError ?? null

  function pick(file: File | undefined) {
    if (!file) return
    const check = checkPhoto(file)
    if (check.ok === false) {
      return setError(check.reason === 'type' ? `Chỉ nhận ảnh ${photoFormatsLabel()}.` : `Ảnh lớn hơn ${maxSource}. Chọn ảnh nhỏ hơn.`)
    }
    setError(null)
    onPick(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} src={src} size={88} className="font-heading text-[30px] font-bold shadow-ink-sm" />
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="h-10 px-3.5" disabled={busy} onClick={() => input.current?.click()}>
            <ImageUp aria-hidden="true" /> {busy ? 'Đang tải ảnh…' : 'Đổi ảnh'}
          </Button>
          {src && !busy ? (
            <Button variant="ghost" size="sm" className="h-10" onClick={onRemove}>
              Gỡ ảnh
            </Button>
          ) : null}
        </div>
        <label htmlFor={id} className="sr-only">
          Chọn ảnh đại diện
        </label>
        <input
          ref={input}
          id={id}
          type="file"
          accept={photoAccept()}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <span
          className={shown ? 'text-label leading-5 font-medium text-destructive' : 'text-label leading-5 text-muted-foreground'}
          role={shown ? 'alert' : undefined}
        >
          {shown ?? `${photoFormatsLabel()}, tối đa ${maxSource}. Jotly cắt vuông ${avatar_edge_px}×${avatar_edge_px} px.`}
        </span>
      </div>
    </div>
  )
}
