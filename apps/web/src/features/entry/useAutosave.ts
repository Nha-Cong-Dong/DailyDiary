import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { ApiError } from '@/api/client'
import { createAutosave, noteReconnectSynced, type FailureKind, type SaveStatus } from '@/lib/autosave'
import type { DateString } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { deleteDraft, draftUserKey, loadDraft, saveDraft, type DraftFields } from '@/lib/storage'
import { fetchEntry, saveErrorMessage, useSaveEntry, type DayEntry } from './entries'
import { toWrite } from './entryDraft'

/**
 * Tự động lưu một ngày (F-06): nối `lib/autosave` với nháp IndexedDB (`lib/storage`) và PUT /entries/{day}.
 * - `mode: 'auto'` (Hôm nay, Ghi bù): nháp sau 1 s, đồng bộ sau 4 s, khi chuyển tab, rời màn, có mạng lại.
 * - `mode: 'draft'` (Sửa trang cũ): chỉ ghi nháp; lên máy chủ khi gọi `flush()` (nút "Lưu thay đổi").
 * - Xung đột (409, hoặc nháp dựa trên bản cũ hơn máy chủ): `conflict` có cả hai bản để người dùng chọn.
 */
export type Conflict = { mine: DraftFields; theirs: DayEntry | null }

export function fieldsOf(entry: DayEntry): DraftFields {
  return {
    score: entry.score,
    sub_icon: entry.sub_icon,
    flag_color: entry.flag_color,
    title: entry.title ?? '',
    content: entry.content ?? '',
    keywords: entry.keywords,
  }
}

/** So hai bản như máy chủ sẽ lưu (bỏ khoảng trắng hai đầu, chuỗi rỗng = không có). */
export function sameFields(a: DraftFields, b: DraftFields): boolean {
  const norm = (f: DraftFields) => JSON.stringify(toWrite({ ...f, score: f.score as DayEntry['score'] }, null))
  return norm(a) === norm(b)
}

function classify(error: unknown): FailureKind {
  if (error instanceof ApiError) {
    if (error.code === 'ENTRY_CONFLICT') return { kind: 'conflict' }
    if (error.status === 429 || error.status >= 500) return { kind: 'retry' }
    return { kind: 'error', message: saveErrorMessage(error) }
  }
  return { kind: 'retry' } // fetch lỗi = mất mạng
}

type Options = {
  date: DateString
  /** Bản máy chủ lúc mở màn (null = chưa có trang). */
  record: DayEntry | null
  mode: 'auto' | 'draft'
  /** Nạp lại form từ một bản (chọn "Dùng bản vừa sửa", hoặc khôi phục nháp). */
  onLoad: (fields: DraftFields) => void
  /** Mỗi lần lưu lên máy chủ thành công. */
  onSaved?: (entry: DayEntry) => void
}

/**
 * Trạng thái sống qua các lần render mà bộ máy và các handler cùng đọc/ghi (bản máy chủ làm gốc, bản đang gõ,
 * vừa mất mạng, callback mới nhất). Một object tạo một lần bằng useState, không phải state để render.
 */
class Box {
  server: DayEntry | null
  mine: DraftFields | null
  offline = false
  cb: { onLoad: (f: DraftFields) => void; onSaved?: (e: DayEntry) => void; save: ReturnType<typeof useSaveEntry> }

  constructor(record: DayEntry | null, cb: Box['cb']) {
    this.server = record
    this.mine = record ? fieldsOf(record) : null
    this.cb = cb
  }

  setServer(entry: DayEntry | null) {
    this.server = entry
  }

  setMine(fields: DraftFields | null) {
    this.mine = fields
  }

  setCallbacks(cb: Box['cb']) {
    this.cb = cb
  }
}

type EngineContext = {
  date: DateString
  mode: 'auto' | 'draft'
  record: DayEntry | null
  keyPromise: Promise<string> | null
  box: Box
  client: QueryClient
  setServer: (e: DayEntry | null) => void
  setStatus: (s: SaveStatus) => void
  setConflict: Dispatch<SetStateAction<Conflict | null>>
}

/** Dựng bộ máy tự lưu cho một màn (một lần khi mở màn). */
function makeEngine(ctx: EngineContext) {
  const { date, keyPromise, box } = ctx
  return createAutosave<DraftFields>({
    mode: ctx.mode,
    initialSynced: ctx.record ? fieldsOf(ctx.record) : null,
    equals: sameFields,
    persist: async (fields) => {
      const key = await keyPromise
      if (key) await saveDraft(key, date, fields, box.server?.updated_at ?? null)
    },
    sync: async (fields) => {
      const body = toWrite({ ...fields, score: fields.score as DayEntry['score'] }, box.server?.updated_at ?? null)
      const next = await box.cb.save.mutateAsync({ date, body })
      box.server = next
      ctx.setServer(next)
      box.cb.onSaved?.(next)
    },
    onSynced: (_value, stillUnsynced) => {
      // Người dùng gõ tiếp trong lúc gửi: giữ nháp tới lần đồng bộ sau.
      if (!stillUnsynced) void keyPromise?.then((k) => deleteDraft(k, date))
      if (box.offline) {
        box.offline = false
        noteReconnectSynced()
      }
    },
    classify,
    onStatus: (s) => {
      if (s.kind === 'unsynced') box.offline = true
      ctx.setStatus(s)
      if (s.kind === 'conflict') {
        void ctx.client
          .fetchQuery({ queryKey: ['entries', date], queryFn: () => fetchEntry(date), staleTime: 0 })
          .then((theirs) => ctx.setConflict((c) => c ?? { mine: box.mine as DraftFields, theirs }))
      }
    },
  })
}

