import { ImageUp } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Avatar } from '@/components/layout/Avatar'
import { Button } from '@/components/ui/button'
import { tierLimits } from '@/lib/limits'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']

type AvatarFieldProps = {
  name: string
  src: string | null
  onChange: (src: string | null) => void
}

/**
 * Đổi / gỡ ảnh đại diện (F-04). Giới hạn đọc từ shared/limits.json (profile.avatar_max_bytes, avatar_edge_px).
 * Bước 7 mới cắt 256×256 và tải lên kho ảnh; trước đó chỉ xem trước bằng URL tạm của trình duyệt, không gửi đi đâu.
 */
export function AvatarField({ name, src, onChange }: AvatarFieldProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { avatar_max_bytes, avatar_edge_px } = tierLimits().profile
  const maxMb = Math.round(avatar_max_bytes / 1024 / 1024)

  function pick(file: File | undefined) {
    if (!file) return
    if (!TYPES.includes(file.type)) return setError('Chỉ nhận ảnh JPG, PNG hoặc WebP.')
    if (file.size > avatar_max_bytes) return setError(`Ảnh lớn hơn ${maxMb} MB. Chọn ảnh nhỏ hơn.`)
    setError(null)
    if (src?.startsWith('blob:')) URL.revokeObjectURL(src)
    onChange(URL.createObjectURL(file))
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} src={src} size={88} className="font-heading text-[30px] font-bold shadow-ink-sm" />
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="h-10 px-3.5" onClick={() => input.current?.click()}>
            <ImageUp aria-hidden="true" /> Đổi ảnh
          </Button>
          {src ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10"
              onClick={() => {
                if (src.startsWith('blob:')) URL.revokeObjectURL(src)
                onChange(null)
              }}
            >
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
          accept={TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <span className={error ? 'text-[13px] leading-5 font-medium text-destructive' : 'text-[13px] leading-5 text-muted-foreground'} role={error ? 'alert' : undefined}>
          {error ?? `Ảnh vuông, JPG, PNG hoặc WebP, tối đa ${maxMb} MB (cắt về ${avatar_edge_px}×${avatar_edge_px} px).`}
        </span>
      </div>
    </div>
  )
}
