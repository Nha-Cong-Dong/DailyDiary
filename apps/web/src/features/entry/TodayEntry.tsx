import { CircleCheck, Image } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FlagPicker } from '@/components/diary/FlagPicker'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { SubIconPicker } from '@/components/diary/SubIconPicker'
import { SyncStatus } from '@/components/diary/SyncStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Score } from '@/lib/catalog'
import type { DraftFields } from '@/lib/storage'
import { longDateLabel, timeIn, todayIn, useNow } from '@/lib/date'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import { ConflictDialog } from './components/ConflictDialog'
import { KeywordEditor } from './components/KeywordEditor'
import { RecentDays } from './components/RecentDays'
import type { DayEntry } from './entries'
import { useAutosave } from './useAutosave'
import { useDay } from './useDay'
import { useRecentDays } from './useRecentDays'

/**
 * Màn "Hôm nay" (thiết kế B6): chấm điểm trước, các trường khác mở ra sau và đều không bắt buộc.
 * Chấm điểm là lưu ngay (PUT /entries/{hôm nay}); các trường khác tự lưu (nháp sau 1 s, máy chủ sau 4 s, F-06);
 * nút Lưu chỉ để lưu ngay.
 */
export function TodayEntry() {
  const { timeZone } = useProfile()
  const now = useNow()
  const today = todayIn(timeZone, now)
  const { data: entry, isPending, isError } = useDay(today)
  if (isPending) {
    return (
      <p role="status" className="mx-auto w-full max-w-[640px] text-muted-foreground">
        Đang mở trang hôm nay…
      </p>
    )
  }
  if (isError) {
    return (
      <Alert variant="destructive" className="mx-auto w-full max-w-[640px]">
        <AlertDescription>Không mở được trang hôm nay. Thử tải lại.</AlertDescription>
      </Alert>
    )
  }
  // key theo ngày: qua nửa đêm thì form bắt đầu lại cho ngày mới.
  return <TodayForm key={today} today={today} initial={entry ?? null} />
}

