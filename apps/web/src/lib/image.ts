import { tierLimits } from './limits'

/**
 * Kiểm tra tệp ảnh trước khi tải lên (Project_Specs F-01, phần ảnh): chỉ nhận định dạng trong
 * `photos.allowed_types` (JPG, PNG, HEIC/HEIF, WebP), tối đa `photos.source_max_bytes` mỗi ảnh gốc.
 * Nén về WebP 1920 px (HEIC chuyển sang WebP ngay trên trình duyệt) và ảnh thu nhỏ 320 px: `preparePhoto`.
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

/** Ảnh đã nén sẵn để tải lên: ảnh chính + ảnh thu nhỏ cùng định dạng (backend kiểm tra cả hai). */
export type PreparedPhoto = { main: Blob; thumb: Blob; type: 'image/webp' | 'image/jpeg'; width: number; height: number }

const MB = 1024 * 1024

/**
 * HEIC → ảnh trình duyệt vẽ được. Safari giải mã sẵn; trình duyệt khác tải thư viện WASM (heic-to)
 * lần đầu gặp HEIC, không nằm trong bản tải ban đầu.
 */
async function decodable(file: File): Promise<Blob> {
  if (!isHeic(file)) return file
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close()
    return file
  } catch {
    const { heicTo } = await import('heic-to')
    return heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 })
  }
}

async function compressTo(
  source: Blob,
  type: 'image/webp' | 'image/jpeg',
  maxEdge: number,
  maxBytes: number,
  quality: number,
): Promise<Blob> {
  const { default: imageCompression } = await import('browser-image-compression')
  const file = source instanceof File ? source : new File([source], 'photo', { type: source.type })
  return imageCompression(file, {
    maxWidthOrHeight: maxEdge,
    maxSizeMB: maxBytes / MB,
    fileType: type,
    initialQuality: quality,
    // Bản worker của thư viện tải script từ CDN bên ngoài: không dùng, nén ngay trên luồng chính.
    useWebWorker: false,
  })
}

async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

/**
 * Nén WebP cạnh dài `main_max_edge_px` (~80%) + ảnh thu nhỏ `thumb_max_edge_px`, theo limits.json.
 * Trình duyệt không mã hóa được WebP (canvas trả PNG) thì dùng JPEG. Ảnh gốc không rời khỏi máy.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const p = tierLimits().photos
  const source = await decodable(file)
  let type: PreparedPhoto['type'] = 'image/webp'
  let main = await compressTo(source, type, p.main_max_edge_px, p.main_max_bytes, p.webp_quality)
  if (main.type !== 'image/webp') {
    type = 'image/jpeg'
    main = await compressTo(source, type, p.main_max_edge_px, p.main_max_bytes, p.webp_quality)
  }
  const thumb = await compressTo(main, type, p.thumb_max_edge_px, p.thumb_max_bytes, p.webp_quality)
  return { main, thumb, type, ...(await dimensions(main)) }
}

/** Ảnh đại diện: cắt vuông giữa ảnh, thu về `avatar_edge_px`, WebP (hoặc JPEG nếu trình duyệt không hỗ trợ). */
export async function prepareAvatar(file: File): Promise<{ blob: Blob; type: 'image/webp' | 'image/jpeg' }> {
  const { avatar_edge_px: edge, avatar_max_bytes } = tierLimits().profile
  const bitmap = await createImageBitmap(await decodable(file))
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = edge
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, edge, edge)
  bitmap.close()
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  let blob = await encode('image/webp')
  let type: 'image/webp' | 'image/jpeg' = 'image/webp'
  if (blob?.type !== 'image/webp') {
    type = 'image/jpeg'
    blob = await encode(type)
  }
  if (!blob || blob.size > avatar_max_bytes) throw new Error('Không nén được ảnh đại diện')
  return { blob, type }
}
