import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanReferrer,
  cleanUrl,
  forgetLogin,
  initAnalytics,
  isValidEvent,
  pageviewPath,
  resetAnalyticsForTest,
  resultBucket,
  sanitizePayload,
  startPageviews,
  track,
  trackLoginOnce,
  trackPageview,
  trackThrottled,
  useTrackView,
} from './analytics'

type Payload = Record<string, unknown>
const BASE: Payload = {
  website: 'w1',
  hostname: 'jotly.vn',
  language: 'vi',
  screen: '1920x1080',
  title: 'Chuyến đi Đà Lạt',
  url: 'https://jotly.vn/s/SECRET?q=tukhoa#x',
  referrer: 'https://www.google.com/search?q=tukhoa',
  id: 'user-123',
  tag: 'x',
}

/** Umami giả: ghi payload cuối cùng (sau khi áp hàm của track và lớp lọc data-before-send như script thật). */
function fakeUmami() {
  const sent: Payload[] = []
  const w = window as unknown as Record<string, unknown>
  w.umami = {
    track: (fn: (p: Payload) => Payload) => {
      const before = w.__jotlyUmamiBeforeSend as ((t: string, p: unknown) => unknown) | undefined
      const payload = fn({ ...BASE })
      const out = before ? before('event', payload) : payload
      if (out) sent.push(out as Payload)
    },
  }
  return sent
}

function configure() {
  vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js')
  vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'w1')
}

beforeEach(() => {
  resetAnalyticsForTest()
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  const w = window as unknown as Record<string, unknown>
  delete w.umami
  delete w.__jotlyUmamiBeforeSend
  document.querySelectorAll('script[data-jotly-analytics]').forEach((s) => s.remove())
})

describe('isValidEvent', () => {
  it('chỉ nhận 7 sự kiện của đặc tả', () => {
    for (const n of ['login', 'entry_created', 'entry_updated', 'photo_uploaded', 'calendar_viewed', 'pixels_viewed', 'search_used'])
      expect(isValidEvent(n)).toBe(true)
    expect(isValidEvent('entry_deleted')).toBe(false)
    expect(isValidEvent('signup-button')).toBe(false)
    expect(isValidEvent(42)).toBe(false)
  })

  it('props: chỉ khóa cho phép, đúng kiểu; không chuỗi tự do', () => {
    expect(isValidEvent('search_used', { filtered: true, results: '1-5' })).toBe(true)
    expect(isValidEvent('search_used', { filtered: true, results: '7' })).toBe(false)
    expect(isValidEvent('search_used', { q: 'tukhoa' })).toBe(false)
    expect(isValidEvent('search_used', { filtered: 'yes' })).toBe(false)
    expect(isValidEvent('entry_created', { title: 'Đà Lạt' })).toBe(false)
    expect(isValidEvent('calendar_viewed', { current_month: true, month: '2026-10' })).toBe(false)
    expect(isValidEvent('login', ['x'])).toBe(false)
  })

  it('resultBucket không gửi số chính xác', () => {
    expect([0, 1, 5, 6, 20, 21, 999].map(resultBucket)).toEqual(['0', '1-5', '1-5', '6-20', '6-20', '21+', '21+'])
  })
})

describe('làm sạch URL', () => {
  it('bỏ query, hash; che token chia sẻ', () => {
    expect(cleanUrl('/s/AbC_123?x=1#y')).toBe('/s/:token')
    expect(cleanUrl('http://localhost:8000/public/shares/AbC_123?x=1')).toBe('http://localhost:8000/public/shares/:token')
    expect(cleanUrl('http://localhost:8000/search?q=tukhoa')).toBe('http://localhost:8000/search')
    expect(cleanUrl('/shares')).toBe('/shares')
  })

  it('pageview: chỉ đường dẫn, ngày cụ thể thành :date', () => {
    expect(pageviewPath('https://jotly.vn/s/AbC?q=1#h')).toBe('/s/:token')
    expect(pageviewPath('/day/2026-10-18/edit')).toBe('/day/:date/edit')
    expect(pageviewPath('/day/2026-10-18')).toBe('/day/:date')
    expect(pageviewPath('/timeline?m=2026-09')).toBe('/timeline')
  })

  it('referrer ngoài chỉ còn origin; cùng trang thì làm sạch', () => {
    expect(cleanReferrer('https://www.google.com/search?q=tukhoa')).toBe('https://www.google.com')
    expect(cleanReferrer(`${window.location.origin}/s/AbC?x=1`)).toBe('/s/:token')
    expect(cleanReferrer('')).toBe('')
  })

  it('data-before-send: làm sạch url/referrer/title, bỏ id/tag, chặn sự kiện lạ và identify', () => {
    expect(sanitizePayload('event', { ...BASE })).toEqual({
      website: 'w1',
      hostname: 'jotly.vn',
      language: 'vi',
      screen: '1920x1080',
      title: 'Jotly',
      url: '/s/:token',
      referrer: 'https://www.google.com',
    })
    expect(sanitizePayload('event', { ...BASE, name: 'click', data: {} })).toBe(false)
    expect(sanitizePayload('event', { ...BASE, name: 'search_used', data: { q: 'tukhoa' } })).toBe(false)
    expect(sanitizePayload('event', { ...BASE, data: { a: 1 } })).toBe(false)
    expect(sanitizePayload('identify', { ...BASE, id: 'x' })).toBe(false)
  })
})