function TodayForm({ today, initial }: { today: string; initial: DayEntry | null }) {
  const { timeZone, iconSetId } = useProfile()
  const limits = tierLimits()
  const ids = useId()
  const { data: recent } = useRecentDays(today)

  const [record, setRecord] = useState<DayEntry | null>(initial)
  const [score, setScore] = useState<Score | null>(initial?.score ?? null)
  const [sub, setSub] = useState<string | null>(initial?.sub_icon ?? null)
  const [flag, setFlag] = useState<string | null>(initial?.flag_color ?? null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords ?? [])
  const scoredAt = record ? new Date(record.created_at) : null

  const autosave = useAutosave({
    date: today,
    record: initial,
    mode: 'auto',
    onLoad: (f) => {
      setScore(f.score as Score)
      setSub(f.sub_icon)
      setFlag(f.flag_color)
      setTitle(f.title)
      setContent(f.content)
      setKeywords(f.keywords)
    },
    onSaved: setRecord,
  })
  const fields: DraftFields | null = score ? { score, sub_icon: sub, flag_color: flag, title, content, keywords } : null
  const fieldsKey = JSON.stringify(fields)
  const { change } = autosave
  // Mỗi lần gõ: hẹn ghi nháp và đồng bộ (bộ máy tự bỏ qua khi không có gì đổi).
  useEffect(() => change(fieldsKey === 'null' ? null : (JSON.parse(fieldsKey) as DraftFields)), [change, fieldsKey])

  // Chấm (hoặc đổi) điểm: lưu ngay, cùng các trường đang có.
  function pick(next: Score) {
    setScore(next)
    void autosave.saveNow({ score: next, sub_icon: sub, flag_color: flag, title, content, keywords })
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-[22px] md:gap-8">
      <section aria-labelledby={`${ids}-q`} className="flex flex-col gap-4 md:gap-5">
        <div className="flex flex-col gap-1 md:gap-1.5">
          <p className="text-[13px] leading-5 text-muted-foreground md:text-sm md:leading-[22px]">
            <span className="md:hidden">{longDateLabel(today, false)}</span>
            <span className="hidden md:inline">{longDateLabel(today)}</span>
          </p>
          <h1 id={`${ids}-q`} className="text-[25px] leading-8 font-bold md:text-[clamp(28px,3vw,34px)] md:leading-[1.25]">
            Hôm nay của bạn thế nào?
          </h1>
        </div>
        <ScorePicker
          iconSetId={iconSetId}
          value={score}
          onChange={pick}
          caption="label"
          className="gap-1.5 sm:gap-3"
          iconClassName="size-10 md:size-[52px]"
        />
        <SyncStatus
          // Lần lưu đầu (vừa chấm điểm) đọc là "Đã ghi lại hôm nay lúc…"; các lần sau mới là "Đã lưu lúc…".
          status={autosave.status.kind === 'saved' && record?.updated_at === record?.created_at ? { kind: 'idle' } : autosave.status}
          timeZone={timeZone}
          onRetry={autosave.retry}
          fallback={
            record && scoredAt ? (
              <>
                <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
                Đã ghi lại hôm nay lúc {timeIn(timeZone, scoredAt)}
              </>
            ) : (
              <span className="text-muted-foreground">Chỉ cần chấm điểm là hôm nay đã được ghi lại.</span>
            )
          }
        />
        {autosave.restored ? (
          <p className="text-[13px] leading-5 text-muted-foreground">Đã khôi phục phần bạn viết dở lần trước.</p>
        ) : null}
      </section>

      {score ? (
        <section
          aria-labelledby={`${ids}-more`}
          className="flex animate-rise flex-col gap-[18px] rounded-[20px] border-[1.5px] border-line bg-card px-4 py-[18px] shadow-ink-sm md:gap-6 md:rounded-lg md:p-7 md:shadow-ink"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`${ids}-more`} className="text-lg leading-[26px] font-semibold md:text-xl md:leading-7">
              Thêm chút nữa?
            </h2>
            <span className="text-xs leading-[18px] text-muted-foreground md:text-[13px] md:leading-5">Không bắt buộc</span>
          </div>

          <div className="flex flex-col gap-[18px] md:flex-row md:flex-wrap md:gap-x-10 md:gap-y-6">
            <fieldset className="min-w-0 md:flex-[1_1_300px]">
              <legend className="mb-2 text-[13px] leading-5 font-semibold md:mb-2.5 md:text-sm md:leading-[22px]">Biểu tượng</legend>
              {/* Điện thoại: một hàng cuộn ngang như thiết kế. Máy tính: lưới gói gọn ba hàng, cuộn dọc khi danh sách dài. */}
              <SubIconPicker
                value={sub}
                onChange={setSub}
                className="-mx-4 flex-nowrap overflow-x-auto px-4 pt-0.5 pb-1.5 md:mx-0 md:max-h-[154px] md:flex-wrap md:overflow-x-visible md:overflow-y-auto md:px-0.5"
              />
            </fieldset>
            <fieldset className="min-w-0 md:flex-[0_1_220px]">
              <legend className="mb-2 text-[13px] leading-5 font-semibold md:mb-2.5 md:text-sm md:leading-[22px]">Cờ hiệu</legend>
              <FlagPicker value={flag} onChange={setFlag} compact />
            </fieldset>
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor={`${ids}-title`} className="sr-only">
              Tiêu đề
            </label>
            <Input
              id={`${ids}-title`}
              value={title}
              maxLength={limits.entry.title_max}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề cho hôm nay"
              className="h-[46px] bg-background font-heading text-[17px] font-semibold md:h-12 md:text-lg"
            />
            <label htmlFor={`${ids}-body`} className="sr-only">
              Nội dung
            </label>
            <Textarea
              id={`${ids}-body`}
              value={content}
              maxLength={limits.entry.content_max}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết vài dòng…"
              rows={4}
              className="min-h-[124px] bg-background text-base leading-7 md:min-h-[162px] md:text-[17px] md:leading-[30px]"
            />
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <KeywordEditor keywords={keywords} onChange={setKeywords} />
            {/* Ảnh có ở Bước 7 (nén trên trình duyệt + tải thẳng lên kho ảnh). */}
            <button
              type="button"
              disabled
              title="Thêm ảnh có ở Bước 7"
              className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-line px-3 text-[13px] font-medium opacity-70 sm:h-8 sm:text-sm"
            >
              <Image className="size-4" aria-hidden="true" />
              Ảnh · 0/{limits.photos.per_day_max}
            </button>
          </div>

          <div className="flex flex-col gap-3 border-border pt-0 md:flex-row-reverse md:items-center md:justify-between md:border-t-[1.5px] md:border-dashed md:pt-[18px]">
            <Button
              onClick={() => void autosave.flush()}
              disabled={autosave.status.kind === 'saving'}
              className="h-12 md:h-11 md:px-[22px]"
            >
              {autosave.status.kind === 'saving' ? 'Đang lưu…' : 'Lưu'}
            </Button>
            <span className="text-center text-xs leading-[18px] text-muted-foreground tabular-nums md:text-[13px] md:leading-5">
              {scoredAt ? `Tạo ${timeIn(timeZone, scoredAt)}` : null}
            </span>
          </div>
          <p className="text-[13px] leading-5 text-muted-foreground">Tự động lưu khi bạn ngừng gõ vài giây.</p>
        </section>
      ) : null}

      <ConflictDialog conflict={autosave.conflict} onKeepMine={autosave.keepMine} onTakeTheirs={autosave.takeTheirs} />

      <RecentDays today={today} iconSetId={iconSetId} todayScore={score} todaySub={sub} recent={recent} />
    </div>
  )
}
