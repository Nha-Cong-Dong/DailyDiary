import type { Page } from '@playwright/test'

// Cổng API của e2e, cùng biến với playwright.config.ts (mặc định 8000 như CI).
export const API = `http://localhost:${process.env.E2E_API_PORT ?? '8000'}`
export const WEB_ORIGIN = 'http://localhost:5173'

/** Đăng nhập thử qua API (chỉ có khi DEV_LOGIN=true). Cookie không phân biệt cổng nên dùng được cho :5173. */
export async function devLogin(page: Page, email: string, { onboarded = true } = {}) {
  const r = await page.request.post(`${API}/auth/dev-login`, { headers: { Origin: WEB_ORIGIN }, data: { email } })
  if (!r.ok()) throw new Error(`dev-login lỗi ${r.status()}`)
  if (onboarded) {
    const csrf = (await page.context().cookies(API)).find((c) => c.name === 'dd_csrf')?.value ?? ''
    const p = await page.request.patch(`${API}/me`, {
      headers: { Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf },
      data: { onboarded: true },
    })
    if (!p.ok()) throw new Error(`PATCH /me lỗi ${p.status()}`)
  }
}
