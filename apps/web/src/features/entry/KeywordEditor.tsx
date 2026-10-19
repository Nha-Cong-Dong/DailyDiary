import { useId, useState } from 'react'
import { AddKeywordButton, KeywordChip } from '@/components/diary/KeywordChip'
import { Input } from '@/components/ui/input'
import { tierLimits } from '@/lib/limits'
import { addKeyword } from './keywords'

type KeywordEditorProps = {
  keywords: string[]
  onChange: (keywords: string[]) => void
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
          <AddKeywordButton className="h-9 px-3 text-[13px] sm:h-8 sm:text-sm" onClick={() => setOpen(true)}>
            + Từ khóa
          </AddKeywordButton>
        )}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="text-[13px] leading-5 font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
