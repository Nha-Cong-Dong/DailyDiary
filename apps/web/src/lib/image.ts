import { tierLimits } from './limits'

/**
 * Kiểm tra tệp ảnh trước khi tải lên (Project_Specs F-01, phần ảnh): chỉ nhận định dạng trong
 * `photos.allowed_types` (JPG, PNG, HEIC/HEIF, WebP), tối đa `photos.source_max_bytes` mỗi ảnh gốc.
 * Nén về WebP 1920 px (HEIC chuyển sang WebP ngay trên trình duyệt) và ảnh thu nhỏ 320 px có ở Bước 7.
 */
export type PhotoCheck = { ok: true } | { ok: false; reason: 'type' | 'size' }

const EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'image/webp': ['.webp'],
}

/**
 * Loại ảnh của tệp: lấy `type` của trình duyệt; nếu trống (thường gặp với ảnh HEIC từ iPhone trên
 * Chrome/Edge Windows) thì đoán theo đuôi tệp.
 */
export function photoType(file: Pick<File, 'name' | 'type'>): string {
  if (file.type) return file.type.replace(/-sequence$/, '')
  const name = file.name.toLowerCase()
  return Object.entries(EXTENSIONS).find(([, exts]) => exts.some((e) => name.endsWith(e)))?.[0] ?? ''
}

export function isHeic(file: Pick<File, 'name' | 'type'>): boolean {
  const t = photoType(file)
  return t === 'image/heic' || t === 'image/heif'
}

export function checkPhoto(file: Pick<File, 'name' | 'type' | 'size'>): PhotoCheck {
  const { allowed_types, source_max_bytes } = tierLimits().photos
  if (!allowed_types.includes(photoType(file))) return { ok: false, reason: 'type' }
  if (file.size > source_max_bytes) return { ok: false, reason: 'size' }
  return { ok: true }
}

/** Giá trị cho thuộc tính `accept` của ô chọn tệp, ví dụ "image/jpeg,.jpg,.jpeg,image/png,.png". */
export function photoAccept(): string {
  return tierLimits()
    .photos.allowed_types.flatMap((t) => [t, ...(EXTENSIONS[t] ?? [])])
    .join(',')
}

/** Tên định dạng cho người dùng đọc, ví dụ "JPG, PNG, HEIC, WebP" (HEIF gộp vào HEIC). */
export function photoFormatsLabel(): string {
  const names: Record<string, string> = {
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/heic': 'HEIC',
    'image/heif': 'HEIC',
    'image/webp': 'WebP',
  }
  return [...new Set(tierLimits().photos.allowed_types.map((t) => names[t] ?? t))].join(', ')
}

/** 10485760 → "10 MB". */
export function megabytesLabel(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1).replace('.', ',')} MB`
}
