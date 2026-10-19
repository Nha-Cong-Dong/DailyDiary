import { CircleAlert, CircleCheck, Info, Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CalendarCell, type DayState } from '@/components/diary/CalendarCell'
import { EntryCard } from '@/components/diary/EntryCard'
import { FlagPicker } from '@/components/diary/FlagPicker'
import { AddKeywordButton, KeywordChip } from '@/components/diary/KeywordChip'
import { MoodMark } from '@/components/diary/MoodMark'
import { PixelCell, PixelLegend } from '@/components/diary/PixelCell'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { SubIconPicker } from '@/components/diary/SubIconPicker'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { HealthStatus } from '@/features/health/HealthStatus'
import { flagColors, iconSets, SCORES, type Score } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'

// Trang xem nhanh hệ thiết kế (MVP Bước 2). Chỉ có ở môi trường dev, dữ liệu là mẫu cố định.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t-[1.5px] border-border pt-8">
      <h2 className="text-title-2 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-label font-semibold tracking-[0.08em] text-muted-foreground uppercase">{children}</p>
}

const TYPE_SCALE = [
  ['Display · Lora 700 · 56/68', 'font-heading text-display font-bold tracking-[-0.01em]', 'Chạm để ghi chú'],
  ['H1 · Lora 700 · 40/50', 'font-heading text-title-1 font-bold', 'Mở để nhìn lại cả một năm'],
  ['H2 · Lora 600 · 30/40', 'font-heading text-title-2 font-semibold', 'Dòng thời gian tháng 10'],
  ['H3 · Lora 600 · 22/30', 'font-heading text-title-3 font-semibold', 'Chiều mưa đọc sách'],
  ['Nội dung · 400 · 18/30', 'text-reading max-w-[680px]', 'Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở.'],
  ['Body · 400 · 16/26', 'text-base leading-[26px]', 'Chỉ cần chấm điểm là ngày hôm đó đã được ghi lại.'],
  ['Nhỏ · 500 · 14/22', 'text-sm leading-[22px] font-medium tabular-nums', 'Tạo 21:04 · Sửa 21:32'],
  ['Nhãn · 600 · 12/16 · +8%', 'text-label font-semibold tracking-[0.08em] uppercase', 'Year in Pixels'],
] as const

const SWATCHES = [
  ['Nền', 'bg-background'],
  ['Bề mặt', 'bg-card'],
  ['Lõm', 'bg-muted'],
  ['Mềm', 'bg-secondary'],
  ['Viền mảnh', 'bg-border'],
  ['Mực', 'bg-line'],
  ['Chữ phụ', 'bg-muted-foreground'],
  ['Nguy hiểm', 'bg-destructive'],
  ['Dòng kẻ', 'bg-rule'],
  ['Điểm 1', 'bg-score-1'],
  ['Điểm 3', 'bg-score-3'],
  ['Điểm 5', 'bg-score-5'],
] as const

const WEEK: { dow: string; day: number; score: Score | null; sub: string | null; state: DayState }[] = [
  { dow: 'T2', day: 12, score: 3, sub: '🍀', state: 'past' },
  { dow: 'T3', day: 13, score: 4, sub: '🌸', state: 'past' },
  { dow: 'T4', day: 14, score: null, sub: null, state: 'past' },
  { dow: 'T5', day: 15, score: 2, sub: '🧊', state: 'past' },
  { dow: 'T6', day: 16, score: 5, sub: '🌸', state: 'past' },
  { dow: 'T7', day: 17, score: 3, sub: '🍀', state: 'past' },
  { dow: 'CN', day: 18, score: 4, sub: '😌', state: 'today' },
]

