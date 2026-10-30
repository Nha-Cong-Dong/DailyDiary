import { describe, expect, it } from 'vitest'
import { cn } from './utils'

// cn gộp class theo nhóm: token tự đặt (cỡ chữ, bóng, họ chữ) phải được nhận đúng nhóm, nếu không `text-body` bị coi là
// màu chữ và mất khi đi cùng `text-muted-foreground`.
describe('cn với token của hệ thiết kế 1.1', () => {
  it('cỡ chữ token không bị màu chữ đè', () => {
    for (const size of ['display', 'title', 'heading', 'reading', 'body', 'label']) {
      expect(cn(`text-${size}`, 'text-muted-foreground')).toBe(`text-${size} text-muted-foreground`)
    }
    expect(cn('text-label', 'text-body')).toBe('text-body')
  })

  it('bóng cứng và họ chữ token gộp đúng nhóm', () => {
    expect(cn('shadow-accent', 'shadow-none')).toBe('shadow-none')
    expect(cn('shadow-ink-sm', 'hover:shadow-ink')).toBe('shadow-ink-sm hover:shadow-ink')
    expect(cn('font-display', 'font-extrabold')).toBe('font-display font-extrabold')
  })
})
