import { expect, test } from '@playwright/test'
import { API, devLogin, WEB_ORIGIN } from './session.js'

// Dòng thời gian theo tháng trên API thật (GET /entries?month=YYYY-MM).

function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

test('trang vừa ghi hiện trong tháng; xóa trang thì về màn trống của người mới', async ({ page }) => {
  await devLogin(page, `e2e-timeline-${test.info().project.name}-${Date.now()}@example.com`)
  const today = todayInVietnam()
  const csrf = (await page.context().cookies(API)).find((c) => c.name === 'dd_csrf')?.value ?? ''
  const headers = { Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf }
  const long = 'Đi bộ quanh hồ, trời mát. '.repeat(40) // ~1000 ký tự
  const put = await page.request.put(`${API}/entries/${today}`, {
    headers,
    data: { score: 4, title: 'Đi bộ buổi sáng', content: long, keywords: ['đi bộ'] },
  })
  expect(put.ok()).toBe(true)

  const month = page.waitForResponse((r) => new URL(r.url()).pathname === '/entries' && r.request().method() === 'GET')
  await page.goto('/timeline')
  const body = await (await month).json()
  expect(body.month).toBe(today.slice(0, 7))
  expect(body.entries[0].excerpt.length).toBeLessThanOrEqual(300) // không tải cả nội dung
  await expect(page.getByRole('link', { name: /Đi bộ buổi sáng/ }).first()).toHaveAttribute('href', `/day/${today}`)

  expect((await page.request.delete(`${API}/entries/${today}`, { headers })).ok()).toBe(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Trang đầu tiên đang chờ bạn' })).toBeVisible()
})