export function useAutosave({ date, record, mode, onLoad, onSaved }: Options) {
  const { email } = useProfile()
  const client = useQueryClient()
  const save = useSaveEntry(date)
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })
  const [server, setServer] = useState<DayEntry | null>(record)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [restored, setRestored] = useState(false)

  // Mã kho nháp của người dùng (SHA-256 email), tính một lần khi mở màn.
  const [keyPromise] = useState(() => (email ? draftUserKey(email) : null))
  const [box] = useState(() => new Box(record, { onLoad, onSaved, save }))
  // Callback mới nhất mà không phải tạo lại bộ máy mỗi lần render.
  useLayoutEffect(() => {
    box.setCallbacks({ onLoad, onSaved, save })
  })

  const [engine] = useState(() =>
    makeEngine({ date, mode, record, keyPromise, box, client, setServer, setStatus, setConflict }),
  )

  // Mở màn: có nháp chưa lưu từ lần trước thì nạp lại (cùng gốc) hoặc hỏi chọn bản (máy chủ đã đổi).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const key = await keyPromise
      if (!key) return
      const draft = await loadDraft(key, date)
      if (cancelled || !draft) return
      const base = box.server
      if (base && sameFields(draft.fields, fieldsOf(base))) {
        await deleteDraft(key, date)
        return
      }
      box.setMine(draft.fields)
      if (draft.baseUpdatedAt === (base?.updated_at ?? null)) {
        box.cb.onLoad(draft.fields)
        setRestored(true)
        engine.change(draft.fields)
      } else {
        box.cb.onLoad(draft.fields)
        engine.holdConflict(draft.fields)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [box, date, engine, keyPromise])

  // Chuyển tab, đóng tab, mất mạng / có mạng lại, rời màn.
  useEffect(() => {
    engine.attach()
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void engine.leave()
    }
    const onPageHide = () => void engine.leave()
    const onOnline = () => engine.retryNow()
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (engine.hasUnsynced()) e.preventDefault()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('online', onOnline)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeunload', onBeforeUnload)
      void engine.leave()
      engine.dispose()
    }
  }, [engine])

  const change = useCallback(
    (fields: DraftFields | null) => {
      if (!fields) return
      box.setMine(fields)
      engine.change(fields)
    },
    [box, engine],
  )

  /** Đổi rồi lưu ngay (chấm điểm, nút Lưu). */
  const saveNow = useCallback(
    (fields: DraftFields) => {
      box.setMine(fields)
      engine.change(fields)
      return engine.flush()
    },
    [box, engine],
  )

  const keepMine = useCallback(() => {
    if (!conflict) return
    box.setServer(conflict.theirs)
    setConflict(null)
    engine.change(conflict.mine)
    engine.resume()
  }, [box, conflict, engine])

  const takeTheirs = useCallback(() => {
    if (!conflict) return
    const theirs = conflict.theirs
    box.setServer(theirs)
    setServer(theirs)
    setConflict(null)
    void keyPromise?.then((k) => deleteDraft(k, date))
    const fields = theirs ? fieldsOf(theirs) : null
    box.setMine(fields)
    engine.reset(fields)
    if (fields) box.cb.onLoad(fields)
  }, [box, conflict, date, engine, keyPromise])

  /** Bỏ mọi thay đổi chưa lưu (nút "Bỏ thay đổi"): xóa nháp, quay về bản máy chủ. */
  const discard = useCallback(() => {
    const base = box.server
    void keyPromise?.then((k) => deleteDraft(k, date))
    const fields = base ? fieldsOf(base) : null
    box.setMine(fields)
    engine.reset(fields)
    setRestored(false)
  }, [box, date, engine, keyPromise])

  /** Máy chủ đổi bản chuẩn ngoài luồng tự lưu (vd. vừa xóa trang ghi bù): lấy bản đó làm gốc, bỏ nháp. */
  const adopt = useCallback(
    (entry: DayEntry | null) => {
      box.setServer(entry)
      setServer(entry)
      void keyPromise?.then((k) => deleteDraft(k, date))
      const fields = entry ? fieldsOf(entry) : null
      box.setMine(fields)
      engine.reset(fields)
    },
    [box, date, engine, keyPromise],
  )

  return {
    status,
    adopt,
    server,
    conflict,
    restored,
    change,
    saveNow,
    flush: () => engine.flush(),
    retry: () => engine.retryNow(),
    keepMine,
    takeTheirs,
    discard,
  }
}