describe('khi chưa cấu hình', () => {
  it('không nạp script, không gửi, không lỗi', () => {
    vi.stubEnv('VITE_UMAMI_SRC', '')
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '')
    const sent = fakeUmami()
    initAnalytics()
    expect(document.querySelector('script[data-jotly-analytics]')).toBeNull()
    expect(track('login')).toBe(false)
    expect(trackPageview('/today')).toBe(false)
    trackLoginOnce()
    expect(sessionStorage.length).toBe(0)
    expect(sent).toEqual([])
  })

  it('thiếu một trong hai biến cũng coi như tắt', () => {
    vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js')
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '')
    expect(track('login')).toBe(false)
  })
})

describe('khi đã cấu hình', () => {
  beforeEach(configure)

  it('nạp script một lần, tắt auto-track, bỏ query/hash, có data-before-send', () => {
    initAnalytics()
    initAnalytics()
    const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-jotly-analytics]')
    expect(scripts).toHaveLength(1)
    const s = scripts[0]
    expect(s.src).toBe('https://umami.example.com/script.js')
    expect(s.dataset).toMatchObject({
      websiteId: 'w1',
      autoTrack: 'false',
      excludeSearch: 'true',
      excludeHash: 'true',
      beforeSend: '__jotlyUmamiBeforeSend',
    })
  })

  it('sự kiện gửi kèm url đã làm sạch, không có id/title thật', () => {
    initAnalytics()
    const sent = fakeUmami()
    trackPageview('/day/2026-10-18/edit')
    expect(track('search_used', { filtered: false, results: '0' })).toBe(true)
    expect(sent[1]).toMatchObject({ name: 'search_used', data: { filtered: false, results: '0' }, url: '/day/:date/edit', title: 'Jotly' })
    expect(sent[1]).not.toHaveProperty('id')
  })

  it('chặn tên/props sai ngay cả khi bỏ qua kiểu TypeScript', () => {
    const sent = fakeUmami()
    const loose = track as unknown as (n: string, p?: unknown) => boolean
    expect(loose('entry_deleted')).toBe(false)
    expect(loose('search_used', { q: 'tukhoa', filtered: true })).toBe(false)
    expect(loose('entry_created', { title: 'Chuyến đi' })).toBe(false)
    expect(sent).toEqual([])
  })

  it('xếp hàng khi script chưa nạp, gửi khi nạp xong', () => {
    initAnalytics()
    expect(track('photo_uploaded')).toBe(true)
    const sent = fakeUmami()
    document.querySelector('script[data-jotly-analytics]')!.dispatchEvent(new Event('load'))
    expect(sent.map((p) => p.name)).toEqual(['photo_uploaded'])
  })

  it('pageview: /s/<token> → /s/:token, đổi query cùng trang không đếm lại', () => {
    const sent = fakeUmami()
    let listener: ((s: { location: { pathname: string } }) => void) | undefined
    startPageviews({ state: { location: { pathname: '/s/AbC_SECRET' } }, subscribe: (fn) => ((listener = fn), () => {}) })
    listener!({ location: { pathname: '/timeline' } })
    listener!({ location: { pathname: '/timeline' } })
    expect(sent.map((p) => [p.url, p.referrer])).toEqual([
      ['/s/:token', ''],
      ['/timeline', '/s/:token'],
    ])
    expect(JSON.stringify(sent)).not.toContain('SECRET')
  })

  it('login: một lần mỗi phiên tab; quên khi đăng xuất', () => {
    const sent = fakeUmami()
    trackLoginOnce()
    trackLoginOnce()
    expect(sent.filter((p) => p.name === 'login')).toHaveLength(1)
    forgetLogin()
    trackLoginOnce()
    expect(sent.filter((p) => p.name === 'login')).toHaveLength(2)
  })

  it('trackThrottled: cùng key trong khoảng thời gian chỉ gửi một lần', () => {
    const sent = fakeUmami()
    expect(trackThrottled('2026-10-18', 60_000, 'entry_updated')).toBe(true)
    expect(trackThrottled('2026-10-18', 60_000, 'entry_updated')).toBe(false)
    expect(trackThrottled('2026-10-19', 60_000, 'entry_updated')).toBe(true)
    expect(sent).toHaveLength(2)
    expect(JSON.stringify(sent)).not.toContain('2026-10-1')
  })

  it('useTrackView: mỗi key một lần, null thì chưa gửi', () => {
    const sent = fakeUmami()
    const { rerender } = renderHook(({ k }: { k: string | null }) => useTrackView('calendar_viewed', k, true), {
      initialProps: { k: null as string | null },
    })
    expect(sent).toHaveLength(0)
    rerender({ k: '2026-10' })
    rerender({ k: '2026-10' })
    rerender({ k: '2026-09' })
    expect(sent.map((p) => p.data)).toEqual([{ current_month: true }, { current_month: true }])
    renderHook(() => useTrackView('pixels_viewed', '2026', false))
    expect(sent[2]).toMatchObject({ name: 'pixels_viewed', data: { current_year: false } })
  })
})
