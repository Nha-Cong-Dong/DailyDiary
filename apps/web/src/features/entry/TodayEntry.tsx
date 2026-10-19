import { CircleCheck, Image } from 'lucide-react'
import { useId, useState } from 'react'
import { FlagPicker } from '@/components/diary/FlagPicker'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { SubIconPicker } from '@/components/diary/SubIconPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Score } from '@/lib/catalog'
import { longDateLabel, timeIn, todayIn, useNow } from '@/lib/date'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import { KeywordEditor } from './KeywordEditor'
import { RecentDays } from './RecentDays'

/**
 * Màn "Hôm nay" (thiết kế B6): chấm điểm trước, các trường khác mở ra sau và đều không bắt buộc.
 * Chưa có API nhật ký (Bước 5) nên mọi thứ chỉ nằm trong bộ nhớ của trang, tải lại là mất.
 */
export function TodayEntry() {
  const { timeZone, iconSetId } = useProfile()
  const now = useNow()
  const today = todayIn(timeZone, now)
  const limits = tierLimits()
  const ids = useId()

  const [score, setScore] = useState<Score | null>(null)
  const [scoredAt, setScoredAt] = useState<Date | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [flag, setFlag] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [saveNotice, setSaveNotice] = useState(false)

  function pick(next: Score) {
    setScore(next)
    if (!scoredAt) setScoredAt(new Date())
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
        {score && scoredAt ? (
          <p role="status" className="flex items-center gap-2 text-sm leading-[22px] md:text-[15px] md:leading-6">
            <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
            Đã chấm điểm lúc {timeIn(timeZone, scoredAt)}
            <span className="text-muted-foreground">· bản thử, chưa lưu</span>
          </p>
        ) : (
          <p className="text-sm leading-[22px] text-muted-foreground md:text-[15px] md:leading-6">
            Chỉ cần chấm điểm là hôm nay đã được ghi lại.
          </p>
        )}
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
            <Button onClick={() => setSaveNotice(true)} className="h-12 md:h-11 md:px-[22px]">
              Lưu
            </Button>
            <span className="text-center text-xs leading-[18px] text-muted-foreground tabular-nums md:text-[13px] md:leading-5">
              {scoredAt ? `Tạo ${timeIn(timeZone, scoredAt)}` : null}
            </span>
          </div>
          {saveNotice ? (
            <p role="status" className="text-[13px] leading-5 text-muted-foreground">
              Bản thử giao diện: chưa lưu lên máy chủ. Lưu nhật ký thật có ở Bước 5.
            </p>
          ) : null}
        </section>
      ) : null}

      <RecentDays today={today} iconSetId={iconSetId} todayScore={score} todaySub={sub} />
    </div>
  )
}
