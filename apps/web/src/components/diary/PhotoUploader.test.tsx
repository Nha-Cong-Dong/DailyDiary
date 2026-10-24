import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { tierLimits } from '@/lib/limits'
import { makeMe, mockApi } from '@/test/withMe'
import { PhotoUploader } from './PhotoUploader'
import { usePhotoUploads, type UploadPhoto } from './usePhotoUploads'

function Uploader({ upload }: { upload: UploadPhoto }) {
  const uploads = usePhotoUploads([], upload)
  return (
    <>
      <span id="h">Ảnh</span>
      <PhotoUploader uploads={uploads} labelledBy="h" />
      <output>{uploads.uploading ? 'đang tải' : `${uploads.photos.length} ảnh`}</output>
    </>
  )
}

/** Ô ảnh đọc dung lượng qua GET /me/data-summary (API giả của withMe, `usedBytes` byte đã dùng). */
function setup(upload: UploadPhoto, usedBytes = 0) {
  const storage = { usedBytes }
  const calls = mockApi(makeMe(), {}, storage)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <Uploader upload={upload} />
    </QueryClientProvider>,
  )
  return { ...view, calls, storage }
}

async function pick(container: HTMLElement, name = 'mua.jpg') {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  await act(async () => {
    fireEvent.change(input, { target: { files: [new File(['x'], name, { type: 'image/jpeg' })] } })
  })
}

const { quota_bytes, warn_ratio } = tierLimits().storage
const summaryCalls = (calls: ReturnType<typeof mockApi>) => calls.filter((c) => c.path === '/me/data-summary').length

describe('PhotoUploader', () => {
  it('lỗi mạng giữ ô lại để thử lại; thử lại thành công thì ảnh vào trang', async () => {
    let calls = 0
    const upload: UploadPhoto = async (file) => {
      calls++
      if (calls === 1) throw new Error('mất mạng')
      return { id: 'p1', label: file.name }
    }
    const { container } = setup(upload)
    await pick(container)
    expect(await screen.findByText('Lỗi mạng')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại ảnh mua.jpg' }))
    })
    expect(await screen.findByText('1 ảnh')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bỏ ảnh mua.jpg' })).toBeInTheDocument()
    expect(screen.queryByText('Lỗi mạng')).not.toBeInTheDocument()
  })

  it('máy chủ báo hết dung lượng (STORAGE_QUOTA): ô báo "Hết dung lượng", không phải lỗi mạng, không có Thử lại', async () => {
    const upload: UploadPhoto = async () => {
      throw new ApiError(422, 'STORAGE_QUOTA', 'Đã hết dung lượng lưu ảnh')
    }
    const { container, calls, storage } = setup(upload)
    await waitFor(() => expect(summaryCalls(calls)).toBe(1))
    storage.usedBytes = quota_bytes
    await pick(container)

    expect(await screen.findByText('Hết dung lượng')).toBeInTheDocument()
    expect(screen.queryByText('Lỗi mạng')).toBeNull()
    expect(screen.queryByRole('button', { name: /Thử tải lại/ })).toBeNull()
    expect(screen.getByText('Ảnh chưa được lưu vì đã hết dung lượng. Bấm × để bỏ ô báo lỗi.')).toBeInTheDocument()
    // Đọc lại dung lượng: dòng cảnh báo hết dung lượng hiện ngay dưới ô ảnh.
    expect(await screen.findByText(/^Đã hết dung lượng ảnh \(/)).toBeInTheDocument()
    expect(summaryCalls(calls)).toBe(2)
    expect(screen.getByText('0 ảnh')).toBeInTheDocument()
  })

  it('máy chủ báo trang đã đủ ảnh (ENTRY_LIMIT_PHOTOS): ô báo "Đủ ảnh"', async () => {
    const upload: UploadPhoto = async () => {
      throw new ApiError(422, 'ENTRY_LIMIT_PHOTOS', 'Mỗi ngày tối đa 10 ảnh')
    }
    const { container } = setup(upload)
    await pick(container)
    expect(await screen.findByText('Đủ ảnh')).toBeInTheDocument()
    expect(screen.getByText(`Tối đa ${tierLimits().photos.per_day_max} ảnh`)).toBeInTheDocument()
    expect(screen.queryByText('Lỗi mạng')).toBeNull()
  })

  it(`dung lượng đạt ${warn_ratio * 100}% thì hiện một dòng cảnh báo; dưới ngưỡng thì không`, async () => {
    const below = setup(async (file) => ({ id: 'p1', label: file.name }), Math.floor(quota_bytes * warn_ratio) - 1)
    await waitFor(() => expect(summaryCalls(below.calls)).toBe(1))
    await act(async () => {}) // chờ dữ liệu vào cache rồi mới kiểm tra
    expect(screen.queryByText(/Sắp hết chỗ cho ảnh mới/)).toBeNull()
    below.unmount()

    setup(async (file) => ({ id: 'p1', label: file.name }), Math.ceil(quota_bytes * warn_ratio))
    const percent = `(${warn_ratio * 100}%)`
    expect(await screen.findByText((text) => text.startsWith('Dung lượng ảnh: ') && text.endsWith(`${percent}. Sắp hết chỗ cho ảnh mới.`))).toBeInTheDocument()
  })

  it('thêm ảnh xong thì đọc lại dung lượng', async () => {
    const { container, calls } = setup(async (file) => ({ id: 'p1', label: file.name }))
    await waitFor(() => expect(summaryCalls(calls)).toBe(1))
    await pick(container)
    expect(await screen.findByText('1 ảnh')).toBeInTheDocument()
    await waitFor(() => expect(summaryCalls(calls)).toBe(2))
  })
})
