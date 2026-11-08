import { t } from '@/lib/i18n'
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
  if (keyword.length < keyword_len_min) return { ok: false, error: t('entry:keywordError.empty') }
  if (keyword.length > keyword_len_max) return { ok: false, error: t('entry:keywordError.tooLong', { max: keyword_len_max }) }
  if (keywords.length >= keywords_max) return { ok: false, error: t('entry:keywordError.tooMany', { max: keywords_max }) }
  const norm = keywordNorm(keyword)
  if (keywords.some((k) => keywordNorm(k) === norm)) return { ok: false, error: t('entry:keywordError.duplicate') }
  return { ok: true, keywords: [...keywords, keyword] }
}
