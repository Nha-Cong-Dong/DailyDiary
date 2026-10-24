import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrashPage } from '@/routes/TrashPage'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'

describe('Thùng rác', () => {
  it('liệt kê trang đã xóa, khôi phục thì trang rời thùng rác', async () => {
    const me = makeMe()
    const store = { '2026-10-05': makeEntry('2026-10-05', { title: 'Chiều mưa' }) }
    const calls = mockApi(me, store)
    // Xóa mềm qua API giả để trang vào thùng rác.
    await fetch(new Request('http://localhost:8000/entries/2026-10-05', { method: 'DELETE' }))
    renderWithMe([{ path: '/profile/trash', Component: TrashPage }], '/profile/trash', me)

    const item = (await screen.findByText('Chiều mưa')).closest('li')!
    expect(within(item).getByText(/Khôi phục được · còn 30 ngày/)).toBeInTheDocument()
    fireEvent.click(within(item).getByRole('button', { name: /Khôi phục trang/ }))

    expect(await screen.findByText(/Đã khôi phục trang/)).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/entries/2026-10-05/restore')).toBe(true)
    expect(await screen.findByText('Thùng rác trống')).toBeInTheDocument()
  })

  it('thùng rác trống', async () => {
    const me = makeMe()
    mockApi(me)
    renderWithMe([{ path: '/profile/trash', Component: TrashPage }], '/profile/trash', me)
    expect(await screen.findByText('Thùng rác trống')).toBeInTheDocument()
  })
})
