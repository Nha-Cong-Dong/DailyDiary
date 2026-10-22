import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { DateString } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { ShareDialog } from './ShareDialog'
import { useShare } from './useShares'

export type ShareControls = { active: boolean; open: () => void }

/**
 * Gắn Chia sẻ vào trang một ngày mà không để feature entry phụ thuộc feature share: trang ghép
 * `<DayShare>{(share) => <DayDetail share={share} />}</DayShare>`.
 * Mở sẵn hộp thoại khi tới từ "Chỉnh phần chia sẻ" (state `{ share: true }` của router).
 */
export function DayShare({
  date,
  entry,
  children,
}: {
  date: DateString
  entry: DemoEntry | null | undefined
  children: (share: ShareControls) => ReactNode
}) {
  const { data: link } = useShare(date)
  const { state } = useLocation() as { state: { share?: boolean } | null }
  const [open, setOpen] = useState(() => !!state?.share)
  // Mỗi lần mở là một phiên mới: hộp thoại đọc lại link hiện tại thay vì giữ bản nháp cũ.
  const [session, setSession] = useState(0)
  const controls: ShareControls = {
    active: !!link,
    open: () => {
      setSession((n) => n + 1)
      setOpen(true)
    },
  }
  return (
    <>
      {children(controls)}
      {entry && link !== undefined ? (
        <ShareDialog key={session} entry={entry} link={link} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  )
}
