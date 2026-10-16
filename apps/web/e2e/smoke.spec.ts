import { expect, test } from '@playwright/test'

test('trang chủ tải được và kết nối được API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'DailyDiary' })).toBeVisible()
  await expect(page.getByText('API: ok')).toBeVisible()
})

test('không có thanh cuộn ngang (kể cả màn hình 360 px)', async ({ page }) => {
  await page.goto('/')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})
