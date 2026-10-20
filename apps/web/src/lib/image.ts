import { tierLimits } from './limits'

/**
 * Kiểm tra tệp ảnh trước khi tải lên (Project_Specs F-01, phần ảnh): chỉ nhận định dạng trong
 * `photos.allowed_types`, tối đa `photos.source_max_bytes` mỗi ảnh gốc, HEIC báo lỗi riêng cho rõ.
 * Nén về WebP 1920 px và tạo ảnh thu nhỏ 320 px có ở Bước 7.
 */
export type PhotoCheck = { ok: true } | { ok: false; reason: 'heic' | 'type' | 'size' }

const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']
const EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export function checkPhoto(file: Pick<File, 'name' | 'type' | 'size'>): PhotoCheck {
  const { allowed_types, source_max_bytes } = tierLimits().photos
  const name = file.name.toLowerCase()
  // Một số trình duyệt để trống `type` với ảnh HEIC từ iPhone, nên xét cả đuôi tệp.
  if (HEIC_TYPES.includes(file.type) || name.endsWith('.heic') || name.endsWith('.heif')) return { ok: false, reason: 'heic' }
  if (!allowed_types.includes(file.type)) return { ok: false, reason: 'type' }
  if (file.size > source_max_bytes) return { ok: false, reason: 'size' }
  return { ok: true }
}

/** Giá trị cho thuộc tính `accept` của ô chọn tệp, ví dụ "image/jpeg,.jpg,.jpeg,image/png,.png". */
export function photoAccept(): string {
  return tierLimits()
    .photos.allowed_types.flatMap((t) => [t, ...(EXTENSIONS[t] ?? [])])
    .join(',')
}

/** Tên định dạng cho người dùng đọc, ví dụ "JPG, PNG, WebP". */
export function photoFormatsLabel(): string {
  const names: Record<string, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' }
  return tierLimits()
    .photos.allowed_types.map((t) => names[t] ?? t)
    .join(', ')
}

/** 10485760 → "10 MB". */
export function megabytesLabel(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1).replace('.', ',')} MB`
}
