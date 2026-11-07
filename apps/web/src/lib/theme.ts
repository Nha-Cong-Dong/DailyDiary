import { useSyncExternalStore } from 'react'

/**
 * Chế độ màu (canvas B11-Theme): lớp `dark` trên <html>. Bốn lựa chọn trong Hồ sơ: Sáng / Tối / Hệ thống / Theo giờ;
 * mặc định Hệ thống. Lựa chọn nhớ trong localStorage.
 * - Hệ thống: theo prefers-color-scheme, đổi ngay khi hệ điều hành đổi.
 * - Theo giờ: tối từ 20:00 đến trước 05:00 theo đồng hồ của máy, sáng thời gian còn lại; tự đổi khi qua mốc.
 */
export type ThemePreference = 'light' | 'dark' | 'system' | 'hour'

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Hệ thống' },
  { value: 'hour', label: 'Theo giờ' },
]

/** Chú thích dưới bộ chọn (canvas B11-Theme); Sáng/Tối không có chú thích. */
export const THEME_CAPTIONS: Partial<Record<ThemePreference, string>> = {
  hour: 'Tối từ 20:00 đến 05:00 theo giờ của máy, sáng thời gian còn lại.',
  system: 'Theo cài đặt sáng/tối của điện thoại hoặc máy tính.',
}

/** Giờ bắt đầu và kết thúc chế độ tối của "Theo giờ". */
export const NIGHT_FROM_HOUR = 20
export const NIGHT_UNTIL_HOUR = 5

const STORAGE_KEY = 'jotly-theme'
const listeners = new Set<() => void>()
let preference: ThemePreference = 'system'
let hourTimer: ReturnType<typeof setTimeout> | undefined

function systemDark(): boolean {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
}

/** Giờ trên máy có thuộc khoảng tối của "Theo giờ" không. */
export function isNightHour(date: Date = new Date()): boolean {
  const h = date.getHours()
  return h >= NIGHT_FROM_HOUR || h < NIGHT_UNTIL_HOUR
}

/** Số mili giây tới mốc đổi chế độ kế tiếp (05:00 hoặc 20:00). */
export function msUntilNextSwitch(date: Date = new Date()): number {
  const next = new Date(date)
  next.setSeconds(0, 0)
  next.setMinutes(0)
  const h = date.getHours()
  if (h < NIGHT_UNTIL_HOUR) next.setHours(NIGHT_UNTIL_HOUR)
  else if (h < NIGHT_FROM_HOUR) next.setHours(NIGHT_FROM_HOUR)
  else {
    next.setDate(next.getDate() + 1)
    next.setHours(NIGHT_UNTIL_HOUR)
  }
  return Math.max(1000, next.getTime() - date.getTime())
}

/** Chế độ đang hiển thị ứng với một lựa chọn. */
export function resolveDark(pref: ThemePreference, now: Date = new Date()): boolean {
  if (pref === 'system') return systemDark()
  if (pref === 'hour') return isNightHour(now)
  return pref === 'dark'
}

function scheduleHour() {
  clearTimeout(hourTimer)
  hourTimer = undefined
  if (preference !== 'hour') return
  hourTimer = setTimeout(apply, msUntilNextSwitch())
}

function apply() {
  document.documentElement.classList.toggle('dark', resolveDark(preference))
  scheduleHour()
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
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (preference === 'system') apply()
  })
  // Máy ngủ qua mốc giờ thì setTimeout trễ: kiểm lại khi quay lại tab.
  document.addEventListener('visibilitychange', () => {
    if (preference === 'hour' && document.visibilityState === 'visible') apply()
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
