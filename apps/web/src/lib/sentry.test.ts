import * as Sentry from '@sentry/react'
import type { Breadcrumb, BrowserOptions, ErrorEvent } from '@sentry/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initSentry, rootErrorOptions, scrubBreadcrumb, scrubEvent, scrubMessage } from './sentry'

const TITLE = 'Chuyến đi Đà Lạt bí mật'
const CONTENT = 'Hôm nay mình đã khóc rất nhiều'
const KEYWORD = 'tukhoariengtu'
const EMAIL = 'ban.be@example.com'
const TOKEN = 'AbC_123-xyzSECRETTOKEN'
const SECRETS = [TITLE, CONTENT, KEYWORD, EMAIL, TOKEN]

const expectClean = (value: unknown) => {
  const text = JSON.stringify(value)
  for (const s of SECRETS) expect(text).not.toContain(s)
}

describe('scrubBreadcrumb', () => {
  it('bỏ click, gõ phím, console và loại lạ', () => {
    expect(scrubBreadcrumb({ category: 'ui.click', message: `button "${TITLE}"` })).toBeNull()
    expect(scrubBreadcrumb({ category: 'ui.input', message: CONTENT })).toBeNull()
    expect(scrubBreadcrumb({ category: 'console', message: CONTENT, data: { arguments: [CONTENT] } })).toBeNull()
    expect(scrubBreadcrumb({ category: 'sentry.event', message: `Error: ${TITLE}` })).toBeNull()
  })

  it('fetch/xhr chỉ giữ method, đường dẫn đã làm sạch, mã trạng thái', () => {
    const crumb: Breadcrumb = {
      type: 'http',
      category: 'fetch',
      level: 'info',
      timestamp: 1,
      data: {
        method: 'GET',
        url: `http://localhost:8000/search?q=${KEYWORD}#${EMAIL}`,
        status_code: 200,
        request_body_size: 10,
        __span: 'x',
      },
    }
    expect(scrubBreadcrumb(crumb)).toEqual({
      type: 'http',
      category: 'fetch',
      level: 'info',
      timestamp: 1,
      data: { method: 'GET', url: 'http://localhost:8000/search', status_code: 200 },
    })
    const share = scrubBreadcrumb({ category: 'xhr', data: { method: 'GET', url: `/public/shares/${TOKEN}?x=1` } })
    expect(share?.data).toEqual({ method: 'GET', url: '/public/shares/:token' })
  })

  it('điều hướng: from/to bỏ query, hash, che token', () => {
    const out = scrubBreadcrumb({ category: 'navigation', data: { from: `/search?q=${KEYWORD}`, to: `/s/${TOKEN}#x` } })
    expect(out?.data).toEqual({ from: '/search', to: '/s/:token' })
  })
})

describe('scrubMessage', () => {
  it('làm sạch URL, che token, thay đoạn trong ngoặc kép, cắt ngắn', () => {
    expect(scrubMessage(`Failed to fetch https://api.jotly.vn/search?q=${KEYWORD}`)).toBe('Failed to fetch https://api.jotly.vn/search')
    expect(scrubMessage(`Không mở được /s/${TOKEN}`)).toBe('Không mở được /s/:token')
    expect(scrubMessage(`Unexpected token 'H', "${CONTENT}"... is not valid JSON`)).toBe(
      `Unexpected token 'H', "[đã lọc]"... is not valid JSON`,
    )
    expect(scrubMessage('x'.repeat(500)).length).toBeLessThanOrEqual(201)
  })
})

