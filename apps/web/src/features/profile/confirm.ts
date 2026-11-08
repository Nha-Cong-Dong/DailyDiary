import { t } from '@/lib/i18n'

function fold(text: string): string {
  return text
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

/**
 * Từ xác nhận xóa theo ngôn ngữ giao diện ("XÓA" / "DELETE", khóa profile:delete.data.word). Gõ có dấu hay không dấu,
 * hoa hay thường đều được (thiết kế B7 · Hồ sơ). Máy chủ luôn nhận "XÓA" bất kể ngôn ngữ nên chỉ giao diện so khớp từ này.
 */
export function isConfirmWord(text: string, word: string = t('profile:delete.data.word')): boolean {
  return fold(text) === fold(word)
}

/** Email gõ lại để xác nhận xóa tài khoản: bỏ khoảng trắng hai đầu, không phân biệt hoa thường. */
export function isSameEmail(text: string, email: string): boolean {
  return email !== '' && text.trim().toLowerCase() === email.trim().toLowerCase()
}
