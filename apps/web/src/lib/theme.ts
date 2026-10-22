import { useSyncExternalStore } from 'react'

/**
 * Chế độ màu: lớp `dark` trên <html>. Người dùng chọn Sáng / Tối / Theo hệ thống (Hồ sơ); lựa chọn nhớ trong
 * localStorage. "Theo hệ thống" (mặc định) đi theo prefers-color-scheme và đổi ngay khi hệ điều hành đổi.
 */
export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'jotly-theme'
const listeners = new Set<() => void>()
let preference: ThemePreference = 'system'

function systemDark(): boolean {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
}

function apply() {
  const dark = preference === 'system' ? systemDark() : preference === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  listeners.forEach((l) => l())
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function initTheme() {
  preference = readStored()
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (preference === 'system') apply()
  })
  apply()
}

export function isDark() {
  return document.documentElement.classList.contains('dark')
}

export function getThemePreference(): ThemePreference {
  return preference
}

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn đổi được trong phiên hiện tại.
  }
  apply()
}

/** Nút bật/tắt nhanh ở thanh trên: chọn hẳn Sáng hoặc Tối. */
export function setDark(dark: boolean) {
  setThemePreference(dark ? 'dark' : 'light')
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDarkMode() {
  return useSyncExternalStore(subscribe, isDark, () => false)
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, () => 'system')
}
