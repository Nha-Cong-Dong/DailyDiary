import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { checkPhoto, isHeic } from '@/lib/image'
import { tierLimits } from '@/lib/limits'
import type { PhotoItem } from './PhotoViewer'

/** Tải một ảnh lên; gọi `onProgress` với 0–1, trả ảnh đã lưu (features/entry/uploadPhoto.ts). */
export type UploadPhoto = (file: File, onProgress: (ratio: number) => void, signal: AbortSignal) => Promise<PhotoItem>

export type UploadTile =
  | { key: string; status: 'done'; photo: PhotoItem; previewUrl?: string }
  | { key: string; status: 'uploading'; file: File; previewUrl?: string; progress: number }
  | { key: string; status: 'failed'; file: File; previewUrl?: string }
  | { key: string; status: 'rejected'; name: string; reason: RejectReason }

/**
 * Lý do một ảnh không vào trang. Trên máy: `type` sai định dạng, `size` quá lớn. Máy chủ từ chối (422):
 * `quota` hết dung lượng (STORAGE_QUOTA), `photo_limit` trang đã đủ ảnh (ENTRY_LIMIT_PHOTOS, vd. thêm ở tab khác).
 * Thử lại cũng không qua nên không có nút Thử lại, khác lỗi mạng.
 */
export type RejectReason = 'type' | 'size' | 'quota' | 'photo_limit'

/** Lỗi tải ảnh mà máy chủ từ chối vì hạn mức; lỗi khác (mạng, kho ảnh…) trả null để còn thử lại. */
export function serverRejection(error: unknown): Extract<RejectReason, 'quota' | 'photo_limit'> | null {
  if (!(error instanceof ApiError)) return null
  if (error.code === 'STORAGE_QUOTA') return 'quota'
  if (error.code === 'ENTRY_LIMIT_PHOTOS') return 'photo_limit'
  return null
}

/** Ô bị từ chối (sai định dạng, quá lớn, hết dung lượng, đủ ảnh) không tính vào số ảnh của trang. */
export function countsTowardLimit(tile: UploadTile): boolean {
  return tile.status !== 'rejected'
}

export function donePhotos(tiles: UploadTile[]): PhotoItem[] {
  return tiles.flatMap((t) => (t.status === 'done' ? [t.photo] : []))
}

/**
 * Xếp các tệp mới vào danh sách: tệp hỏng thành ô báo lỗi, tệp hợp lệ thành ô "đang tải" nếu còn chỗ.
 * Trả thêm số tệp hợp lệ bị bỏ vì trang đã đủ ảnh.
 */
export function planAdd(
  tiles: UploadTile[],
  files: File[],
  makeKey: () => string,
  max = tierLimits().photos.per_day_max,
): { tiles: UploadTile[]; started: Extract<UploadTile, { status: 'uploading' }>[]; skipped: number } {
  let room = max - tiles.filter(countsTowardLimit).length
  const next = [...tiles]
  const started: Extract<UploadTile, { status: 'uploading' }>[] = []
  let skipped = 0
  for (const file of files) {
    const check = checkPhoto(file)
    if (check.ok === false) {
      next.push({ key: makeKey(), status: 'rejected', name: file.name, reason: check.reason })
      continue
    }
    if (room <= 0) {
      skipped++
      continue
    }
    room--
    const tile = { key: makeKey(), status: 'uploading' as const, file, progress: 0 }
    next.push(tile)
    started.push(tile)
  }
  return { tiles: next, started, skipped }
}

function previewOf(file: File): string | undefined {
  // HEIC: Chrome/Edge/Firefox không vẽ được trong <img> nên để ô màu kèm tên tệp; xong thì hiện ảnh thu nhỏ.
  if (isHeic(file)) return undefined
  // jsdom (test) không có createObjectURL.
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined
}

type Options = {
  /** Bỏ một ảnh đã lưu: màn tự lưu (Hôm nay) xóa ngay trên máy chủ; màn Sửa để tới lúc bấm Lưu. */
  onRemoveDone?: (photo: PhotoItem) => void
}

