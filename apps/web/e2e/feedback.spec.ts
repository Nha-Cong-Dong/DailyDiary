import { expect, test } from '@playwright/test'
import { devLogin } from './session.js'

// Góp ý đi trọn đường: form trong Hồ sơ → POST /feedback → API gửi SMTP → Mailpit (docker compose) bắt thư.
const MAILPIT = 'http://localhost:8025/api/v1'

type MailpitMessage = { ID: string; Subject: string; ReplyTo: { Address: string }[] }

test('gửi góp ý từ Hồ sơ: thư tới hộp thư Jotly, Reply-To là người gửi', async ({ page, request }) => {
  test.skip(test.info().project.name !== 'desktop', 'Luồng gửi giống nhau; chạy một lần để không trùng thư')
  const email = `e2e-feedback-${Date.now()}@example.com`
  await devLogin(page, email)
  const marker = `nhắc viết lúc 21 giờ #${Date.now()}`

  await page.goto('/profile')
  await page.getByRole('button', { name: 'Gửi góp ý' }).filter({ visible: true }).click()
  await expect(page.getByRole('dialog', { name: 'Góp ý cho Jotly' })).toBeVisible()
  const dialog = page.getByRole('dialog') // gửi xong tiêu đề đổi thành "Cảm ơn bạn!"
  await dialog.getByLabel('Nội dung góp ý').fill(`Mình muốn có ${marker}.`)
  await dialog.getByRole('button', { name: 'Gửi góp ý' }).click()
  await expect(dialog.getByText('Cảm ơn bạn!')).toBeVisible()

  // Thư gửi trong nền sau khi API đã trả lời: chờ tới khi Mailpit nhận được.
  let found: MailpitMessage | undefined
  await expect
    .poll(
      async () => {
        const list = (await (await request.get(`${MAILPIT}/messages?limit=50`)).json()) as { messages: MailpitMessage[] }
        found = list.messages.find((m) => m.ReplyTo.some((r) => r.Address === email))
        return Boolean(found)
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  expect(found!.Subject).toMatch(/^\[Jotly\] Góp ý từ /)
  const full = (await (await request.get(`${MAILPIT}/message/${found!.ID}`)).json()) as { Text: string }
  expect(full.Text).toContain(marker)
  expect(full.Text).toContain(email)
})
