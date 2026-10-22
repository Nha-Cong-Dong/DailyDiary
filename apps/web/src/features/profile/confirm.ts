/** "XÓA" gõ có dấu hay không dấu, hoa hay thường đều được (thiết kế B7 · Hồ sơ). */
export function isConfirmWord(text: string): boolean {
  return (
    text
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase() === 'xoa'
  )
}

/** Email gõ lại để xác nhận xóa tài khoản: bỏ khoảng trắng hai đầu, không phân biệt hoa thường. */
export function isSameEmail(text: string, email: string): boolean {
  return email !== '' && text.trim().toLowerCase() === email.trim().toLowerCase()
}
