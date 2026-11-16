import type { DateString } from '@/lib/date'
import { api, toApiError } from '@/api/client'
import { preparePhoto } from '@/lib/image'
import { toSharedPhoto, type SharedEntry } from './social'

/** Presigned shared-photo flow: browser prepares → PUTs both objects → API confirms metadata. */
function putBlob(url: string, blob: Blob, headers: Record<string, string>, onProgress: (ratio: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value))
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error('Storage upload failed'))
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))
    signal.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(blob)
  })
}

export function makeSharedPhotoUpload(journalId: string, day: DateString, onEntry?: (entry: SharedEntry) => void) {
  return async (file: File, onProgress: (ratio: number) => void, signal: AbortSignal) => {
    const prepared = await preparePhoto(file)
    signal.throwIfAborted()
    onProgress(0.2)
    const up = await api.POST('/journals/{journal_id}/photos/upload-url', {
      params: { path: { journal_id: journalId }, query: { day } },
      body: { content_type: prepared.type },
      signal,
    })
    if (up.error || !up.data) throw toApiError(up.response, up.error)
    const total = prepared.main.size + prepared.thumb.size
    await putBlob(up.data.upload_url, prepared.main, up.data.headers, (ratio) => onProgress(0.2 + 0.75 * ratio * prepared.main.size / total), signal)
    await putBlob(up.data.thumb_upload_url, prepared.thumb, up.data.headers, (ratio) => onProgress(0.2 + 0.75 * (prepared.main.size + ratio * prepared.thumb.size) / total), signal)
    const done = await api.POST('/journals/{journal_id}/photos', {
      params: { path: { journal_id: journalId }, query: { day } },
      body: { photo_id: up.data.photo_id, content_type: prepared.type, width: prepared.width, height: prepared.height },
      signal,
    })
    if (done.error || !done.data) throw toApiError(done.response, done.error)
    onProgress(1)
    onEntry?.(done.data)
    return done.data.photos.find((photo) => photo.id === up.data.photo_id) ? toSharedPhoto(done.data.photos.find((photo) => photo.id === up.data.photo_id)!) : toSharedPhoto(done.data.photos[done.data.photos.length - 1]!)
  }
}

export async function deleteSharedPhoto(photoId: string) {
  const { error, response } = await api.DELETE('/photos/{photo_id}', { params: { path: { photo_id: photoId } } })
  if (error && response.status !== 404) throw toApiError(response, error)
}

export async function reorderSharedPhotos(journalId: string, day: DateString, photoIds: string[]) {
  const { data, error, response } = await api.PATCH('/journals/{journal_id}/photos/order', {
    params: { path: { journal_id: journalId }, query: { day } },
    body: { photo_ids: photoIds },
  })
  if (error || !data) throw toApiError(response, error)
  return data
}
