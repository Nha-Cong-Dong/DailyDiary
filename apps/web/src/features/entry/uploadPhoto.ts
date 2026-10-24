import { api, toApiError } from '@/api/client'
import type { UploadPhoto } from '@/components/diary/usePhotoUploads'
import { track } from '@/lib/analytics'
import type { DateString } from '@/lib/date'
import { preparePhoto } from '@/lib/image'
import { toDayEntry, type DayEntry, type EntryOut } from './entries'

/**
 * Ảnh của một ngày qua API (Bước 7). Tải một ảnh:
 * nén trên trình duyệt (WebP 1920 px + ảnh thu nhỏ 320 px, HEIC chuyển ngay trên máy) → POST upload-url
 * → PUT thẳng lên kho bằng presigned URL (không qua backend, không kèm cookie) → POST /entries/{date}/photos.
 * Thêm/xóa/sắp xếp ảnh không đổi `updated_at` của trang, nên không làm tự động lưu chữ bị 409.
 */

/** PUT lên presigned URL bằng XHR để có tiến độ tải lên (fetch chưa báo được). */
function putBlob(url: string, blob: Blob, headers: Record<string, string>, onProgress: (ratio: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    // Chỉ gửi đúng header đã ký (Content-Type); header lạ làm chữ ký sai → 403.
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Kho ảnh trả ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('Lỗi mạng khi tải ảnh'))
    xhr.onabort = () => reject(new DOMException('Đã hủy', 'AbortError'))
    signal.addEventListener('abort', () => xhr.abort())
    xhr.send(blob)
  })
}

/**
 * Hàm tải ảnh cho `usePhotoUploads`. Xác nhận xong gọi `onEntry` với trang mới (để cập nhật cache).
 * Tiến độ: nén 0–20%, tải lên 20–95%, xác nhận tới 100%.
 */
export function makeUploadPhoto(date: DateString, onEntry?: (entry: DayEntry) => void): UploadPhoto {
  return async (file, onProgress, signal) => {
    const prepared = await preparePhoto(file)
    signal.throwIfAborted()
    onProgress(0.2)
    const up = await api.POST('/entries/{day}/photos/upload-url', {
      params: { path: { day: date } },
      body: { content_type: prepared.type },
      signal,
    })
    if (up.error || !up.data) throw toApiError(up.response, up.error)
    const { photo_id, upload_url, thumb_upload_url, headers } = up.data
    const total = prepared.main.size + prepared.thumb.size
    await putBlob(upload_url, prepared.main, headers, (r) => onProgress(0.2 + (0.75 * r * prepared.main.size) / total), signal)
    await putBlob(
      thumb_upload_url,
      prepared.thumb,
      headers,
      (r) => onProgress(0.2 + (0.75 * (prepared.main.size + r * prepared.thumb.size)) / total),
      signal,
    )
    const done = await api.POST('/entries/{day}/photos', {
      params: { path: { day: date } },
      body: { photo_id, content_type: prepared.type, width: prepared.width, height: prepared.height },
      signal,
    })
    if (done.error || !done.data) throw toApiError(done.response, done.error)
    track('photo_uploaded')
    onProgress(1)
    const entry = toDayEntry(done.data)
    onEntry?.(entry)
    return entry.photos.find((p) => p.id === photo_id)!
  }
}

export async function deletePhoto(photoId: string): Promise<void> {
  const { error, response } = await api.DELETE('/photos/{photo_id}', { params: { path: { photo_id: photoId } } })
  // 404: ảnh đã bị xóa ở tab khác — coi như xong.
  if (error && response.status !== 404) throw toApiError(response, error)
}

export async function reorderPhotos(date: DateString, photoIds: string[]): Promise<EntryOut> {
  const { data, error, response } = await api.PATCH('/entries/{day}/photos/order', {
    params: { path: { day: date } },
    body: { photo_ids: photoIds },
  })
  if (error || !data) throw toApiError(response, error)
  return data
}
