import 'i18next'
import type { vi } from './vi'

// Kiểu của khóa dịch lấy từ bản tiếng Việt: gõ sai khóa hoặc thiếu biến nội suy là lỗi biên dịch.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof vi
  }
}