describe('scrubEvent', () => {
  it('sự kiện ra không còn tiêu đề, nội dung, từ khóa, email, token', () => {
    const event = {
      type: undefined,
      message: `Lỗi "${TITLE}"`,
      transaction: `/s/${TOKEN}`,
      request: {
        url: `https://jotly.vn/s/${TOKEN}?q=${KEYWORD}#${EMAIL}`,
        query_string: `q=${KEYWORD}`,
        data: { title: TITLE, content: CONTENT },
        cookies: { dd_session: TOKEN },
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: `https://jotly.vn/search?q=${KEYWORD}`, Cookie: TOKEN },
      },
      exception: {
        values: [
          {
            type: 'SyntaxError',
            value: `Unexpected token, "${CONTENT}" is not valid JSON at https://jotly.vn/s/${TOKEN}`,
            mechanism: { type: 'onerror', handled: false, data: { note: TITLE } },
            stacktrace: {
              frames: [
                {
                  filename: `https://jotly.vn/s/${TOKEN}?q=${KEYWORD}`,
                  function: 'save',
                  vars: { title: TITLE },
                },
                { filename: '<anonymous>', function: 'x' },
              ],
            },
          },
        ],
      },
      breadcrumbs: [
        { category: 'ui.click', message: `div > "${TITLE}"` },
        { category: 'console', message: CONTENT },
        { category: 'fetch', data: { method: 'PUT', url: `/entries/2026-10-18?q=${KEYWORD}`, status_code: 500 } },
      ],
      user: { id: 'u1', email: EMAIL, username: TITLE, ip_address: '1.2.3.4' },
      extra: { body: CONTENT },
      contexts: { react: { componentStack: 'at Timeline' }, state: { title: TITLE } },
    } as unknown as ErrorEvent

    const out = scrubEvent(event)
    expectClean(out)
    expect(out.request).toEqual({ url: 'https://jotly.vn/s/:token', headers: { 'User-Agent': 'Mozilla/5.0' } })
    expect(out.transaction).toBe('/s/:token')
    expect(out.user).toEqual({ id: 'u1' })
    expect(out.extra).toBeUndefined()
    expect(Object.keys(out.contexts ?? {})).toEqual(['react'])
    expect(out.breadcrumbs).toEqual([{ category: 'fetch', data: { method: 'PUT', url: '/entries/2026-10-18', status_code: 500 } }])
    const frames = out.exception?.values?.[0].stacktrace?.frames
    expect(frames?.[0]).toEqual({ filename: 'https://jotly.vn/s/:token', function: 'save' })
    expect(frames?.[1].filename).toBe('<anonymous>')
    expect(out.exception?.values?.[0].type).toBe('SyntaxError')
  })

  it('không có user.id thì bỏ cả user', () => {
    const out = scrubEvent({ type: undefined, user: { email: EMAIL } } as ErrorEvent)
    expect(out.user).toBeUndefined()
  })
})

describe('initSentry', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('không có DSN thì không khởi tạo, không gắn handler lỗi cho React', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    expect(initSentry()).toBe(false)
    expect(rootErrorOptions()).toEqual({})
  })
  it('lỗi thật: mọi envelope gửi đi đã sạch (URL trang, breadcrumb, thông điệp)', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@o0.ingest.sentry.io/0')
    const bodies: string[] = []
    const transport: BrowserOptions['transport'] = (options) =>
      Sentry.createTransport(options, async (req) => {
        bodies.push(typeof req.body === 'string' ? req.body : new TextDecoder().decode(req.body))
        return { statusCode: 200 }
      })
    window.history.pushState({}, '', `/s/${TOKEN}?q=${KEYWORD}#${EMAIL}`)
    try {
      expect(initSentry(transport)).toBe(true)
      expect(rootErrorOptions()).toHaveProperty('onCaughtError')
      vi.spyOn(console, 'info').mockImplementation(() => {})
      console.info(CONTENT)
      Sentry.addBreadcrumb({ category: 'ui.click', message: TITLE })
      Sentry.addBreadcrumb({ category: 'navigation', data: { from: `/search?q=${KEYWORD}`, to: `/s/${TOKEN}` } })
      Sentry.captureException(new Error(`Không lưu được "${CONTENT}" tại https://jotly.vn/search?q=${KEYWORD}`))
      await Sentry.flush(2000)
      const all = bodies.join('\n')
      expect(all).toContain('/s/:token')
      expect(all).toContain('Không lưu được')
      for (const s of SECRETS) expect(all).not.toContain(s)
    } finally {
      await Sentry.close()
      window.history.pushState({}, '', '/')
    }
  })
})
