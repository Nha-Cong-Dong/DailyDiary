import { CircleAlert, CircleCheck, Info, Pencil } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { CalendarCell, type DayState } from '@/components/diary/CalendarCell'
import { EntryCard, EntryPhoto } from '@/components/diary/EntryCard'
import { FlagPicker } from '@/components/diary/FlagPicker'
import { AddKeywordButton, KeywordChip } from '@/components/diary/KeywordChip'
import { MoodMark } from '@/components/diary/MoodMark'
import { PixelCell, PixelLegend } from '@/components/diary/PixelCell'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { ScorePicker } from '@/components/diary/ScorePicker'
import { Stamp } from '@/components/diary/Stamp'
import { SubIconPicker } from '@/components/diary/SubIconPicker'
import { Toast } from '@/components/diary/Toast'
import { Logo, LogoMark } from '@/components/layout/Logo'
import { ThemePicker } from '@/components/layout/ThemeToggle'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { HealthStatus } from '@/features/health/HealthStatus'
import { flagColors, iconSets, SCORES, type Score } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'

// Trang xem nhanh hệ thiết kế Jotly 1.1 (canvas B11-Foundations, B11-Components, B11-DayCard, B11-Theme, B5-Logo).
// Chỉ có ở môi trường dev, dữ liệu là mẫu cố định.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-heading">{title}</h2>
      {children}
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-label text-ink-soft">{children}</p>
}

const TYPE_SCALE = [
  ['display · clamp 40–64 · 800 · FLAR 100', 'text-display', 'Chạm để ghi chú, mở để nhìn lại.'],
  ['title · 30/38 (điện thoại 26/32) · 700 · FLAR 60', 'text-title', 'Hôm nay, thứ Sáu 30/10'],
  ['heading · 22/30 · 600 · FLAR 60', 'text-heading', 'Chiều mưa đọc sách'],
  ['reading · 18/30 · 400', 'text-reading max-w-[680px]', 'Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở.'],
  ['body · 16/24 · 400', 'text-body', 'Chấm điểm ngay tại đây, trang hôm nay sẽ được cập nhật.'],
  ['label · 13/18 · 600', 'text-label', 'Còn 3 giờ 12 phút trước khi sang ngày mới'],
] as const

const SWATCHES = [
  ['paper', 'bg-paper'],
  ['card', 'bg-card'],
  ['sunk', 'bg-sunk'],
  ['pressed', 'bg-pressed'],
  ['secondary', 'bg-secondary'],
  ['ink', 'bg-ink'],
  ['ink-soft', 'bg-ink-soft'],
  ['ink-faint', 'bg-ink-faint'],
  ['line-soft', 'bg-line-soft'],
  ['rule', 'bg-rule'],
  ['peach', 'bg-peach'],
  ['peach-soft', 'bg-peach-soft'],
  ['sage', 'bg-sage'],
  ['sage-soft', 'bg-sage-soft'],
  ['lavender', 'bg-lavender'],
  ['lavender-soft', 'bg-lavender-soft'],
  ['danger', 'bg-danger'],
  ['danger-soft', 'bg-danger-soft'],
  ['score-1', 'bg-score-1'],
  ['score-5', 'bg-score-5'],
] as const

const BUTTONS = [
  ['cta', 'Mở trang hôm nay'],
  ['default', 'Lưu nhật ký'],
  ['secondary', 'Thêm ảnh'],
  ['destructive', 'Xóa nhật ký'],
  ['destructive-solid', 'Xóa vĩnh viễn'],
  ['ghost', 'Hủy'],
  ['outline', 'Mở thùng rác'],
  ['link', 'Xem dòng thời gian'],
] as const

const WEEK: { dow: string; day: number; score: Score | null; sub: string | null; state: DayState }[] = [
  { dow: 'T2', day: 12, score: 3, sub: '🍀', state: 'past' },
  { dow: 'T3', day: 13, score: 4, sub: '🌸', state: 'past' },
  { dow: 'T4', day: 14, score: null, sub: null, state: 'past' },
  { dow: 'T5', day: 15, score: 2, sub: '🧊', state: 'past' },
  { dow: 'T6', day: 16, score: 5, sub: '🌸', state: 'past' },
  { dow: 'T7', day: 17, score: 3, sub: '🍀', state: 'past' },
  { dow: 'CN', day: 18, score: 4, sub: '😌', state: 'today' },
  { dow: 'T2', day: 19, score: null, sub: null, state: 'future' },
]

