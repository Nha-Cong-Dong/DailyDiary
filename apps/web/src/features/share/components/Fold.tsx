import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Gập/mở mượt một khối (xem trước Chia sẻ, thẻ link vừa tắt). Khi gập: ẩn khỏi trình đọc màn hình và phím Tab. */
export function Fold({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-out', className)}
      style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
