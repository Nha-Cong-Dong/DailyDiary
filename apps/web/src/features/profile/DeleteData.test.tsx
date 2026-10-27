import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfilePage } from '@/routes/ProfilePage'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'

function store() {
  return {
    '2026-10-01': makeEntry('2026-10-01', { photos: [{ id: 'p1', position: 0, width: 10, height: 10 }] }),
    '2026-10-02': makeEntry('2026-10-02'),
  }
}

describe('Xóa dữ liệu và tài khoản (F-07)', () => {
  it('xóa toàn bộ dữ liệu: hộp thoại báo đúng số trang/ảnh, gửi DELETE /entries với "XÓA", giữ tài khoản', async () => {
    const me = makeMe()
    const calls = mockApi(me, store())
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)
    fireEvent.click((await screen.findAllByRole('button', { name: /Xóa dữ liệu|Xóa toàn bộ dữ liệu/ }))[0])
    const dialog = await screen.findByRole('alertdialog', { name: 'Xóa toàn bộ dữ liệu?' })
    expect(await within(dialog).findByText(/2 trang, kèm mọi điểm, 1 ảnh và link chia sẻ/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/để xác nhận/), { target: { value: 'XÓA' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa vĩnh viễn' }))

    expect(await screen.findByText(/Đã xóa toàn bộ dữ liệu/)).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'DELETE')).toMatchObject({ path: '/entries', body: { confirm: 'XÓA' } })
    expect(calls.some((c) => c.path === '/me' && c.method === 'DELETE')).toBe(false)
  })

  it('xóa tài khoản: gửi DELETE /me với email, hiện "Tài khoản đã được xóa", Về trang chủ', async () => {
    const me = makeMe()
    const calls = mockApi(me, store())
    const { router } = renderWithMe(
      [
        { path: '/profile', Component: ProfilePage },
        { path: '/', element: <h1>Trang chủ</h1> },
      ],
      '/profile',
      me,
    )
    fireEvent.click((await screen.findAllByRole('button', { name: /Xóa tài khoản/ }))[0])
    const dialog = await screen.findByRole('alertdialog', { name: 'Xóa tài khoản Jotly?' })
    expect(within(dialog).getByText(/Góp ý bạn từng gửi được giữ lại nhưng không còn tên hay email/)).toBeInTheDocument()
    expect(within(dialog).getByText(/sao lưu tự động có thể còn dữ liệu tối đa 7 ngày/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/để xác nhận/), { target: { value: me.email } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa tài khoản' }))

    const done = await screen.findByRole('alertdialog', { name: 'Tài khoản đã được xóa' })
    expect(calls.find((c) => c.method === 'DELETE')).toMatchObject({ path: '/me', body: { confirm_email: me.email } })
    fireEvent.click(within(done).getByRole('button', { name: 'Về trang chủ' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('phiên đăng nhập đã cũ: máy chủ đòi đăng nhập lại, hiện nút "Đăng nhập lại" quay về Hồ sơ', async () => {
    const me = makeMe()
    mockApi(me, store())
    const real = vi.mocked(globalThis.fetch).getMockImplementation()!
    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const request = input as Request
      if (request.method === 'DELETE' && new URL(request.url).pathname === '/me') {
        const body = { error: { code: 'REAUTH_REQUIRED', message: 'Đăng nhập lại để xác nhận xóa tài khoản' } }
        return new Response(JSON.stringify(body), { status: 403, headers: { 'Content-Type': 'application/json' } })
      }
      return real(input, init)
    })
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)
    fireEvent.click((await screen.findAllByRole('button', { name: /Xóa tài khoản/ }))[0])
    const dialog = await screen.findByRole('alertdialog', { name: 'Xóa tài khoản Jotly?' })
    fireEvent.change(within(dialog).getByLabelText(/để xác nhận/), { target: { value: me.email } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa tài khoản' }))

    const relogin = await screen.findByRole('link', { name: 'Đăng nhập lại' })
    expect(relogin.getAttribute('href')).toContain('next=%2Fprofile')
    expect(screen.queryByRole('alertdialog', { name: 'Tài khoản đã được xóa' })).not.toBeInTheDocument()
  })
})
