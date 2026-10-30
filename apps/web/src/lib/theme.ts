import { useSyncExternalStore } from 'react'

/**
 * Chế độ màu: lớp `dark` trên <html>. Người dùng chọn Sáng / Tối / Theo hệ thống / Theo giờ (Hồ sơ); lựa chọn nhớ trong
 * localStorage. "Theo hệ thống" (mặc định) đi theo prefers-color-scheme và đổi ngay khi hệ điều hành đổi.
 * "Theo giờ" (DESIGN.md mục 8): tối từ 20:00 đến trước 05:00 theo đồng hồ của máy, sáng thời gian còn lại; xét lại
 * mỗi phút. Script chống nháy trong index.html lặp lại đúng quy tắc này.
 */
export type ThemePreference = 'light' | 'dark' | 'system' | 'hour'

const STORAGE_KEY = 'jotly-theme'
const listeners = new Set<() => void>()
let preference: ThemePreference = 'system'
let hourTimer: number | undefined

/** Giờ tối của chế độ "Theo giờ": từ 20:00 đến trước 05:00. */
export function isNightHour(now: Date = new Date()): boolean {
  const h = now.getHours()
  return h >= 20 || h < 5
}

function systemDark(): boolean {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
}

// Màu thanh trình duyệt trên điện thoại theo nền trang (DESIGN.md mục 2: paper).
const THEME_COLOR = { light: '#FFFCF8', dark: '#14110D' }

function apply() {
  const dark =
    preference === 'system' ? systemDark() : preference === 'hour' ? isNightHour() : preference === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light)
  listeners.forEach((l) => l())
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'hour' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function initTheme() {
  preference = readStored()
  scheduleHourCheck()
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

/** Chế độ "Theo giờ" xét lại mỗi phút (qua 20:00 hay 05:00 thì đổi ngay); chế độ khác thì không cần hẹn giờ. */
function scheduleHourCheck() {
  window.clearInterval(hourTimer)
  hourTimer = preference === 'hour' ? window.setInterval(apply, 60_000) : undefined
}

export function setThemePreference(next: ThemePreference) {
  preference = next
  scheduleHourCheck()
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
