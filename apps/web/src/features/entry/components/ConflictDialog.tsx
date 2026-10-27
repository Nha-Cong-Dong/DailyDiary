import { BottomSheet, SheetActions } from '@/components/diary/BottomSheet'
import { Button } from '@/components/ui/button'
import { scoreLabel } from '@/lib/catalog'
import { useProfile } from '@/lib/profile'
import type { DraftFields } from '@/lib/storage'
import type { Conflict } from '../useAutosave'
import { dateTimeLabel } from '../entryDraft'

function Version({ heading, fields, meta }: { heading: string; fields: DraftFields | null; meta: string }) {
  const { iconSetId } = useProfile()
  const first = fields?.content.split(/\n+/)[0]?.trim()
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[16px] border-[1.5px] border-line bg-background p-4">
      <h3 className="font-sans text-[13px] leading-5 font-semibold text-muted-foreground">{heading}</h3>
      {fields ? (
        <>
          <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
            Điểm {fields.score} · {scoreLabel(iconSetId, fields.score as 1 | 2 | 3 | 4 | 5)}
          </p>
          <p className="font-heading text-[17px] leading-6 font-bold">{fields.title.trim() || 'Chưa có tiêu đề'}</p>
          {first ? <p className="line-clamp-3 text-sm leading-[22px] text-muted-foreground">{first}</p> : null}
        </>
      ) : (
        <p className="text-sm leading-[22px] text-muted-foreground">Trang này đã bị xóa ở nơi khác.</p>
      )}
      <p className="mt-auto pt-1 text-xs leading-[18px] text-muted-foreground tabular-nums">{meta}</p>
    </section>
  )
}

/** Hai tab (hoặc hai máy) cùng sửa một trang: chọn giữ bản đang gõ ở đây hay dùng bản vừa lưu ở nơi khác (F-06). */
export function ConflictDialog({
  conflict,
  onKeepMine,
  onTakeTheirs,
}: {
  conflict: Conflict | null
  onKeepMine: () => void
  onTakeTheirs: () => void
}) {
  const { timeZone } = useProfile()
  const theirs = conflict?.theirs ?? null
  return (
    <BottomSheet
      open={conflict !== null}
      // Phải chọn một bản: Esc hay chạm ra ngoài không đóng.
      onOpenChange={() => {}}
      layout="responsive"
      role="alertdialog"
      title="Trang này vừa được sửa ở nơi khác"
      description="Một tab hoặc máy khác đã lưu trang này trong lúc bạn đang viết. Chọn bản muốn giữ; bản còn lại sẽ bị thay."
      showDescription
      className="md:max-w-[min(640px,calc(100%-2rem))]"
    >
      {conflict ? (
        <div className="flex flex-col gap-3 md:flex-row">
          <Version heading="Bản của bạn" fields={conflict.mine} meta="Đang ở trình duyệt này, chưa lưu" />
          <Version
            heading="Bản vừa sửa ở nơi khác"
            fields={theirs ? { ...theirs, title: theirs.title ?? '', content: theirs.content ?? '' } : null}
            meta={theirs ? `Sửa lúc ${dateTimeLabel(timeZone, theirs.updated_at, false)}` : ''}
          />
        </div>
      ) : null}
      <SheetActions>
        <Button variant="outline" onClick={onTakeTheirs}>
          Dùng bản vừa sửa
        </Button>
        <Button onClick={onKeepMine}>Giữ bản của tôi</Button>
      </SheetActions>
    </BottomSheet>
  )
}