export function DevUiPage() {
  const [iconSetId, setIconSetId] = useState('sprout')
  const [score, setScore] = useState<Score | null>(4)
  const [sub, setSub] = useState<string | null>('😌')
  const [flag, setFlag] = useState<string | null>(flagColors.at(-1)!.hex)
  const [keywords, setKeywords] = useState(['đọc sách', 'mưa', 'trà gừng'])
  const maxPhotos = tierLimits().photos.per_day_max

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <Label>Jotly · Bước 2</Label>
        <h1 className="text-title-1 font-bold">Hệ thiết kế</h1>
        <HealthStatus />
      </header>

      <Section title="Kiểu chữ">
        <div className="flex flex-col">
          {TYPE_SCALE.map(([meta, cls, text]) => (
            <div key={meta} className="grid gap-2 border-t border-border py-4 md:grid-cols-[240px_minmax(0,1fr)] md:items-baseline md:gap-6">
              <span className="text-sm leading-[22px] text-muted-foreground">{meta}</span>
              <span className={cls}>{text}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Màu">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-14 rounded-[12px] border border-border ${cls}`} />
              <span className="text-[13px] font-semibold">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Nút">
        <div className="flex flex-col gap-4">
          {(['default', 'secondary', 'ghost', 'destructive'] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <Button variant={variant}>{variant === 'destructive' ? 'Xóa nhật ký' : variant === 'ghost' ? 'Hủy' : variant === 'secondary' ? 'Thêm ảnh' : 'Lưu nhật ký'}</Button>
              <Button variant={variant} disabled>
                Vô hiệu
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="icon" aria-label="Sửa nhật ký">
              <Pencil aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="icon" aria-label="Sửa nhật ký" disabled>
              <Pencil aria-hidden="true" />
            </Button>
            <Button size="lg">Lưu nhật ký · lớn</Button>
            <Button size="sm">Chấm điểm</Button>
          </div>
        </div>
      </Section>

      <Section title="Ô nhập">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-title" className="text-sm leading-[22px] font-semibold">
              Tiêu đề
            </label>
            <Input id="dev-title" placeholder="Hôm nay thế nào?" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-keyword" className="text-sm leading-[22px] font-semibold">
              Từ khóa
            </label>
            <Input id="dev-keyword" defaultValue="mưa" aria-invalid="true" aria-describedby="dev-keyword-msg" />
            <span id="dev-keyword-msg" className="flex items-center gap-1.5 text-[13px] leading-5 font-medium text-destructive">
              <CircleAlert className="size-4" aria-hidden="true" />
              Từ khóa này đã có trong ngày
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-email" className="text-sm leading-[22px] font-semibold">
              Tài khoản Google
            </label>
            <Input id="dev-email" type="email" defaultValue="ban@gmail.com" disabled />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
            <label htmlFor="dev-body" className="text-sm leading-[22px] font-semibold">
              Nội dung
            </label>
            <Textarea
              id="dev-body"
              placeholder="Viết vài dòng nếu muốn…"
              defaultValue="Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở. Pha một ấm trà gừng, nghe mưa rơi trên mái tôn."
            />
          </div>
        </div>
      </Section>

      <Section title="Chip từ khóa">
        <div className="flex flex-wrap items-center gap-2.5">
          <KeywordChip>mưa</KeywordChip>
          <KeywordChip active>đọc sách</KeywordChip>
          {keywords.map((k) => (
            <KeywordChip key={k} onRemove={() => setKeywords((ks) => ks.filter((x) => x !== k))}>
              {k}
            </KeywordChip>
          ))}
          <AddKeywordButton />
        </div>
      </Section>

      <Section title="Thông báo nhanh">
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <Alert role="status">
            <CircleCheck aria-hidden="true" />
            <AlertDescription>Đã lưu nhật ký lúc 21:32</AlertDescription>
            <AlertAction>
              <Button variant="ghost" size="sm">
                Hoàn tác
              </Button>
            </AlertAction>
          </Alert>
          <Alert role="status">
            <Info aria-hidden="true" />
            <AlertDescription className="flex flex-col items-start gap-2">
              Hôm nay chưa chấm điểm. Chỉ cần một chạm là ngày này đã được ghi lại.
              <Button size="sm">Chấm điểm</Button>
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>Mỗi ngày tối đa {maxPhotos} ảnh. Bỏ bớt một ảnh để thêm ảnh mới.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Bộ main icon">
        <div className="grid gap-8 lg:grid-cols-2">
          {iconSets.map((set) => (
            <div key={set.id} className="flex flex-col gap-3">
              <h3 className="text-title-3 font-semibold">{set.name}</h3>
              <div className="grid grid-cols-5 gap-3">
                {set.levels.map((l) => (
                  <div key={l.score} className="flex flex-col items-center gap-2">
                    <ScoreIcon iconSetId={set.id} score={l.score as Score} size={56} />
                    <span className="text-center text-[13px] leading-[18px]">
                      {l.score} · {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Label>Main + sub icon theo kích thước · --sub-icon-ratio</Label>
        <div className="flex flex-wrap items-end gap-10">
          {[
            [32, 'Ô lịch · 32'],
            [56, 'Thẻ nhật ký · 56'],
            [88, 'Trang chi tiết · 88'],
          ].map(([size, label]) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <MoodMark iconSetId="sprout" score={4} subIcon="😌" size={size as number} />
              <span className="text-[13px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Viết nhật ký: chấm điểm, sub icon, cờ hiệu">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-7 rounded-lg border-[1.5px] border-line bg-card p-5 shadow-ink sm:p-8">
            <div className="flex flex-col gap-2">
              <label htmlFor="dev-icon-set" className="text-[15px] leading-6 font-semibold">
                Bộ icon
              </label>
              <select
                id="dev-icon-set"
                value={iconSetId}
                onChange={(e) => setIconSetId(e.target.value)}
                className="h-11 rounded-md border-[1.5px] border-line bg-card px-3"
              >
                {iconSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[15px] leading-6 font-semibold">
                Hôm nay của bạn <span className="font-normal text-muted-foreground">· bắt buộc</span>
              </legend>
              <ScorePicker iconSetId={iconSetId} value={score} onChange={setScore} />
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-[15px] leading-6 font-semibold">Biểu tượng mong muốn</legend>
              <SubIconPicker value={sub} onChange={setSub} />
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-[15px] leading-6 font-semibold">
                Cờ hiệu · {flagColors.find((f) => f.hex === flag)?.name ?? 'không gắn'}
              </legend>
              <FlagPicker value={flag} onChange={setFlag} />
            </fieldset>
          </div>
          <div className="flex flex-col gap-7">
            <Label>Xem trước · thẻ dòng thời gian</Label>
            <EntryCard
              dateLabel={`Chủ nhật, 18/10/2026${score ? ` · điểm ${score}` : ''}`}
              iconSetId={iconSetId}
              score={score ?? 3}
              subIcon={sub}
              flagColor={flag}
              title="Chiều mưa đọc sách"
              excerpt="Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở."
              keywords={['đọc sách', 'mưa', 'trà gừng']}
              meta="Tạo 21:04"
            />
          </div>
        </div>
      </Section>

      <Section title="Lịch tháng & Year in Pixels">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEK.map((d) => (
            <CalendarCell
              key={d.day}
              day={d.day}
              weekday={d.dow}
              score={d.score}
              subIcon={d.sub}
              iconSetId={iconSetId}
              state={d.state}
              label={`${d.day}/10${d.score ? `, điểm ${d.score}` : ', chưa ghi'}`}
              onClick={() => undefined}
            />
          ))}
        </div>
        <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-[3px]">
          {Array.from({ length: 31 }, (_, i) => {
            const day = i + 1
            const s = day > 18 ? null : SCORES[(day * 7) % 5]
            return (
              <PixelCell
                key={day}
                score={day === 14 ? null : s}
                state={day > 18 ? 'future' : 'past'}
                label={`${day}/10`}
              />
            )
          })}
        </div>
        <PixelLegend />
      </Section>
    </div>
  )
}
