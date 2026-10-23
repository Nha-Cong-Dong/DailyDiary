import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'
import { EditEntry } from './EditEntry'

const DAY = '2026-10-16'
const saved = () =>
  makeEntry(DAY, {
    score: 5,
    title: 'Tan làm sớm',
    content: 'Có thời gian nấu một bữa tối tử tế.',
    sub_icon: '🌸',
    flag_color: '#83C8B5',
    photos: [
      { id: 'p1', position: 0, width: 1920, height: 1440 },
      { id: 'p2', position: 1, width: 1920, height: 1440 },
    ],
  })
let calls: ReturnType<typeof mockApi>
let store: Record<string, ReturnType<typeof makeEntry>>

function Edit() {
  return <EditEntry date="2026-10-16" />
}

function renderEdit() {
  return renderWithMe(
    [
      { path: '/day/:date/edit', Component: Edit },
      { path: '/day/:date', element: <h1>Trang ngày</h1> },
    ],
    '/day/2026-10-16/edit',
  )
}

beforeEach(() => {
  // Chỉ giả Date: "hôm nay" là 18/10/2026 giờ Việt Nam; hẹn giờ vẫn chạy thật.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T14:15:00Z'))
  store = { [DAY]: saved() }
  calls = mockApi(makeMe(), store)
})
afterEach(() => {
  vi.useRealTimers()
})

