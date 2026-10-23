import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// findBy/waitFor chờ tối đa 3 s (mặc định 1 s): trên máy chậm, cả bộ chạy song song làm vài màn render quá 1 s.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
