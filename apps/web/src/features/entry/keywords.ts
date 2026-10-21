import { tierLimits } from '@/lib/limits'
import { keywordNorm } from '@/lib/text'

export type AddKeywordResult = { ok: true; keywords: string[] } | { ok: false; error: string }

/** Từ khóa đã có trùng với chuỗi đang gõ (không phân biệt hoa thường, dấu, khoảng trắng); null nếu không trùng. */
export function duplicateOf(keywords: string[], raw: string): string | null {
  const draft = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (!draft) return null
  const norm = keywordNorm(draft)
  return keywords.find((k) => keywordNorm(k) === norm) ?? null
}

/** Thêm một từ khóa nếu hợp lệ theo shared/limits.json; trả lỗi để hiện dưới ô nhập. */
export function addKeyword(keywords: string[], raw: string): AddKeywordResult {
  const { keywords_max, keyword_len_min, keyword_len_max } = tierLimits().entry
  const keyword = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (keyword.length < keyword_len_min) return { ok: false, error: 'Từ khóa đang trống' }
  if (keyword.length > keyword_len_max) return { ok: false, error: `Từ khóa tối đa ${keyword_len_max} ký tự` }
  if (keywords.length >= keywords_max) return { ok: false, error: `Mỗi ngày tối đa ${keywords_max} từ khóa` }
  const norm = keywordNorm(keyword)
  if (keywords.some((k) => keywordNorm(k) === norm)) return { ok: false, error: 'Từ khóa này đã có trong ngày' }
  return { ok: true, keywords: [...keywords, keyword] }
}
