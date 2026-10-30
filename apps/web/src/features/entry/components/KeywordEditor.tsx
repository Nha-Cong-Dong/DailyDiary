import { TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { AddKeywordButton, KeywordChip } from '@/components/diary/KeywordChip'
import { Input } from '@/components/ui/input'
import { tierLimits } from '@/lib/limits'
import { cn } from '@/lib/utils'
import { addKeyword, duplicateOf } from '../keywords'

type KeywordEditorProps = {
  keywords: string[]
  onChange: (keywords: string[]) => void
  /** Id của nhãn "Từ khóa" bên ngoài, gắn cho ô nhập ở bản `inline`. */
  inputId?: string
}

/** Hàng chip từ khóa + nút "+ Từ khóa" mở ô nhập ngay tại chỗ (Enter để thêm, Esc để đóng). */
export function KeywordEditor({ keywords, onChange }: KeywordEditorProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const { keyword_len_max } = tierLimits().entry

  function submit() {
    const result = addKeyword(keywords, value)
    if (result.ok === false) {
      setError(result.error)
      return
    }
    onChange(result.keywords)
    setValue('')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {keywords.map((k) => (
          <KeywordChip key={k} onRemove={() => onChange(keywords.filter((x) => x !== k))}>
            {k}
          </KeywordChip>
        ))}
        {open ? (
          <span className="inline-flex items-center gap-2">
            <label htmlFor={inputId} className="sr-only">
              Từ khóa mới
            </label>
            <Input
              id={inputId}
              autoFocus
              value={value}
              maxLength={keyword_len_max}
              placeholder="vd: đọc sách"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              onChange={(e) => {
                setValue(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                } else if (e.key === 'Escape') {
                  setOpen(false)
                  setError(null)
                }
              }}
              onBlur={() => {
                if (!value.trim()) setOpen(false)
              }}
              className="h-9 w-40 rounded-full px-3 text-sm"
            />
          </span>
        ) : (
          <AddKeywordButton className="h-9 px-3 text-label sm:h-8 sm:text-sm" onClick={() => setOpen(true)}>
            + Từ khóa
          </AddKeywordButton>
        )}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="text-label leading-5 font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** Viền và biểu tượng cảnh báo trùng từ khóa (thiết kế B9 · Sửa trang). */
const WARN = '#B9772E'

/**
 * Ô từ khóa luôn hiện của màn Sửa (thiết kế B9, B10): gõ rồi Enter hoặc bấm Thêm. Từ khóa trùng (không phân biệt
 * hoa thường, dấu) được báo ngay khi gõ: viền ô chuyển cam, nút Thêm xám, chip đã có sáng lên một nhịp.
 */
export function InlineKeywordEditor({ keywords, onChange, inputId }: KeywordEditorProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [glowing, setGlowing] = useState(false)
  const ownId = useId()
  const id = inputId ?? ownId
  const msgId = `${id}-msg`
  const { keyword_len_max } = tierLimits().entry
  const glowTimer = useRef<number | undefined>(undefined)
  const dup = duplicateOf(keywords, value)
  const canAdd = value.trim().length > 0 && dup === null

  useEffect(() => () => window.clearTimeout(glowTimer.current), [])

  function type(next: string) {
    const nextDup = duplicateOf(keywords, next)
    // Chip trùng sáng lên một nhịp mỗi khi chuỗi gõ bắt đầu khớp một từ khóa khác.
    if (nextDup !== null && nextDup !== dup) {
      setGlowing(true)
      window.clearTimeout(glowTimer.current)
      glowTimer.current = window.setTimeout(() => setGlowing(false), 1000)
    }
    setValue(next)
    setError(null)
  }

  function submit() {
    if (!canAdd) return
    const result = addKeyword(keywords, value)
    if (result.ok === false) {
      setError(result.error)
      return
    }
    onChange(result.keywords)
    setValue('')
    setError(null)
  }

  const message = dup !== null ? `Từ khóa “${dup}” đã có trong trang này.` : error

  return (
    <div className="flex flex-col gap-2 md:gap-2.5">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        {keywords.length ? (
          <ul aria-label="Từ khóa của trang" className="contents max-md:flex max-md:flex-wrap max-md:gap-2">
            {keywords.map((k) => (
              <li key={k} className="contents">
                <KeywordChip
                  onRemove={() => onChange(keywords.filter((x) => x !== k))}
                  className={cn(
                    'transition-[box-shadow,background-color] duration-300',
                    k === dup && 'bg-[rgb(241_189_144/.35)]',
                    k === dup && glowing && 'shadow-[0_0_0_4px_rgb(241_189_144/.85)]',
                  )}
                >
                  {k}
                </KeywordChip>
              </li>
            ))}
          </ul>
        ) : null}
        <span className="flex items-center gap-2 md:inline-flex md:gap-1.5">
          <Input
            id={id}
            value={value}
            maxLength={keyword_len_max}
            placeholder="Thêm từ khóa"
            aria-invalid={message ? true : undefined}
            aria-describedby={msgId}
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            style={dup !== null ? { borderColor: WARN } : undefined}
            className="h-11 min-w-0 flex-1 rounded-full border-dashed bg-card px-3.5 text-base md:h-9 md:w-40 md:flex-none md:bg-background md:px-3 md:text-sm"
          />
          {canAdd ? (
            <button
              type="button"
              onClick={submit}
              className="press h-11 shrink-0 cursor-pointer rounded-full border-(length:--stroke-width) border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring md:h-9 md:px-3 md:text-label"
            >
              Thêm
            </button>
          ) : dup !== null ? (
            <span
              aria-hidden="true"
              className="inline-flex h-11 shrink-0 items-center rounded-full border-(length:--stroke-width) border-disabled-line bg-disabled px-4 text-sm font-semibold text-disabled-foreground md:h-9 md:px-3 md:text-label"
            >
              Thêm
            </span>
          ) : null}
        </span>
      </div>
      <p id={msgId} role="status" className="flex min-h-[18px] items-center gap-1.5 text-label leading-[18px] md:min-h-5 md:text-label md:leading-5">
        {message ? (
          <>
            <TriangleAlert className="size-[15px] shrink-0" style={{ color: WARN }} aria-hidden="true" />
            {message}
          </>
        ) : null}
      </p>
    </div>
  )
}