/** Trạng thái ô ảnh của một trang: thêm, bỏ, thử lại; tự hủy request và thu hồi ảnh xem trước khi rời trang. */
export function usePhotoUploads(initial: PhotoItem[], upload: UploadPhoto, { onRemoveDone }: Options = {}) {
  const [tiles, setTiles] = useState<UploadTile[]>(() => initial.map((photo) => ({ key: photo.id, status: 'done', photo })))
  const [note, setNote] = useState<string | null>(null)
  const seq = useRef(0)
  const controllers = useRef(new Map<string, AbortController>())
  const previews = useRef(new Set<string>())

  useEffect(() => {
    const running = controllers.current
    const urls = previews.current
    return () => {
      running.forEach((c) => c.abort())
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  const patch = useCallback((key: string, next: (tile: UploadTile) => UploadTile) => {
    setTiles((list) => list.map((t) => (t.key === key ? next(t) : t)))
  }, [])

  const run = useCallback(
    (key: string, file: File) => {
      const controller = new AbortController()
      controllers.current.set(key, controller)
      upload(
        file,
        (ratio) => patch(key, (t) => (t.status === 'uploading' ? { ...t, progress: ratio } : t)),
        controller.signal,
      ).then(
        (photo) => patch(key, (t) => (t.status === 'uploading' ? { key, status: 'done', photo, previewUrl: t.previewUrl } : t)),
        (error: unknown) => {
          if (controller.signal.aborted) return
          const reason = serverRejection(error)
          patch(key, (t) =>
            t.status !== 'uploading'
              ? t
              : reason
                ? { key, status: 'rejected', name: file.name, reason }
                : { key, status: 'failed', file, previewUrl: t.previewUrl },
          )
        },
      ).finally(() => controllers.current.delete(key))
    },
    [patch, upload],
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const plan = planAdd(tiles, files, () => `new-${++seq.current}`)
      const started = plan.started.map((t) => {
        const previewUrl = previewOf(t.file)
        if (previewUrl) previews.current.add(previewUrl)
        return { ...t, previewUrl }
      })
      const byKey = new Map(started.map((t) => [t.key, t]))
      setTiles(plan.tiles.map((t) => byKey.get(t.key) ?? t))
      const max = tierLimits().photos.per_day_max
      setNote(plan.skipped ? `Chỉ thêm được ${started.length} ảnh, mỗi trang tối đa ${max} ảnh.` : null)
      started.forEach((t) => run(t.key, t.file))
    },
    [run, tiles],
  )

  const remove = useCallback(
    (key: string) => {
      controllers.current.get(key)?.abort()
      const tile = tiles.find((t) => t.key === key)
      if (tile?.status === 'done') onRemoveDone?.(tile.photo)
      setTiles((list) => list.filter((t) => t.key !== key))
      setNote(null)
    },
    [onRemoveDone, tiles],
  )

  const retry = useCallback(
    (key: string) => {
      const tile = tiles.find((t) => t.key === key)
      if (tile?.status !== 'failed') return
      patch(key, () => ({ key, status: 'uploading', file: tile.file, previewUrl: tile.previewUrl, progress: 0 }))
      run(key, tile.file)
    },
    [patch, run, tiles],
  )

  /** Đặt lại về danh sách ảnh đã lưu (bỏ thay đổi). */
  const reset = useCallback((photos: PhotoItem[]) => {
    controllers.current.forEach((c) => c.abort())
    setTiles(photos.map((photo) => ({ key: photo.id, status: 'done', photo })))
    setNote(null)
  }, [])

  return {
    tiles,
    note,
    photos: donePhotos(tiles),
    uploading: tiles.some((t) => t.status === 'uploading'),
    addFiles,
    remove,
    retry,
    reset,
  }
}

export type PhotoUploads = ReturnType<typeof usePhotoUploads>
