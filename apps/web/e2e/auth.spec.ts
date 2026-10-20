import { expect, test } from '@playwright/test'
import { devLogin } from './session.js'

test('chưa đăng nhập thì trang trong app chuyển về /login', async ({ page }) => {
  await page.goto('/today')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Đăng nhập vào Jotly' })).toBeVisible()
})

test('đăng nhập thử → lần đầu → hôm nay; đổi tên giữ sau khi tải lại; đăng xuất', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  await devLogin(page, email, { onboarded: false })

  await page.goto('/today')
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByLabel('Tên hiển thị').fill('Người Thử')
  await page.getByRole('button', { name: /Tiếp tục/ }).click()
  await page.getByRole('button', { name: /Hoa anh đào/ }).click()
  await page.getByRole('button', { name: /Tiếp tục/ }).click()
  await page.getByRole('button', { name: /Bắt đầu viết/ }).click()
  await expect(page).toHaveURL(/\/today$/)

  await page.goto('/profile')
  await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Người Thử')
  await page.getByLabel('Tên hiển thị').fill('Người Thử Hai')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã lưu')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Người Thử Hai')
  await expect(page.getByRole('button', { name: 'Hoa anh đào' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login$/)
})
