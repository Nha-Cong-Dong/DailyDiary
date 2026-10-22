import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PhotoUploader } from './PhotoUploader'
import { usePhotoUploads, type UploadPhoto } from './usePhotoUploads'

function Harness({ upload }: { upload: UploadPhoto }) {
  const uploads = usePhotoUploads([], upload)
  return (
    <>
      <span id="h">Ảnh</span>
      <PhotoUploader uploads={uploads} labelledBy="h" />
      <output>{uploads.uploading ? 'đang tải' : `${uploads.photos.length} ảnh`}</output>
    </>
  )
}

describe('PhotoUploader', () => {
  it('lỗi mạng giữ ô lại để thử lại; thử lại thành công thì ảnh vào trang', async () => {
    let calls = 0
    const upload: UploadPhoto = async (file) => {
      calls++
      if (calls === 1) throw new Error('mất mạng')
      return { id: 'p1', label: file.name }
    }
    const { container } = render(<Harness upload={upload} />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'mua.jpg', { type: 'image/jpeg' })] } })
    })
    expect(await screen.findByText('Lỗi mạng')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại ảnh mua.jpg' }))
    })
    expect(await screen.findByText('1 ảnh')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bỏ ảnh mua.jpg' })).toBeInTheDocument()
    expect(screen.queryByText('Lỗi mạng')).not.toBeInTheDocument()
  })
})
