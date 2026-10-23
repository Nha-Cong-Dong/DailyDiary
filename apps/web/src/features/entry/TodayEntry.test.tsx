import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { draftUserKey, resetStorageForTests, saveDraft } from '@/lib/storage'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'
import { TodayEntry } from './TodayEntry'
import { todayIn } from '@/lib/date'

function renderToday() {
  return renderWithMe([{ path: '/', Component: TodayEntry }], '/')
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageForTests()
})
// Rời màn thì tự lưu nốt (đúng như app thật): chờ lần lưu đó xong trước khi test sau giả API mới.
afterEach(async () => {
  cleanup()
  await new Promise((r) => setTimeout(r, 100))
})

describe('TodayEntry', () => {
  it('chấm điểm là lưu ngay (tạo mới, không gửi updated_at); phần "Thêm chút nữa?" mở ra sau', async () => {
    const calls = mockApi(makeMe())
    renderToday()
    fireEvent.click(await screen.findByRole('button', { name: 'Điểm 4, Hé nở' }))
    expect(screen.getByRole('heading', { name: 'Thêm chút nữa?' })).toBeInTheDocument()
    expect(await screen.findByText(/Đã ghi lại hôm nay lúc/, undefined, { timeout: 5000 })).toBeInTheDocument()
    const put = calls.find((c) => c.method === 'PUT')!
    expect(put.path).toBe(`/entries/${todayIn('Asia/Ho_Chi_Minh')}`)
    expect(put.body).toMatchObject({ score: 4 })
    expect(put.body).not.toHaveProperty('updated_at')
    expect(put.csrf).toBeNull() // jsdom không có cookie dd_csrf; trình duyệt thật thì có
  })

  it('đổi điểm liền hai lần: lưu nối tiếp (hoặc gộp làm một), bản cuối là điểm sau, không 409', async () => {
    const calls = mockApi(makeMe())
    renderToday()
    fireEvent.click(await screen.findByRole('button', { name: 'Điểm 4, Hé nở' }))
    fireEvent.click(screen.getByRole('button', { name: 'Điểm 5, Nở rộ' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT').at(-1)?.body).toMatchObject({ score: 5 }))
    await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent('Đang lưu'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/vừa được sửa ở nơi khác/)).toBeNull()
    const puts = calls.filter((c) => c.method === 'PUT')
    expect(puts[0].body).not.toHaveProperty('updated_at')
    if (puts.length > 1) expect(puts[1].body).toMatchObject({ updated_at: expect.any(String) })
  })

  it('mở màn khi hôm nay đã ghi thì hiện lại điểm và chữ đã lưu; Lưu gửi kèm updated_at', async () => {
    const today = todayIn('Asia/Ho_Chi_Minh')
    const calls = mockApi(makeMe(), { [today]: makeEntry(today, { score: 3, title: 'Sáng mưa' }) })
    renderToday()
    expect(await screen.findByDisplayValue('Sáng mưa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Điểm 3, Nụ' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: 'Ở nhà đọc sách.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(await screen.findByText(/^Đã lưu lúc/)).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'PUT')!.body).toMatchObject({
      title: 'Sáng mưa',
      content: 'Ở nhà đọc sách.',
      updated_at: makeEntry(today).updated_at,
    })
  })

  it('thêm từ khóa bằng Enter và báo trùng không phân biệt dấu', async () => {
    mockApi(makeMe())
    renderToday()
    fireEvent.click(await screen.findByRole('button', { name: 'Điểm 3, Nụ' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Từ khóa' }))
    const input = screen.getByLabelText('Từ khóa mới')
    fireEvent.change(input, { target: { value: 'Đà Lạt' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Bỏ từ khóa Đà Lạt' })).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'da lat' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Từ khóa này đã có trong ngày')).toBeInTheDocument()
  })

  it('tự động lưu: gõ xong khoảng 4 giây thì gửi PUT, không cần bấm Lưu', async () => {
    const today = todayIn('Asia/Ho_Chi_Minh')
    const calls = mockApi(makeMe(), { [today]: makeEntry(today, { score: 3 }) })
    renderToday()
    fireEvent.change(await screen.findByLabelText('Nội dung'), { target: { value: 'Tự lưu nhé.' } })
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1), { timeout: 6000 })
    expect(calls.find((c) => c.method === 'PUT')!.body).toMatchObject({ content: 'Tự lưu nhé.' })
    expect(await screen.findByText(/^Đã lưu lúc/)).toBeInTheDocument()
  })

  it('mở lại màn: nháp chưa đồng bộ từ lần trước được nạp lại và lưu lên', async () => {
    const today = todayIn('Asia/Ho_Chi_Minh')
    const saved = makeEntry(today, { score: 3, title: 'Bản máy chủ' })
    const calls = mockApi(makeMe(), { [today]: saved })
    const key = await draftUserKey(makeMe().email)
    await saveDraft(key, today, { score: 3, sub_icon: null, flag_color: null, title: 'Bản viết dở', content: '', keywords: [] }, saved.updated_at)
    renderToday()
    expect(await screen.findByDisplayValue('Bản viết dở')).toBeInTheDocument()
    expect(screen.getByText('Đã khôi phục phần bạn viết dở lần trước.')).toBeInTheDocument()
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT').at(-1)?.body).toMatchObject({ title: 'Bản viết dở' }), {
      timeout: 6000,
    })
  })
})
