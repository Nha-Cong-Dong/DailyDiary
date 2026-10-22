import { useCallback, useEffect, useRef, useState } from 'react'

const SHOW_MS = 2200

/**
 * Sao chép link vào clipboard, rồi báo "Đã chép" trên đúng nút vừa bấm (theo `key`) và hiện toast.
 * Không ghi link ra log hay console (link chứa token mở được trang).
 */
export function useCopyLink() {
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const flash = useCallback((text: string, key: string | null = null) => {
    clearTimeout(timer.current)
    setCopied(key)
    setToast(text)
    timer.current = setTimeout(() => {
      setCopied(null)
      setToast(null)
    }, SHOW_MS)
  }, [])

  const copy = useCallback(
    async (url: string, key: string) => {
      try {
        await navigator.clipboard.writeText(url)
        flash('Đã sao chép link', key)
      } catch {
        flash('Chưa sao chép được. Hãy chọn link rồi chép tay.')
      }
    },
    [flash],
  )

  return { copied, toast, copy, flash }
}
