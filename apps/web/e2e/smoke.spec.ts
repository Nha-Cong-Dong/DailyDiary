import { expect, test } from '@playwright/test'
import { devLogin } from './session.js'

test('landing tải được', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Chạm để ghi chú, mở để nhìn lại.' })).toBeVisible()
})

test('trang /dev/ui kết nối được API', async ({ page }) => {
  await page.goto('/dev/ui')
  await expect(page.getByRole('heading', { name: 'Hệ thiết kế' })).toBeVisible()
  await expect(page.getByText('API: ok')).toBeVisible()
})

// Trang công khai và trang trong app (đăng nhập thử trước).
const PUBLIC = ['/', '/login', '/dev/ui']
const APP = ['/today', '/onboarding', '/day/2026-10-18', '/pixels', '/search', '/profile']

for (const path of [...PUBLIC, ...APP]) {
  test(`không có thanh cuộn ngang ở ${path} (kể cả màn hình 360 px)`, async ({ page }, info) => {
    if (APP.includes(path)) await devLogin(page, `overflow-${info.project.name}@example.com`)
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
}
