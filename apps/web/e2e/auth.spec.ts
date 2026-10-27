import { expect, test } from '@playwright/test'
import { devLogin } from './session.js'

test('chưa đăng nhập thì trang trong app chuyển về /login', async ({ page }) => {
  await page.goto('/today')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Đăng nhập vào Jotly' })).toBeVisible()
})

test('đăng nhập thử → lần đầu → hôm nay; đổi tên giữ sau khi tải lại; đăng xuất', async ({ page }) => {
  const email = `e2e-${test.info().project.name}-${Date.now()}@example.com`
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
  // Điện thoại (B10 · Hồ sơ): sửa tên trong bảng trượt mở từ nút "Sửa"; máy tính sửa ngay trên trang.
  const phone = (page.viewportSize()?.width ?? 1280) < 768
  if (phone) await page.getByRole('button', { name: 'Sửa', exact: true }).click()
  const nameField = page.getByLabel('Tên hiển thị').filter({ visible: true })
  await expect(nameField).toHaveValue('Người Thử')
  await nameField.fill('Người Thử Hai')
  await page.getByRole('button', { name: phone ? 'Lưu' : 'Lưu thay đổi', exact: true }).filter({ visible: true }).click()
  await expect(page.getByText(phone ? 'Đã lưu tên hiển thị.' : 'Đã lưu', { exact: true })).toBeVisible()
  await page.reload()
  if (phone) await expect(page.getByText('Người Thử Hai', { exact: true }).first()).toBeVisible()
  else await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Người Thử Hai')
  await expect(page.getByRole('button', { name: 'Hoa anh đào' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login$/)
})
