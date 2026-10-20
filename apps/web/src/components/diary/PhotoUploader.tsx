import { Image, ImageOff, ImagePlus, RotateCw, X } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { megabytesLabel, photoAccept, photoFormatsLabel } from '@/lib/image'
import { tierLimits } from '@/lib/limits'
import { cn } from '@/lib/utils'
import { PHOTO_TINTS } from './photoTints'
import { countsTowardLimit, type PhotoUploads, type UploadTile } from './usePhotoUploads'

const tileBase =
  'group relative flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] text-center'
const caption = 'text-xs leading-[18px]'

/** Vòng tiến độ quanh biểu tượng ảnh (thiết kế B9 · Tải ảnh lên). */
function ProgressRing({ progress }: { progress: number }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="-rotate-90">
      <circle cx="20" cy="20" r="15" strokeWidth="4" className="stroke-[#FFFCF8]/70" />
      <circle
        cx="20"
        cy="20"
        r="15"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
        className="stroke-[#272218] transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}

function RejectedText({ reason }: { reason: 'heic' | 'type' | 'size' }) {
  const max = megabytesLabel(tierLimits().photos.source_max_bytes)
  const [title, detail] =
    reason === 'size' ? ['Ảnh quá lớn', `Quá ${max}`] : reason === 'heic' ? ['Ảnh HEIC', 'Chưa hỗ trợ'] : ['Sai định dạng', 'Không hỗ trợ']
  return (
    <>
      <ImageOff className="size-5 text-destructive" aria-hidden="true" />
      <span className={cn(caption, 'font-semibold')}>{title}</span>
      <span className={cn(caption, 'text-muted-foreground')}>{detail}</span>
    </>
  )
}

function Tile({ tile, index, onRemove, onRetry }: { tile: UploadTile; index: number; onRemove: () => void; onRetry: () => void }) {
  const tint = PHOTO_TINTS[index % PHOTO_TINTS.length]
  const preview = tile.status !== 'rejected' ? tile.previewUrl : undefined
  const name = tile.status === 'done' ? tile.photo.label : tile.status === 'rejected' ? tile.name : tile.file.name
  return (
    <li
      className={cn(
        tileBase,
        'animate-pop overflow-hidden transition-transform duration-200 ease-[cubic-bezier(.3,1.4,.5,1)] hover:[transform:rotate(-2deg)_translateY(-3px)]',
        tile.status === 'rejected'
          ? 'border-dashed border-destructive bg-destructive-soft p-1.5'
          : tile.status === 'failed'
            ? 'border-dashed border-line bg-muted p-1.5'
            : cn('border-line text-[#6A6255]', !preview && tint),
      )}
    >
      {preview ? <img src={preview} alt={name} className="absolute inset-0 size-full object-cover" /> : null}
      {tile.status === 'done' && !preview ? (
        <>
          <Image className="size-6" aria-hidden="true" />
          <span className={cn(caption, 'max-w-full truncate px-1.5')}>{tile.photo.label}</span>
        </>
      ) : null}
      {tile.status === 'uploading' ? (
        <span className="relative flex flex-col items-center gap-1 rounded-[10px] bg-[#FFFCF8]/75 px-1.5 py-1 text-[#6A6255]">
          <ProgressRing progress={tile.progress} />
          <span role="status" className={caption}>
            Đang tải…
          </span>
        </span>
      ) : null}
      {tile.status === 'failed' ? (
        <>
          <span className={cn(caption, 'font-semibold')}>Lỗi mạng</span>
          <button
            type="button"
            onClick={onRetry}
            aria-label={`Thử tải lại ảnh ${name}`}
            className="press inline-flex h-7 cursor-pointer items-center gap-1 rounded-sm border-[1.5px] border-line bg-card px-2.5 text-xs font-semibold focus-visible:outline-3 focus-visible:outline-ring"
          >
            <RotateCw className="size-3" aria-hidden="true" />
            Thử lại
          </button>
        </>
      ) : null}
      {tile.status === 'rejected' ? <RejectedText reason={tile.reason} /> : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ ảnh ${name}`}
        className={cn(
          'absolute top-1 right-1 flex size-7 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-line bg-card text-foreground transition-[opacity,transform] hover:scale-110 focus-visible:opacity-100 focus-visible:outline-3 focus-visible:outline-ring',
          // Ô lỗi luôn hiện nút bỏ; ô ảnh chỉ hiện khi rê chuột (máy cảm ứng thì luôn hiện).
          tile.status === 'rejected' || tile.status === 'failed'
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </li>
  )
}

type PhotoUploaderProps = {
  uploads: PhotoUploads
  /** Id của tiêu đề nhóm ảnh, để khung kéo thả có nhãn. */
  labelledBy?: string
  className?: string
}

/**
 * Ô ảnh trong một trang (thiết kế B9 · Tải ảnh lên): Thêm ảnh hoặc kéo tệp vào khung, mỗi ô có trạng thái
 * đang tải / xong / lỗi mạng (thử lại) / quá lớn / sai định dạng; đủ ảnh thì ô Thêm ảnh chuyển xám.
 */
export function PhotoUploader({ uploads, labelledBy, className }: PhotoUploaderProps) {
  const { per_day_max, source_max_bytes } = tierLimits().photos
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const count = uploads.tiles.filter(countsTowardLimit).length
  const full = count >= per_day_max
  const rejected = uploads.tiles.some((t) => t.status === 'rejected')

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) uploads.addFiles(files)
  }

  const note = uploads.note
    ? uploads.note
    : full
      ? `Đã đủ ${per_day_max} ảnh. Bỏ bớt ảnh để thêm ảnh mới.`
      : rejected
        ? `Chỉ nhận ${photoFormatsLabel()}, mỗi ảnh tối đa ${megabytesLabel(source_max_bytes)}. Bấm × để bỏ ô báo lỗi.`
        : 'Jotly lưu bản đã nén; ảnh gốc vẫn nằm trên máy của bạn.'

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div
        role="group"
        aria-labelledby={labelledBy}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!full) setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
          setDragging(false)
        }}
        onDrop={onDrop}
        className={cn(
          '-m-2 rounded-[18px] border-[1.5px] p-2 transition-colors',
          dragging
            ? 'border-line bg-[repeating-linear-gradient(90deg,rgb(241_189_144/.28)_0_14px,transparent_14px_28px)]'
            : 'border-transparent',
        )}
      >
        <ul className="flex flex-wrap gap-3">
          {uploads.tiles.map((tile, i) => (
            <Tile key={tile.key} tile={tile} index={i} onRemove={() => uploads.remove(tile.key)} onRetry={() => uploads.retry(tile.key)} />
          ))}
          <li>
            {full ? (
              <span className={cn(tileBase, 'border-dashed border-disabled-line bg-disabled p-1.5 text-disabled-foreground')}>
                <ImagePlus className="size-5" aria-hidden="true" />
                <span className={cn(caption, 'font-semibold')}>
                  Đủ {per_day_max}/{per_day_max}
                </span>
              </span>
            ) : (
              <>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="file"
                  multiple
                  accept={photoAccept()}
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    if (files.length) uploads.addFiles(files)
                  }}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    tileBase,
                    'cursor-pointer border-dashed border-line bg-transparent transition-transform duration-200 hover:-translate-y-[3px] hover:bg-card focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
                    dragging && 'border-solid bg-card',
                  )}
                >
                  <ImagePlus className="size-6" aria-hidden="true" />
                  <span className="text-[13px] leading-[18px] font-medium">{dragging ? 'Thả ảnh vào đây' : 'Thêm ảnh'}</span>
                </button>
              </>
            )}
          </li>
        </ul>
      </div>
      <p role="status" className="min-h-5 text-[13px] leading-5 text-muted-foreground">
        {note}
      </p>
    </div>
  )
}
