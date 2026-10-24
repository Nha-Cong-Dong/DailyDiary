import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api, ApiError, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import type { PhotoItem } from '@/components/diary/PhotoViewer'
import { track, trackThrottled } from '@/lib/analytics'
import type { Score } from '@/lib/catalog'
import type { DateString } from '@/lib/date'

/**
 * Nhật ký một ngày qua API (F-01, Bước 5): GET/PUT/DELETE /entries/{day}, POST /entries/{day}/restore.
 * Key theo web-conventions: ['entries', date]; ghi xong thì làm mới các màn tổng hợp (lịch, pixels, dòng thời gian).
 */
export type EntryOut = components['schemas']['EntryOut']
export type EntryWrite = components['schemas']['EntryWrite']
export type EntryDeleted = components['schemas']['EntryDeletedOut']

/** Trang một ngày như các màn dùng; ảnh kèm link xem có hạn ~1 giờ. */
export type DayEntry = {
  entry_date: DateString
  score: Score
  sub_icon: string | null
  flag_color: string | null
  title: string | null
  content: string | null
  keywords: string[]
  photos: PhotoItem[]
  created_at: string
  updated_at: string
}

export function toDayEntry(e: EntryOut): DayEntry {
  return {
    entry_date: e.entry_date,
    score: e.score as Score,
    sub_icon: e.sub_icon,
    flag_color: e.flag_color,
    title: e.title,
    content: e.content,
    keywords: e.keywords,
    photos: e.photos.map((p, i) => ({
      id: p.id,
      label: `[Ảnh ${i + 1}]`,
      url: p.url,
      thumbUrl: p.thumb_url,
      width: p.width,
      height: p.height,
    })),
    created_at: e.created_at,
    updated_at: e.updated_at,
  }
}

/** Trang của một ngày; `null` khi chưa ghi hoặc đã xóa (API trả 404). */
export async function fetchEntry(date: DateString): Promise<DayEntry | null> {
  const { data, error, response } = await api.GET('/entries/{day}', { params: { path: { day: date } } })
  if (response.status === 404) return null
  if (error || !data) throw toApiError(response, error)
  return toDayEntry(data)
}

/** Ghi xong một ngày: các màn tổng hợp đọc lại (Dòng thời gian, lịch tháng, Year in Pixels). */
function refreshSummaries(client: QueryClient, date: DateString) {
  void client.invalidateQueries({ queryKey: ['entries'], predicate: (q) => q.queryKey[1] !== date })
  void client.invalidateQueries({ queryKey: ['calendar'] })
  void client.invalidateQueries({ queryKey: ['pixels'] })
}

type SaveArgs = { date: DateString; body: EntryWrite }
const ENTRY_UPDATED_EVERY_MS = 30 * 60_000

/**
 * Lần lưu gần nhất của chính tab này cho mỗi ngày: bản nó dựa vào (`from`, null = tạo mới) và bản nó tạo ra (`to`).
 * Hai lần lưu liền nhau (chấm điểm rồi bấm Lưu ngay) chạy nối tiếp; lần sau được dựng trước khi lần trước xong
 * nên còn mang `updated_at` cũ — nếu đúng là bản lần trước vừa thay thì đổi sang bản mới. Bản do tab/máy khác
 * sửa thì không đổi gì, vẫn ra 409 như mong đợi.
 */
type Saved = Map<DateString, { from: string | null; to: string }>
// Gắn theo QueryClient (một cho cả app; mỗi test một cái riêng) để không rò giữa các phiên.
const savedByClient = new WeakMap<QueryClient, Saved>()

function lastSavedOf(client: QueryClient): Saved {
  let saved = savedByClient.get(client)
  if (!saved) savedByClient.set(client, (saved = new Map()))
  return saved
}

function chainUpdatedAt(lastSaved: Saved, date: DateString, body: EntryWrite): EntryWrite {
  const last = lastSaved.get(date)
  if (last && last.from === (body.updated_at ?? null)) return { ...body, updated_at: last.to }
  return body
}

/**
 * PUT /entries/{day}. Tạo mới: không gửi `updated_at`. Sửa: gửi lại đúng `updated_at` đã nhận từ API;
 * bản trên máy chủ mới hơn → ApiError 409 ENTRY_CONFLICT (useAutosave mở hộp thoại chọn bản).
 * Các lần ghi cùng một ngày chạy nối tiếp (mutation scope), không chen nhau.
 */
export function useSaveEntry(date: DateString) {
  const client = useQueryClient()
  return useMutation({
    scope: { id: `entry:${date}` },
    // Mất mạng thì báo lỗi ngay thay vì tạm dừng: bộ máy tự lưu (F-06) tự thử lại và báo "Chưa đồng bộ".
    networkMode: 'always',
    mutationFn: async ({ date, body }: SaveArgs) => {
      const lastSaved = lastSavedOf(client)
      const sent = chainUpdatedAt(lastSaved, date, body)
      const { data, error, response } = await api.PUT('/entries/{day}', { params: { path: { day: date } }, body: sent })
      if (error || !data) throw toApiError(response, error)
      lastSaved.set(date, { from: sent.updated_at ?? null, to: data.updated_at })
      // Phân tích (Bước 13): không gửi ngày hay nội dung. Tự động lưu gọi PUT vài giây một lần khi đang gõ
      // → `entry_updated` tính tối đa một lần mỗi 30 phút cho mỗi ngày.
      if (sent.updated_at) trackThrottled(date, ENTRY_UPDATED_EVERY_MS, 'entry_updated')
      else track('entry_created')
      return toDayEntry(data)
    },
    onSuccess: (entry, { date }) => {
      client.setQueryData(['entries', date], entry)
      refreshSummaries(client, date)
    },
  })
}

/** DELETE /entries/{day}: xóa mềm, khôi phục được tới `restore_until`. */
export function useDeleteEntry(date: DateString) {
  const client = useQueryClient()
  return useMutation({
    scope: { id: `entry:${date}` },
    mutationFn: async (date: DateString): Promise<EntryDeleted> => {
      lastSavedOf(client).delete(date)
      const { data, error, response } = await api.DELETE('/entries/{day}', { params: { path: { day: date } } })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: (_, date) => {
      client.setQueryData(['entries', date], null)
      refreshSummaries(client, date)
    },
  })
}

/** POST /entries/{day}/restore: hoàn tác xóa. */
export function useRestoreEntry(date: DateString) {
  const client = useQueryClient()
  return useMutation({
    scope: { id: `entry:${date}` },
    mutationFn: async (date: DateString) => {
      const { data, error, response } = await api.POST('/entries/{day}/restore', { params: { path: { day: date } } })
      if (error || !data) throw toApiError(response, error)
      return toDayEntry(data)
    },
    onSuccess: (entry, date) => {
      client.setQueryData(['entries', date], entry)
      refreshSummaries(client, date)
    },
  })
}

/** Câu báo lỗi khi lưu: 409 nói rõ là xung đột, 422 dùng câu của API (vd. "Tiêu đề tối đa 100 ký tự"). */
export function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'ENTRY_CONFLICT') return 'Trang này vừa được sửa ở nơi khác.'
    if (error.status === 422 || error.status === 404) return error.message
    if (error.status === 429) return 'Bạn lưu hơi nhanh, thử lại sau ít giây.'
  }
  return 'Chưa lưu được. Kiểm tra kết nối rồi thử lại.'
}

export const isConflict = (error: unknown) => error instanceof ApiError && error.code === 'ENTRY_CONFLICT'