export function DevUiPage() {
  const [iconSetId, setIconSetId] = useState('sprout')
  const [score, setScore] = useState<Score | null>(4)
  const [sub, setSub] = useState<string | null>('😌')
  const [flag, setFlag] = useState<string | null>(flagColors.at(-1)!.hex)
  const [keywords, setKeywords] = useState(['đọc sách', 'mưa', 'trà gừng'])
  const [view, setView] = useState<'list' | 'cal'>('list')
  const [toast, setToast] = useState(false)
  const [shared, setShared] = useState(true)
  const maxPhotos = tierLimits().photos.per_day_max

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(false), 6000)
    return () => window.clearTimeout(id)
  }, [toast])

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-title">Hệ thiết kế Jotly 1.1</h1>
          <HealthStatus />
        </div>
        <ThemePicker />
      </header>

      <Section title="Logo">
        <div className="flex flex-wrap items-end gap-8">
          <Logo size="lg" />
          <Logo />
          <Logo size="sm" />
          <LogoMark size={64} />
          <LogoMark size={40} />
          <LogoMark size={24} />
        </div>
      </Section>

      <Section title="Kiểu chữ">
        <div className="flex flex-col gap-5">
          {TYPE_SCALE.map(([meta, cls, text]) => (
            <div key={meta} className="grid gap-1 md:grid-cols-[300px_minmax(0,1fr)] md:items-baseline md:gap-6">
              <Label>{meta}</Label>
              <span className={cls}>{text}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Màu">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-10">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-sm border-[1.5px] border-stroke ${cls}`} />
              <span className="text-label">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-col gap-4">
          {BUTTONS.map(([variant, text]) => (
            <div
              key={variant}
              className="grid grid-cols-1 items-center justify-items-start gap-2 sm:grid-cols-[150px_auto_auto] sm:justify-start sm:gap-4"
            >
              <Label>{variant}</Label>
              <Button variant={variant}>{text}</Button>
              {variant === 'link' ? (
                <span />
              ) : (
                <Button variant={variant} disabled>
                  Vô hiệu
                </Button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Chấm điểm</Button>
            <Button>Lưu nhật ký</Button>
            <Button size="lg">Lưu nhật ký</Button>
            <Button variant="secondary" size="icon" aria-label="Sửa nhật ký">
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Card, Segmented, Stamp, Switch, Toast">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">raised</Card>
          <Card elevation="low" className="p-5">
            low
          </Card>
          <Card elevation="flat" className="p-5">
            flat
          </Card>
          <Card asChild interactive className="p-5">
            <button type="button" onClick={() => setToast(true)}>
              interactive: bấm để hiện thông báo
            </button>
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <Segmented
            ariaLabel="Cách xem"
            options={[
              { value: 'list', label: 'Danh sách' },
              { value: 'cal', label: 'Lịch' },
            ]}
            value={view}
            onChange={setView}
            className="w-[280px]"
          />
          <Label>Đang xem: {view === 'list' ? 'Danh sách' : 'Lịch'}</Label>
          <label className="flex min-h-11 items-center gap-3 text-body font-semibold">
            <Switch checked={shared} onCheckedChange={setShared} />
            Cho phép xem
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Stamp kind="saved">Đã lưu lúc 21:32</Stamp>
          <Stamp kind="saving" />
          <Stamp kind="unsynced" />
          <Stamp kind="error" />
          <Stamp kind="trash">Trong thùng rác, còn 23 ngày</Stamp>
        </div>
        <Toast open={toast} action={{ label: 'Hoàn tác', onClick: () => setToast(false) }}>
          Đã chuyển vào thùng rác
        </Toast>
      </Section>

      <Section title="Ô nhập">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-title" className="text-body font-semibold">
              Tiêu đề
            </label>
            <Input id="dev-title" placeholder="Hôm nay thế nào?" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-keyword" className="text-body font-semibold">
              Từ khóa
            </label>
            <Input id="dev-keyword" defaultValue="mưa" aria-invalid="true" aria-describedby="dev-keyword-msg" />
            <span id="dev-keyword-msg" className="flex items-center gap-1.5 text-label text-danger">
              <CircleAlert className="size-4" aria-hidden="true" />
              Từ khóa này đã có trong ngày
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-email" className="text-body font-semibold">
              Tài khoản Google
            </label>
            <Input id="dev-email" type="email" defaultValue="ban@gmail.com" disabled />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
            <label htmlFor="dev-body" className="text-body font-semibold">
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
              <h3 className="text-heading">{set.name}</h3>
              <div className="grid grid-cols-5 gap-3">
                {set.levels.map((l) => (
                  <div key={l.score} className="flex flex-col items-center gap-2">
                    <ScoreIcon iconSetId={set.id} score={l.score as Score} size={56} />
                    <span className="text-center text-label font-medium">
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
              <span className="text-label text-ink-soft">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Viết nhật ký: chấm điểm, sub icon, cờ hiệu">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-7 rounded-lg border-[1.5px] border-stroke bg-card p-5 shadow-md sm:p-8">
            <div className="flex flex-col gap-2">
              <label htmlFor="dev-icon-set" className="text-body font-semibold">
                Bộ icon
              </label>
              <select
                id="dev-icon-set"
                value={iconSetId}
                onChange={(e) => setIconSetId(e.target.value)}
                className="h-11 rounded-md border-[1.5px] border-stroke bg-card px-3 text-body"
              >
                {iconSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-body font-semibold">
                Hôm nay của bạn <span className="font-normal text-ink-soft">· bắt buộc</span>
              </legend>
              <ScorePicker iconSetId={iconSetId} value={score} onChange={setScore} caption="label" />
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-body font-semibold">Biểu tượng mong muốn</legend>
              <SubIconPicker value={sub} onChange={setSub} />
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-body font-semibold">
                Cờ hiệu · {flagColors.find((f) => f.hex === flag)?.name ?? 'không gắn'}
              </legend>
              <FlagPicker value={flag} onChange={setFlag} />
            </fieldset>
          </div>
          <div className="flex flex-col gap-7">
            <Label>Thẻ trong Dòng thời gian (B11-DayCard)</Label>
            <EntryCard
              dateLabel="Chủ nhật · 18/10"
              iconSetId={iconSetId}
              score={score ?? 3}
              subIcon={sub}
              flagColor={flag}
              title="Chiều mưa đọc sách"
              excerpt="Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở."
              keywords={['đọc sách', 'mưa']}
              photoCount={3}
              interactive
            />
            <EntryCard dateLabel="Thứ Sáu · 16/10" iconSetId={iconSetId} score={5} footer="Mở để viết thêm" />
            <EntryCard
              dateLabel="Thứ Tư · 14/10"
              iconSetId={iconSetId}
              score={3}
              backfill
              title="Một ngày bình thường"
              excerpt="Ghi lại sau bốn ngày. Không nhớ nhiều, chỉ nhớ trời đẹp."
              footer="Ghi bù ngày 18/10"
            />
          </div>
        </div>
      </Section>

      <Section title="Trang ngày (EntryCard variant page)">
        <EntryCard
          variant="page"
          className="max-w-[620px]"
          dateLabel="Chủ nhật, 18/10/2026"
          dateParts={{ weekday: 'Chủ nhật', day: 18, month: 10, year: 2026 }}
          statusLine="Hé nở · ghi đúng ngày"
          iconSetId={iconSetId}
          score={score ?? 4}
          subIcon={sub}
          flagColor={flag}
          title="Chiều mưa đọc sách"
          excerpt="Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở. Tối nấu bát phở, gọi điện cho mẹ, kể chuyện tuần này."
          photo={<EntryPhoto alt="Ảnh 1 trong 3 của ngày 18/10/2026" caption="1 / 3 ảnh" />}
          keywords={['đọc sách', 'mưa', 'mẹ']}
          footer={
            <>
              <Stamp kind="saved">Đã lưu lúc 21:32</Stamp>
              <span>Sửa lần cuối 18/10</span>
            </>
          }
        />
      </Section>

      <Section title="Lịch tháng & Year in Pixels">
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
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
              onClick={d.state === 'future' ? undefined : () => undefined}
            />
          ))}
        </div>
        <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-[3px]">
          {Array.from({ length: 31 }, (_, i) => {
            const day = i + 1
            const s = day > 18 ? null : SCORES[(day * 7) % 5]
            return (
              <PixelCell key={day} score={day === 14 ? null : s} state={day > 18 ? 'future' : 'past'} label={`${day}/10`} />
            )
          })}
        </div>
        <PixelLegend />
      </Section>
    </div>
  )
}
