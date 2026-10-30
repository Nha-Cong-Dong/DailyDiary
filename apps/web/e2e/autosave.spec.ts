import { expect, test, type Page } from '@playwright/test'
import { API, devLogin } from './session.js'

// Bước 6 (F-06): ba tình huống kiểm tay trong kế hoạch, chạy tự động.
function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

async function startToday(page: Page, tag: string) {
  await devLogin(page, `e2e-autosave-${tag}-${test.info().project.name}-${Date.now()}@example.com`)
  await page.goto('/today')
  await page.getByRole('button', { name: 'Điểm 3, Nụ' }).click()
  await expect(page.getByText(/Đã ghi lại hôm nay lúc/)).toBeVisible()
}

async function serverEntry(page: Page) {
  const r = await page.request.get(`${API}/entries/${todayInVietnam()}`)
  expect(r.ok()).toBe(true)
  return (await r.json()) as { title: string | null; content: string | null }
}

test('mất mạng: gõ tiếp, có mạng lại thì tự đồng bộ', async ({ page, context }) => {
  await startToday(page, 'offline')
  await context.setOffline(true)
  await page.getByLabel('Nội dung').fill('Viết lúc mất mạng.')
  await expect(page.getByText('Chưa đồng bộ', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/vẫn được giữ trên trình duyệt này/)).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByText(/^Đã lưu lúc/)).toBeVisible({ timeout: 10_000 })
  expect((await serverEntry(page)).content).toBe('Viết lúc mất mạng.')
})

test('sửa ở 2 tab: tab sau gặp hộp thoại chọn bản, giữ bản của mình', async ({ page, context }) => {
  await startToday(page, 'twotabs')
  const other = await context.newPage()
  await other.goto('/today')
  await expect(other.getByRole('button', { name: 'Điểm 3, Nụ' })).toHaveAttribute('aria-pressed', 'true')

  await other.getByLabel('Tiêu đề').fill('Viết ở tab hai')
  await other.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(other.getByText(/^Đã lưu lúc/)).toBeVisible()

  await page.getByLabel('Tiêu đề').fill('Viết ở tab một')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Trang này vừa được sửa ở nơi khác' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Viết ở tab hai')).toBeVisible()
  await dialog.getByRole('button', { name: 'Giữ bản của tôi' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/^Đã lưu lúc/)).toBeVisible()
  expect((await serverEntry(page)).title).toBe('Viết ở tab một')
})

test('F5 trước khi kịp đồng bộ: chữ vẫn còn', async ({ page }) => {
  await startToday(page, 'reload')
  await page.getByLabel('Nội dung').fill('Gõ xong bấm F5 ngay.')
  // Chờ nháp được ghi (1 s) nhưng chưa tới lúc đồng bộ (4 s).
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.getByLabel('Nội dung')).toHaveValue('Gõ xong bấm F5 ngay.')
  // Lưu kịp lúc rời trang (pagehide), hoặc nạp lại nháp rồi lưu sau khi mở lại: cách nào máy chủ cũng có bản này.
  await expect.poll(async () => (await serverEntry(page)).content, { timeout: 10_000 }).toBe('Gõ xong bấm F5 ngay.')
})

test('F5 khi máy chủ chưa nhận được: chữ nạp lại từ nháp trên trình duyệt rồi lưu lên', async ({ page }) => {
  await startToday(page, 'draft')
  // Chặn mọi lần lưu: chữ chỉ còn trong nháp IndexedDB.
  await page.route('**/entries/**', (route) => (route.request().method() === 'PUT' ? route.abort() : route.continue()))
  await page.getByLabel('Tiêu đề').fill('Chỉ có trong nháp')
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.getByLabel('Tiêu đề')).toHaveValue('Chỉ có trong nháp')
  await expect(page.getByText('Đã khôi phục phần bạn viết dở lần trước.')).toBeVisible()
  expect((await serverEntry(page)).title).toBeNull()

  await page.unroute('**/entries/**')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect.poll(async () => (await serverEntry(page)).title, { timeout: 10_000 }).toBe('Chỉ có trong nháp')
})
