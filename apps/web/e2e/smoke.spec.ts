import { expect, test } from '@playwright/test'

test('landing tải được', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Chạm để ghi chú, mở để nhìn lại.' })).toBeVisible()
})

test('trang /dev/ui kết nối được API', async ({ page }) => {
  await page.goto('/dev/ui')
  await expect(page.getByRole('heading', { name: 'Hệ thiết kế' })).toBeVisible()
  await expect(page.getByText('API: ok')).toBeVisible()
})

for (const path of ['/', '/dev/ui']) {
  test(`không có thanh cuộn ngang ở ${path} (kể cả màn hình 360 px)`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
}
