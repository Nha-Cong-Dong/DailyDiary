import type { UploadPhoto } from '@/components/diary/usePhotoUploads'

/**
 * GIẢ LẬP tải ảnh: chạy tiến độ khoảng 1,2 giây rồi trả ảnh, không gửi gì lên mạng.
 * Bước 7 thay bằng: nén WebP 1920 px + ảnh thu nhỏ 320 px (lib/image.ts) → POST upload-url → PUT presigned
 * → POST /entries/{date}/photos để xác nhận.
 */
export const fakeUploadPhoto: UploadPhoto = (file, onProgress, signal) =>
  new Promise((resolve, reject) => {
    let ratio = 0
    const timer = window.setInterval(() => {
      ratio = Math.min(1, ratio + 0.2)
      onProgress(ratio)
      if (ratio >= 1) {
        window.clearInterval(timer)
        resolve({ id: `local-${crypto.randomUUID()}`, label: file.name })
      }
    }, 240)
    signal.addEventListener('abort', () => {
      window.clearInterval(timer)
      reject(new DOMException('Đã hủy', 'AbortError'))
    })
  })
