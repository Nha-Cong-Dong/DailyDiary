import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'
import { BackfillEntry } from './BackfillEntry'

let calls: ReturnType<typeof mockApi>

function renderBackfill(date: string) {
  function Page() {
    return <BackfillEntry date={date} />
  }
  return renderWithMe([{ path: '/', Component: Page }], '/')
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T14:12:00Z'))
  calls = mockApi(makeMe(), { '2026-10-16': makeEntry('2026-10-16') })
})
afterEach(() => {
  vi.useRealTimers()
})

// Màn nhiều icon SVG: dành thêm thời gian khi cả bộ test chạy song song.
describe('Ghi bù ngày đã bỏ trống', () => {
  it('chấm điểm là ghi bù xong; phần thêm lưu khi bấm Lưu; xem trước như trong Dòng thời gian', async () => {
    renderBackfill('2026-10-14')
    expect(await screen.findByRole('heading', { name: 'Ngày này bạn chưa ghi' })).toBeInTheDocument()
    expect(screen.getByText('4 ngày trước')).toBeInTheDocument()
    // Máy tính: trước khi chấm, phần "Thêm chút nữa?" hiện mờ và không bấm được.
    expect(screen.getByRole('heading', { name: 'Thêm chút nữa?' })).toBeInTheDocument()
    expect(screen.getByText('Mở sau khi chấm điểm')).toBeInTheDocument()
    expect(screen.getByText('Mở sau khi chấm điểm').closest('section')?.querySelector('[inert]')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Điểm 3, Nụ' }))
    expect(await screen.findByRole('heading', { name: 'Ghi bù cho ngày 14/10' })).toBeInTheDocument()
    expect(screen.queryByText('Mở sau khi chấm điểm')).not.toBeInTheDocument()
    // Tạo mới: không gửi updated_at.
    const create = calls.find((c) => c.method === 'PUT')!
    expect(create.body).toEqual({ score: 3, sub_icon: null, flag_color: null, title: null, content: null, keywords: [] })
    expect(screen.getByText(/Đã ghi bù lúc 21:12, 18\/10/)).toBeInTheDocument()
    expect(screen.getByText('Chỉ chấm điểm')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Đi xem phim' } })
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument()
    expect(screen.getByText('Đi xem phim', { selector: 'span' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(await screen.findByText('Đã lưu lúc 21:12, 18/10')).toBeInTheDocument()
    const update = calls.filter((c) => c.method === 'PUT').at(-1)!
    expect(update.body).toMatchObject({ title: 'Đi xem phim', updated_at: expect.any(String) })

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(await screen.findByRole('heading', { name: 'Ngày này bạn chưa ghi' })).toBeInTheDocument()
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/entries/2026-10-14' })
  })

  it('ngày đã có trang thì dẫn sang xem hoặc sửa', async () => {
    renderBackfill('2026-10-16')
    expect(await screen.findByRole('heading', { name: 'Ngày 16/10 đã có trang' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sửa trang' })).toHaveAttribute('href', '/day/2026-10-16/edit')
  })

  it('hôm nay thì không ghi bù mà viết luôn', async () => {
    renderBackfill('2026-10-18')
    expect(await screen.findByRole('link', { name: 'Viết cho hôm nay' })).toBeInTheDocument()
  })
})