// Màn nhiều icon SVG: dành thêm thời gian khi cả bộ test chạy song song.
describe('Sửa một trang cũ', () => {
  it('báo đang sửa trang của ngày trước; đổi điểm có Hoàn tác', async () => {
    renderEdit()
    expect(await screen.findByRole('heading', { name: 'Sửa trang' })).toBeInTheDocument()
    expect(screen.getByText(/Bạn đang sửa trang của 2 ngày trước/)).toBeInTheDocument()
    expect(screen.getByText('Chưa có thay đổi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Điểm 3, Nụ' }))
    expect(screen.getByText(/Đã đổi từ 5 · Nở rộ sang 3 · Nụ/)).toBeInTheDocument()
    expect(screen.getByText('1 thay đổi chưa lưu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(screen.getByText('Chưa có thay đổi')).toBeInTheDocument()
  })

  it('sub icon trên máy tính: một hàng hay dùng, bấm Thêm mới mở đủ bộ', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Sửa trang' })
    const more = await screen.findByRole('button', { name: /^Thêm \d+$/ })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Hay dùng nhất trong nhật ký của bạn.')).toBeInTheDocument()
    fireEvent.click(more)
    expect(screen.getByRole('button', { name: 'Thu gọn' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('Hủy thay đổi hỏi lại, nêu đúng trường sẽ mất, rồi đưa về bản đã lưu', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Tối nấu ăn' } })
    fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: 'Khác' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Thay đổi ở tiêu đề và nội dung chưa được lưu và sẽ mất.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bỏ thay đổi' }))
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Tan làm sớm')
  })

  it('lưu thì báo đã lưu, ghi thêm ngày sửa vào dòng Sửa lần cuối', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Tối nấu ăn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await screen.findByText('Đã lưu thay đổi cho trang 16/10')).toBeInTheDocument()
    expect(screen.getByText(/Sửa lần cuối 21:15, 18\/10, 2 ngày sau/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem trang' })).toBeInTheDocument()
    // Sửa thì gửi lại đúng updated_at đã nhận, kèm CSRF.
    const put = calls.find((c) => c.method === 'PUT')!
    expect(put.path).toBe(`/entries/${DAY}`)
    expect(put.body).toMatchObject({ score: 5, title: 'Tối nấu ăn', updated_at: saved().updated_at })
  })

  it('bỏ một ảnh rồi Lưu: xóa ảnh trên máy chủ và chốt thứ tự ảnh còn lại', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Sửa trang' })
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh [Ảnh 1]' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false) // chưa bấm Lưu thì chưa xóa
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await screen.findByText('Đã lưu thay đổi cho trang 16/10')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'DELETE')?.path).toBe('/photos/p1')
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ photo_ids: ['p2'] })
    expect(calls.some((c) => c.method === 'PUT')).toBe(false) // chữ không đổi thì không PUT
    expect(store[DAY]!.photos.map((p) => p.id)).toEqual(['p2'])
    expect(screen.getByText('1/10')).toBeInTheDocument()
  })

  it('bỏ ảnh rồi Hủy thay đổi: không xóa gì trên máy chủ', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Sửa trang' })
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh [Ảnh 2]' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }))
    await waitFor(() => expect(screen.getByText('2/10')).toBeInTheDocument())
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('bản trên máy chủ mới hơn (409): hộp thoại chọn bản, "Dùng bản vừa sửa" nạp bản kia', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Bản ở tab này' } })
    // Tab khác vừa lưu: updated_at trên máy chủ đổi.
    store[DAY] = { ...store[DAY], title: 'Bản ở tab khác', updated_at: '2026-10-18T14:00:00.000Z' }
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Trang này vừa được sửa ở nơi khác' })
    expect(within(dialog).getByText('Bản ở tab này')).toBeInTheDocument()
    expect(await within(dialog).findByText('Bản ở tab khác')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dùng bản vừa sửa' }))
    expect(await screen.findByDisplayValue('Bản ở tab khác')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('409 rồi "Giữ bản của tôi": gửi lại bản đang sửa dựa trên bản máy chủ mới', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Bản ở tab này' } })
    store[DAY] = { ...store[DAY], title: 'Bản ở tab khác', updated_at: '2026-10-18T14:00:00.000Z' }
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Trang này vừa được sửa ở nơi khác' })
    await within(dialog).findByText('Bản ở tab khác')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giữ bản của tôi' }))
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'PUT').at(-1)?.body).toMatchObject({
        title: 'Bản ở tab này',
        updated_at: '2026-10-18T14:00:00.000Z',
      }),
    )
    expect(await screen.findByDisplayValue('Bản ở tab này')).toBeInTheDocument()
  })

  it('rời trang khi còn thay đổi thì hỏi trước', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Khác' } })
    fireEvent.click(screen.getByRole('link', { name: /Trang 16\/10/ }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    expect(screen.getByRole('heading', { name: 'Sửa trang' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: /Trang 16\/10/ }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ và rời trang' }))
    expect(await screen.findByRole('heading', { name: 'Trang ngày' })).toBeInTheDocument()
  })

  it('từ khóa: Enter để thêm; gõ trùng thì báo ngay và không cho thêm', async () => {
    renderEdit()
    const input = await screen.findByLabelText('Từ khóa')
    fireEvent.change(input, { target: { value: 'nấu ăn' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Bỏ từ khóa nấu ăn' })).toBeInTheDocument()
    expect(input).toHaveValue('')

    fireEvent.change(input, { target: { value: 'Nấu  Ăn' } })
    expect(screen.getByText('Từ khóa “nấu ăn” đã có trong trang này.')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('button', { name: 'Thêm' })).not.toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByRole('button', { name: /^Bỏ từ khóa/ })).toHaveLength(1)
  })

  it('cờ hiệu có ô "Không cờ" để bỏ cờ', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Sửa trang' })
    expect(screen.getByRole('button', { name: 'Không cờ' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Không cờ' }))
    expect(screen.getByRole('button', { name: 'Không cờ' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Cờ hiệu · Không cờ')).toBeInTheDocument()
    expect(screen.getByText('1 thay đổi chưa lưu')).toBeInTheDocument()
  })

  it('ảnh sai định dạng và ảnh quá lớn hiện ô báo lỗi, không tính vào số ảnh', async () => {
    const { container } = renderEdit()
    await screen.findByRole('heading', { name: 'Sửa trang' })
    expect(screen.getByText('2/10')).toBeInTheDocument()
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    const gif = new File(['x'], 'IMG.gif', { type: 'image/gif' })
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'to.jpg', { type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [gif, big] } })
    })
    expect(screen.getByText('Sai định dạng')).toBeInTheDocument()
    expect(screen.getByText('Ảnh quá lớn')).toBeInTheDocument()
    expect(screen.getByText('2/10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh IMG.gif' }))
    expect(screen.queryByText('Sai định dạng')).not.toBeInTheDocument()
  })
})
