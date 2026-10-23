import { expect, test, type Page } from '@playwright/test'
import { devLogin } from './session.js'

// Chạy trên kho ảnh thật (MinIO trong docker compose): nén trên trình duyệt → presigned PUT → xác nhận.

function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

/** Ảnh JPEG thật 2400×1600 (vẽ bằng canvas của chính trình duyệt) để kiểm tra nén về 1920 px. */
async function makeJpeg(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2400
    canvas.height = 1600
    const ctx = canvas.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 2400, 1600)
    g.addColorStop(0, '#E3A4A8')
    g.addColorStop(1, '#8DB6D9')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2400, 1600)
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]!
  })
  return Buffer.from(base64, 'base64')
}

test('thêm ảnh ở Hôm nay → Trang ngày hiện ảnh bằng link ký → link không ký bị chặn → bỏ ảnh', async ({ page }) => {
  await devLogin(page, `e2e-photo-${test.info().project.name}-${Date.now()}@example.com`)
  const today = todayInVietnam()

  await page.goto('/today')
  await page.getByRole('button', { name: 'Điểm 4, Hé nở' }).click()
  await expect(page.getByText(/Đã ghi lại hôm nay lúc/)).toBeVisible()

  const confirmed = page.waitForResponse((r) => r.request().method() === 'POST' && /\/photos$/.test(new URL(r.url()).pathname))
  const started = Date.now()
  await page.getByLabel('Chọn ảnh cho hôm nay').setInputFiles({ name: 'chieu.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page) })
  const res = await confirmed
  expect(res.status()).toBe(200)
  expect(Date.now() - started).toBeLessThan(5000) // tiêu chí Bước 7: dưới 5 giây
  const photo = (await res.json()).photos[0]
  expect(Math.max(photo.width, photo.height)).toBe(1920) // đã thu về cạnh dài 1920 px
  await expect(page.getByRole('button', { name: 'Ảnh · 1/10' })).toBeVisible()

  await page.goto(`/day/${today}`)
  const thumb = page.getByRole('button', { name: 'Mở ảnh 1 trên 1' }).locator('img')
  await expect(thumb).toHaveAttribute('src', /X-Amz-Signature=/)
  const signed = (await thumb.getAttribute('src'))!
  expect((await page.request.get(signed)).status()).toBe(200)
  expect((await page.request.get(signed.split('?')[0]!)).status()).toBe(403) // kho riêng tư

  await page.goto('/today')
  await page.getByRole('button', { name: /^Bỏ ảnh/ }).click()
  await expect(page.getByRole('button', { name: 'Ảnh · 0/10' })).toBeVisible()
  await expect.poll(async () => (await page.request.get(signed)).status()).toBe(404) // đã xóa khỏi kho
})

test('đổi ảnh đại diện: cắt vuông, tải lên kho, hiện bằng link ký; gỡ ảnh', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Điện thoại sửa ảnh trong bảng "Sửa hồ sơ"; luồng tải lên giống nhau')
  await devLogin(page, `e2e-avatar-${Date.now()}@example.com`)
  await page.goto('/profile')
  const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === '/me')
  await page.getByLabel('Chọn ảnh đại diện').first().setInputFiles({ name: 'me.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page) })
  const me = await (await patched).json()
  expect(me.avatar_url).toMatch(/\/avatar\/.+X-Amz-Signature=/)
  await expect(page.locator(`img[src="${me.avatar_url}"]`).first()).toBeVisible()
  const size = await page.locator(`img[src="${me.avatar_url}"]`).first().evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])
  expect(size).toEqual([256, 256])

  await page.getByRole('button', { name: 'Gỡ ảnh' }).first().click()
  await expect(page.locator(`img[src="${me.avatar_url}"]`)).toHaveCount(0)
})
