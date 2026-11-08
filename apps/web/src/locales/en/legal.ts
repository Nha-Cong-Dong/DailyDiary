import type { Shape } from '../shape'
import type vi from '../vi/legal'

// Bản dịch tiếng Anh, nhóm "legal": phải có đủ khóa của bản tiếng Việt.
const en: Shape<typeof vi> = {
  englishNotice: 'This policy is currently available in Vietnamese only.',
  pageTitle: 'Privacy policy · Jotly',
  heading: 'Privacy policy',
  updated: 'Last updated: {{when}}',
}

export default en
