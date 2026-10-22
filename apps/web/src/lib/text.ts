/**
 * Chuẩn hóa chữ tiếng Việt cho từ khóa và tìm kiếm (F-05). Backend dùng cùng quy tắc ở core/text.py (Bước 5, 11).
 */

/** Bỏ dấu một ký tự: "ư" → "u", "Đ" → "d"; ký tự không phải chữ có dấu thì chỉ hạ chữ thường. */
function foldChar(ch: string): string {
  const lower = ch.toLowerCase()
  if (lower === 'đ') return 'd'
  const base = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  return base.length === 1 ? base : lower
}

/** Khóa so trùng của từ khóa: NFC, chữ thường, bỏ dấu, gộp khoảng trắng. */
export function keywordNorm(keyword: string): string {
  return Array.from(keyword.normalize('NFC')).map(foldChar).join('').replace(/\s+/g, ' ').trim()
}

/** Câu tìm có dấu không? Có dấu thì so đúng dấu; không dấu thì so không dấu (như thiết kế B7). */
export function hasDiacritics(query: string): boolean {
  const lower = query.normalize('NFC').toLowerCase()
  return Array.from(lower).map(foldChar).join('') !== lower
}

export type Segment = { text: string; match: boolean }

/**
 * Chuẩn bị chuỗi để so: giữ đúng 1 ký tự UTF-16 ↔ 1 ký tự sau chuẩn hóa, nên vị trí khớp trên chuỗi đã chuẩn hóa
 * cũng là vị trí trên chuỗi gốc (để tô sáng đúng chỗ).
 */
function prepare(text: string, loose: boolean): string {
  let out = ''
  for (const ch of text) {
    const folded = loose ? foldChar(ch) : ch.toLowerCase()
    // Ký tự ngoài BMP (emoji) dài 2 đơn vị: giữ nguyên độ dài để không lệch chỉ số.
    out += folded.length === ch.length ? folded : ch
  }
  return out
}

/** Các khoảng [bắt đầu, kết thúc) trong `text` khớp `query` (chuỗi con, không phân biệt hoa thường). */
export function matchRanges(text: string, query: string): [number, number][] {
  const q = query.normalize('NFC').trim()
  if (!q) return []
  const source = text.normalize('NFC')
  const loose = !hasDiacritics(q)
  const hay = prepare(source, loose)
  const needle = prepare(q, loose)
  const ranges: [number, number][] = []
  let from = 0
  while (from <= hay.length - needle.length) {
    const i = hay.indexOf(needle, from)
    if (i < 0) break
    ranges.push([i, i + needle.length])
    from = i + needle.length
  }
  return ranges
}

export function matches(text: string, query: string): boolean {
  return matchRanges(text, query).length > 0
}

/** Cắt `text` thành các đoạn thường / đoạn khớp để tô sáng bằng <mark>. */
export function highlight(text: string, query: string): Segment[] {
  const source = text.normalize('NFC')
  const ranges = matchRanges(source, query)
  if (!ranges.length) return [{ text: source, match: false }]
  const out: Segment[] = []
  let at = 0
  for (const [a, b] of ranges) {
    if (a > at) out.push({ text: source.slice(at, a), match: false })
    out.push({ text: source.slice(a, b), match: true })
    at = b
  }
  if (at < source.length) out.push({ text: source.slice(at), match: false })
  return out
}

/** Đoạn trích quanh chỗ khớp đầu tiên (khoảng 32 ký tự trước, 64 sau), cắt ở ranh giới từ. */
export function snippet(text: string, query: string, before = 32, after = 64): string {
  const source = text.normalize('NFC')
  const first = matchRanges(source, query)[0]
  if (!first) return source.length > 96 ? source.slice(0, 96).replace(/\s+\S*$/, '') + '…' : source
  const [i, j] = first
  let a = Math.max(0, i - before)
  if (a > 0) {
    const space = source.indexOf(' ', a)
    a = space >= 0 && space < i ? space + 1 : a
  }
  let b = Math.min(source.length, j + after)
  if (b < source.length) {
    const space = source.lastIndexOf(' ', b)
    b = space > j ? space : b
  }
  return (a > 0 ? '…' : '') + source.slice(a, b) + (b < source.length ? '…' : '')
}
