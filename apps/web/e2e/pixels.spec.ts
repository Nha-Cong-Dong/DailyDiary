import { expect, test } from '@playwright/test'
import { API, devLogin, WEB_ORIGIN } from './session.js'

// Year in Pixels trên API thật (GET /pixels/{year}): một request gọn, bấm ô xem nhanh ngày.

function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

test('ô hôm nay tô theo điểm; bấm ô xem nhanh trang; payload nhỏ', async ({ page }) => {
  await devLogin(page, `e2e-pixels-${test.info().project.name}-${Date.now()}@example.com`)
  const today = todayInVietnam()
  const csrf = (await page.context().cookies(API)).find((c) => c.name === 'dd_csrf')?.value ?? ''
  const put = await page.request.put(`${API}/entries/${today}`, {
    headers: { Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf },
    data: { score: 4, title: 'Một ngày yên', keywords: [], flag_color: '#E3A4A8' },
  })
  expect(put.ok()).toBe(true)

  const year = page.waitForResponse((r) => new URL(r.url()).pathname === `/pixels/${today.slice(0, 4)}`)
  await page.goto('/pixels')
  const res = await year
  expect((await res.body()).length).toBeLessThan(10 * 1024)
  const body = await res.json()
  expect(body.years).toEqual([Number(today.slice(0, 4))])
  expect(body.scores).toHaveLength(new Date(Number(today.slice(0, 4)), 1, 29).getDate() === 29 ? 366 : 365)

  const [, m, d] = today.split('-').map(Number)
  await page.getByRole('button', { name: `${d} tháng ${m}, hôm nay, điểm 4` }).click()
  // Máy tính: khung "Ngày đã chọn"; điện thoại: bảng trượt xem nhanh.
  await expect(page.getByText('Một ngày yên').filter({ visible: true }).first()).toBeVisible()

  // Tùy chọn tô theo màu cờ: nhớ lại sau khi tải lại trang.
  await page.keyboard.press('Escape') // đóng bảng xem nhanh trên điện thoại (nếu có)
  await page.getByRole('radio', { name: 'Cờ hiệu' }).click()
  const flagged = page.getByRole('button', { name: `${d} tháng ${m}, hôm nay, điểm 4, cờ Hồng phấn` })
  await expect(flagged).toBeVisible()
  await page.reload()
  await expect(flagged).toBeVisible()
})
