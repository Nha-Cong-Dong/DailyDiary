import { useSyncExternalStore } from 'react'

/** Chế độ sáng/tối: lớp `dark` trên <html>, nhớ lựa chọn trong localStorage, mặc định theo hệ điều hành. */
const STORAGE_KEY = 'jotly-theme'
const listeners = new Set<() => void>()

function readStored(): 'light' | 'dark' | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function initTheme() {
  const stored = readStored()
  const dark = stored ? stored === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', Boolean(dark))
}

export function isDark() {
  return document.documentElement.classList.contains('dark')
}

export function setDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn đổi được trong phiên hiện tại.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDarkMode() {
  return useSyncExternalStore(subscribe, isDark, () => false)
}
