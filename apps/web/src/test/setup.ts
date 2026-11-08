import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { i18nReady, setLanguage } from '@/lib/i18n'

// Khởi tạo i18n (tiếng Việt) trước mọi test; test nào đổi sang English thì được đặt lại sau đó.
await i18nReady

// findBy/waitFor chờ tối đa 3 s (mặc định 1 s): trên máy chậm, cả bộ chạy song song làm vài màn render quá 1 s.
configure({ asyncUtilTimeout: 3000 })

afterEach(async () => {
  cleanup()
  await setLanguage('vi')
  vi.restoreAllMocks()
})
