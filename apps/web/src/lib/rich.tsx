import { Fragment, type ReactNode } from 'react'

/**
 * Chữ dịch có thẻ đơn giản giữa câu, thay cho `<Trans>` (kiểu khóa của `<Trans>` không khớp với `t` có nhóm):
 * `rich(t('share:summary.hint'), { b: (c) => <strong>{c}</strong> })` với "Bấm <b>Chia sẻ</b>" cho ra
 * ["Bấm ", <strong>Chia sẻ</strong>]. Chỉ thẻ không thuộc tính, không lồng nhau; thẻ lạ thì giữ chữ bên trong.
 */
export function rich(text: string, tags: Record<string, (children: string) => ReactNode>): ReactNode {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(/<(\w+)>(.*?)<\/\1>/g)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const wrap = tags[m[1]]
    parts.push(<Fragment key={m.index}>{wrap ? wrap(m[2]) : m[2]}</Fragment>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
