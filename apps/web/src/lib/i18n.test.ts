import { describe, expect, it } from 'vitest'
import { en } from '@/locales/en'
import { vi } from '@/locales/vi'
import { durationLabel, longDateLabel, shortDateLabel, weekdayShort } from './date'
import { currentLang, intlLocale, setLanguage, storedLang } from './i18n'

// Mọi khóa của một chuỗi (bỏ hậu tố số nhiều _one/_other để so tiếng Việt với tiếng Anh).
function keys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix.replace(/_(zero|one|two|few|many|other)$/, '')]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

describe('i18n', () => {
  it('mặc định là tiếng Việt', () => {
    expect(currentLang()).toBe('vi')
    expect(storedLang()).toBe('vi')
    expect(intlLocale()).toBe('vi-VN')
    expect(longDateLabel('2026-10-18')).toBe('Chủ nhật · 18 tháng 10, 2026')
  })

  it('đổi sang English: ngày giờ, nhớ lựa chọn, đặt lại lang của trang', async () => {
    await setLanguage('en')
    expect(currentLang()).toBe('en')
    expect(storedLang()).toBe('en')
    expect(intlLocale()).toBe('en-US')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Jotly · Tap to jot, open to look back')
    expect(longDateLabel('2026-10-18')).toBe('Sunday · October 18, 2026')
    expect(longDateLabel('2026-10-18', false)).toBe('Sunday · October 18')
    expect(shortDateLabel('2026-10-18')).toBe('Sunday, Oct 18')
    expect(weekdayShort('2026-10-12')).toBe('Mon')
    expect(durationLabel(176)).toBe('2 h 56 min')
    expect(durationLabel(45)).toBe('45 min')
  })

  it('quay lại tiếng Việt', async () => {
    await setLanguage('en')
    await setLanguage('vi')
    expect(durationLabel(176)).toBe('2 giờ 56 phút')
    expect(document.documentElement.lang).toBe('vi')
  })

  it('bản tiếng Anh có đủ khóa của bản tiếng Việt', () => {
    const missing = Object.keys(vi).flatMap((ns) => {
      const have = new Set(keys(en[ns as keyof typeof en]))
      return keys(vi[ns as keyof typeof vi])
        .filter((k) => !have.has(k))
        .map((k) => `${ns}:${k}`)
    })
    expect(missing).toEqual([])
  })
})
