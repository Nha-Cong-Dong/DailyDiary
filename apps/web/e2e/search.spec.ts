import { expect, test } from '@playwright/test'
import { API, devLogin, WEB_ORIGIN } from './session.js'

// Tìm kiếm trên API thật (GET /search): gõ không dấu tìm được chữ có dấu, từ khóa không lên URL của trang.

function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

test('gõ không dấu tìm thấy trang có dấu, tô sáng chỗ khớp, URL không chứa từ khóa', async ({ page }) => {
  await devLogin(page, `e2e-search-${test.info().project.name}-${Date.now()}@example.com`)
  const today = todayInVietnam()
  const csrf = (await page.context().cookies(API)).find((c) => c.name === 'dd_csrf')?.value ?? ''
  const put = await page.request.put(`${API}/entries/${today}`, {
    headers: { Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf },
    data: { score: 4, title: 'Chiều ở Đà Lạt', content: 'Đi dạo quanh hồ Xuân Hương, trời se lạnh.', keywords: ['du lịch'] },
  })
  expect(put.ok()).toBe(true)

  await page.goto('/search')
  const box = page.getByRole('searchbox', { name: 'Từ khóa' })
  const searched = page.waitForResponse((r) => r.url().startsWith(`${API}/search?`))
  await box.fill('xuan huong')
  expect((await searched).ok()).toBe(true)
  await expect(page.getByText(/1 kết quả cho “xuan huong”/)).toBeVisible()
  await expect(page.locator('mark', { hasText: 'Xuân Hương' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Chiều ở Đà Lạt/ })).toHaveAttribute('href', `/day/${today}`)
  expect(page.url()).not.toContain('xuan')

  await box.fill('không có chữ này')
  await expect(page.getByText(/Không tìm thấy “không có chữ này”/)).toBeVisible()
})
