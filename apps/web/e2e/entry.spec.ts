import { expect, test } from '@playwright/test'
import { devLogin } from './session.js'

// "Hôm nay" theo múi giờ hồ sơ của người đăng nhập thử (Asia/Ho_Chi_Minh), không theo giờ máy chạy test.
function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

test('chấm điểm hôm nay → tải lại vẫn còn → xóa trang → hoàn tác', async ({ page }) => {
  await devLogin(page, `e2e-entry-${test.info().project.name}-${Date.now()}@example.com`)
  const today = todayInVietnam()

  await page.goto('/today')
  await page.getByRole('button', { name: 'Điểm 4, Hé nở' }).click()
  await expect(page.getByText(/Đã ghi lại hôm nay lúc/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Điểm 4, Hé nở' })).toHaveAttribute('aria-pressed', 'true')

  await page.goto(`/day/${today}`)
  // Máy tính: nút thùng rác cạnh Sửa; điện thoại: nút "Xóa trang này" cuối trang.
  await page.getByRole('button', { name: /^Xóa (nhật ký ngày này|trang này)$/ }).filter({ visible: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa nhật ký' }).click()
  await expect(page.getByRole('button', { name: 'Khôi phục trang' })).toBeVisible()

  await page.getByRole('status').getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(page.getByRole('button', { name: 'Khôi phục trang' })).toBeHidden()
  await page.reload()
  await expect(page.getByRole('button', { name: /^Xóa (nhật ký ngày này|trang này)$/ }).filter({ visible: true })).toBeVisible()
})

test('thêm màu cờ riêng từ bảng pha màu → trang mang màu đó → Hồ sơ gỡ được', async ({ page }) => {
  await devLogin(page, `e2e-flag-${test.info().project.name}-${Date.now()}@example.com`)

  await page.goto('/today')
  await page.getByRole('button', { name: 'Điểm 3, Nụ' }).click()
  await expect(page.getByText(/Đã ghi lại hôm nay lúc/)).toBeVisible()
  // Không điều khiển được bảng pha màu của hệ điều hành; fill() đặt giá trị và phát `change` như khi chọn xong.
  // Tự lưu sau ~4 s ngừng sửa: chờ PUT mang đúng màu rồi tải lại.
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.ok() && r.request().postData()?.includes('#3A7BD5') === true,
    { timeout: 15_000 },
  )
  await page.locator('input[type="color"]').fill('#3a7bd5')
  const custom = page.getByRole('button', { name: 'Cờ màu riêng #3A7BD5' })
  await expect(custom).toHaveAttribute('aria-pressed', 'true')
  await saved
  await page.reload()
  await expect(custom).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/profile')
  await page.getByRole('button', { name: 'Gỡ màu #3A7BD5' }).click()
  await expect(page.getByText('Chưa có màu riêng nào.')).toBeVisible()
})
