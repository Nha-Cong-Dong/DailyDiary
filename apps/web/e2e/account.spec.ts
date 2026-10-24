import { expect, test, type Page } from '@playwright/test'
import { API, devLogin, WEB_ORIGIN } from './session.js'

// Xóa toàn bộ dữ liệu và xóa tài khoản trên API thật + MinIO thật (Bước 12, F-07).
// WebP 1×1 hợp lệ (magic bytes RIFF…WEBP) để qua bước xác nhận ảnh.
const WEBP = Buffer.from('524946461a000000574542505650384c0d0000002f0000001007101111888808', 'hex')

function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

async function headers(page: Page) {
  const csrf = (await page.context().cookies(API)).find((c) => c.name === 'dd_csrf')?.value ?? ''
  return { Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf }
}

/** Một trang hôm nay có ảnh và link chia sẻ; trả link ảnh có chữ ký và token chia sẻ. */
async function seed(page: Page): Promise<{ photoUrl: string; token: string }> {
  const day = todayInVietnam()
  const h = await headers(page)
  expect((await page.request.put(`${API}/entries/${day}`, { headers: h, data: { score: 4, title: 'Sắp xóa' } })).ok()).toBe(true)
  const up = await (await page.request.post(`${API}/entries/${day}/photos/upload-url`, { headers: h, data: { content_type: 'image/webp' } })).json()
  for (const url of [up.upload_url, up.thumb_upload_url]) {
    expect((await page.request.put(url, { headers: up.headers, data: WEBP })).ok()).toBe(true)
  }
  const entry = await (
    await page.request.post(`${API}/entries/${day}/photos`, {
      headers: h,
      data: { photo_id: up.photo_id, content_type: 'image/webp', width: 1, height: 1 },
    })
  ).json()
  const share = await (
    await page.request.put(`${API}/entries/${day}/share`, {
      headers: h,
      data: {
        show_name: false,
        show_score: true,
        show_sub_icon: false,
        show_flag: false,
        show_title: true,
        show_content: false,
        show_keywords: false,
        photo_ids: [up.photo_id],
      },
    })
  ).json()
  return { photoUrl: entry.photos[0].url, token: share.token }
}

test.describe('xóa dữ liệu (chạy một lần trên máy tính)', () => {
  test.skip(() => test.info().project.name !== 'desktop', 'Luồng giống nhau trên điện thoại')

  test('xóa toàn bộ dữ liệu: trang, ảnh, link chia sẻ mất; tài khoản vẫn dùng được', async ({ page }) => {
    await devLogin(page, `e2e-wipe-${Date.now()}@example.com`)
    const { photoUrl, token } = await seed(page)
    expect((await page.request.get(photoUrl)).status()).toBe(200)

    await page.goto('/profile')
    await page.getByRole('button', { name: 'Xóa dữ liệu' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Xóa toàn bộ dữ liệu?' })
    await expect(dialog.getByText(/1 trang, kèm mọi điểm, 1 ảnh và link chia sẻ/)).toBeVisible()
    await dialog.getByLabel(/để xác nhận/).fill('XÓA')
    await dialog.getByRole('button', { name: 'Xóa vĩnh viễn' }).click()
    await expect(page.getByText(/Đã xóa toàn bộ dữ liệu/)).toBeVisible()

    await expect.poll(async () => (await page.request.get(photoUrl)).status(), { timeout: 10_000 }).toBe(404)
    expect((await page.request.get(`${API}/public/shares/${token}`)).status()).toBe(404)
    expect((await page.request.get(`${API}/entries/${todayInVietnam()}`)).status()).toBe(404)
    expect((await page.request.get(`${API}/me`)).status()).toBe(200)
  })

  test('xóa tài khoản: đăng xuất, ảnh và link mất; đăng nhập lại là tài khoản mới trống', async ({ page }) => {
    const email = `e2e-delete-${Date.now()}@example.com`
    await devLogin(page, email)
    const firstJoined = (await (await page.request.get(`${API}/me`)).json()).joined_at
    const { photoUrl, token } = await seed(page)

    await page.goto('/profile')
    await page.getByRole('button', { name: 'Xóa tài khoản' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Xóa tài khoản Jotly?' })
    await dialog.getByLabel(/để xác nhận/).fill(email)
    await dialog.getByRole('button', { name: 'Xóa tài khoản' }).click()
    const done = page.getByRole('alertdialog', { name: 'Tài khoản đã được xóa' })
    await expect(done).toBeVisible()
    expect((await page.request.get(`${API}/me`)).status()).toBe(401)
    await done.getByRole('button', { name: 'Về trang chủ' }).click()
    await expect(page).toHaveURL(`${WEB_ORIGIN}/`)

    await expect.poll(async () => (await page.request.get(photoUrl)).status(), { timeout: 10_000 }).toBe(404)
    expect((await page.request.get(`${API}/public/shares/${token}`)).status()).toBe(404)

    // Dọn xong (nền) thì đăng nhập lại bằng cùng email là tài khoản mới, trống.
    await expect
      .poll(async () => (await page.request.post(`${API}/auth/dev-login`, { headers: { Origin: WEB_ORIGIN }, data: { email } })).status())
      .toBe(200)
    const me = await (await page.request.get(`${API}/me`)).json()
    expect(me.joined_at).not.toBe(firstJoined)
    expect(await (await page.request.get(`${API}/me/data-summary`)).json()).toEqual({ pages: 0, photos: 0, share_links: 0, trash: 0 })
  })

  test('thùng rác: trang vừa xóa nằm trong thùng rác, khôi phục thì quay lại', async ({ page }) => {
    await devLogin(page, `e2e-trash-${Date.now()}@example.com`)
    const day = todayInVietnam()
    const h = await headers(page)
    await page.request.put(`${API}/entries/${day}`, { headers: h, data: { score: 3, title: 'Lỡ tay xóa' } })
    expect((await page.request.delete(`${API}/entries/${day}`, { headers: h })).ok()).toBe(true)

    await page.goto('/profile')
    await page.getByRole('link', { name: 'Mở thùng rác' }).click()
    await expect(page.getByRole('heading', { name: 'Thùng rác' })).toBeVisible()
    await page.getByRole('button', { name: /Khôi phục trang/ }).click()
    await expect(page.getByText(/Đã khôi phục trang/)).toBeVisible()
    await expect(page.getByText('Thùng rác trống')).toBeVisible()
    expect((await (await page.request.get(`${API}/entries/${day}`)).json()).title).toBe('Lỡ tay xóa')
  })
})
