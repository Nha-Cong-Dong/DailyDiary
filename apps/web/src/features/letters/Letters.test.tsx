import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LettersPage } from '@/routes/LettersPage'
import { makeMe, mockApi, renderWithMe } from '@/test/withMe'

const TOMORROW = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  .format(new Date(Date.now() + 86_400_000))
  .slice(0, 10)

beforeEach(() => {
  mockApi(makeMe())
})

describe('Thư gửi tương lai', () => {
  it('chưa có thư: hiện trạng thái trống; form chặn ngày mở không phải tương lai', async () => {
    const { getByRole } = renderWithMe([{ path: '/profile/letters', Component: LettersPage }], '/profile/letters')
    expect(await screen.findByText('Chưa có lá thư nào. Viết thư đầu tiên cho tương lai của bạn nhé.')).toBeInTheDocument()

    const send = getByRole('button', { name: 'Gửi thư' })
    expect(send).toBeDisabled()

    const content = screen.getByLabelText('Nội dung thư')
    fireEvent.change(content, { target: { value: 'Gửi đến bạn của ngày mai' } })
    const date = screen.getByLabelText('Ngày mở thư')
    fireEvent.change(date, { target: { value: TOMORROW } })
    expect(send).toBeEnabled()
  })

  it('gửi thư: ngày mở hôm nay bị chặn, ngày mai gửi được', async () => {
    const { getByRole } = renderWithMe([{ path: '/profile/letters', Component: LettersPage }], '/profile/letters')
    const content = screen.getByLabelText('Nội dung thư')
    fireEvent.change(content, { target: { value: 'bài học cho tương lai' } })
    const date = screen.getByLabelText('Ngày mở thư')
    const today = (date as HTMLInputElement).min

    // Ngày mở phải sau hôm nay: chọn đúng min (hôm nay) → nút gửi vẫn khóa (form so `revealDate <= today`).
    fireEvent.change(date, { target: { value: today } })
    expect(getByRole('button', { name: 'Gửi thư' })).toBeDisabled()

    fireEvent.change(date, { target: { value: TOMORROW } })
    const send = getByRole('button', { name: 'Gửi thư' })
    expect(send).toBeEnabled()
    fireEvent.click(send)
    // Thư niêm phong mới gửi vào danh sách (mockApi trả letters rỗng ban đầu; mutation set vào cache).
    expect(await screen.findByText(new RegExp('Niêm phong · mở'))).toBeInTheDocument()
  })
})
