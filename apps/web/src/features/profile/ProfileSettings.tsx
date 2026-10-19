import { CircleCheck, Download, LogOut, Lock, Mail, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEMO_ENTRIES } from '@/lib/demo'
import { tierLimits } from '@/lib/limits'
import { updateProfile, useProfile } from '@/lib/profile'
import { setThemePreference, useThemePreference, type ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { AvatarField } from './components/AvatarField'
import { DeleteAccountDialog } from './components/DeleteAccountDialog'
import { IconSetPicker } from './components/IconSetPicker'
import { TimeZoneField } from './components/TimeZoneField'

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
  { id: 'system', label: 'Theo hệ thống' },
]

function Section({ id, title, delay, children }: { id: string; title: string; delay: number; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex animate-rise flex-col gap-[22px] rounded-[22px] border-[1.5px] border-line bg-card p-[clamp(20px,4vw,32px)] shadow-ink"
      style={{ animationDelay: `${delay}s` }}
    >
      <h2 id={id} className="text-xl leading-7 font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ title, hint, children, danger }: { title: string; hint: string; children: ReactNode; danger?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
        <span className={cn('text-[15px] leading-6 font-semibold', danger && 'text-destructive')}>{title}</span>
        <span className="text-sm leading-[22px] text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  )
}

/** Trang Hồ sơ & cài đặt (thiết kế B7). Chưa có PATCH /me, GET /export, DELETE /me: mọi thay đổi chỉ trong trang. */
export function ProfileSettings() {
  const profile = useProfile()
  const theme = useThemePreference()
  const ids = useId()
  const [name, setName] = useState(profile.displayName)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState(profile.timeZone)
  // Múi giờ lúc mở trang: đổi khác đi thì nhắc "chỉ áp dụng từ ngày đang viết".
  const [initialTimeZone] = useState(() => profile.timeZone)
  const [wipeOpen, setWipeOpen] = useState(false)
  const [wiped, setWiped] = useState(false)
  const maxName = tierLimits().profile.display_name_max
  const dirty = name.trim() !== profile.displayName

  function saveName() {
    const trimmed = name.trim()
    if (!trimmed) return setNameError('Tên không được để trống')
    if (trimmed.length > maxName) return setNameError(`Tên tối đa ${maxName} ký tự`)
    updateProfile({ displayName: trimmed })
    setName(trimmed)
    setNameError(null)
    setSaved(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6">
      <h1 className="animate-rise text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Hồ sơ &amp; cài đặt</h1>

      <Section id={`${ids}-profile`} title="Hồ sơ" delay={0.04}>
        <AvatarField name={name || profile.displayName} src={profile.avatarUrl} onChange={(src) => updateProfile({ avatarUrl: src })} />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-name`} className="text-sm leading-[22px] font-semibold">
            Tên hiển thị
          </label>
          <Input
            id={`${ids}-name`}
            value={name}
            maxLength={maxName}
            autoComplete="name"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={`${ids}-name-hint`}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
              setNameError(null)
            }}
            className="bg-background"
          />
          <span
            id={`${ids}-name-hint`}
            className={nameError ? 'text-[13px] leading-5 font-medium text-destructive' : 'text-[13px] leading-5 text-muted-foreground'}
          >
            {nameError ?? 'Tên và ảnh hiện trên hồ sơ của bạn.'}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span id={`${ids}-mail`} className="text-sm leading-[22px] font-semibold">
            Email
          </span>
          <div
            aria-labelledby={`${ids}-mail`}
            className="flex h-12 items-center gap-2.5 rounded-md border-[1.5px] border-dashed border-border bg-muted px-3.5 text-muted-foreground"
          >
            <Mail className="size-[18px]" aria-hidden="true" />
            <span className="flex-1 truncate">{profile.email}</span>
            <Lock className="size-4" aria-hidden="true" />
          </div>
          <span className="text-[13px] leading-5 text-muted-foreground">Đăng nhập bằng Google. Chỉ mình bạn thấy.</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t-[1.5px] border-dashed border-border pt-[18px]">
          <span role="status" className="inline-flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
            {dirty ? 'Có thay đổi chưa lưu' : saved ? (
              <>
                <CircleCheck className="size-4" aria-hidden="true" /> Đã lưu
              </>
            ) : null}
          </span>
          <Button className="press" disabled={!dirty} onClick={saveName}>
            Lưu thay đổi
          </Button>
        </div>
      </Section>

      <Section id={`${ids}-journal`} title="Nhật ký" delay={0.08}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span id={`${ids}-set`} className="text-sm leading-[22px] font-semibold">
              Bộ icon chấm điểm
            </span>
            <span className="text-[13px] leading-5 text-muted-foreground">Đổi bộ icon chỉ thay hình. Điểm đã ghi giữ nguyên.</span>
          </div>
          <IconSetPicker labelledBy={`${ids}-set`} value={profile.iconSetId} onChange={(iconSetId) => updateProfile({ iconSetId })} />
        </div>
        <TimeZoneField
          value={timeZone}
          saved={initialTimeZone}
          onChange={(tz) => {
            setTimeZone(tz)
            updateProfile({ timeZone: tz })
          }}
        />
      </Section>

      <Section id={`${ids}-look`} title="Giao diện" delay={0.12}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span id={`${ids}-theme`} className="text-sm leading-[22px] font-semibold">
            Chế độ màu
          </span>
          <div role="radiogroup" aria-labelledby={`${ids}-theme`} className="inline-flex gap-0.5 rounded-[14px] border-[1.5px] border-line bg-background p-[3px]">
            {THEMES.map((t) => {
              const on = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setThemePreference(t.id)}
                  className={cn(
                    'h-[38px] cursor-pointer rounded-[11px] px-3.5 text-sm transition-colors focus-visible:outline-3 focus-visible:outline-ring',
                    on ? 'bg-foreground font-semibold text-background' : 'font-medium hover:bg-secondary',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor={`${ids}-lang`} className="text-sm leading-[22px] font-semibold">
            Ngôn ngữ
          </label>
          <div className="flex items-center gap-2.5">
            {/* MVP chỉ có tiếng Việt: hiện ô chọn như thiết kế nhưng khóa. */}
            <select
              id={`${ids}-lang`}
              disabled
              aria-describedby={`${ids}-lang-soon`}
              className="h-11 cursor-not-allowed rounded-md border-[1.5px] border-dashed border-border bg-muted px-3 text-[15px] text-muted-foreground"
            >
              <option>Tiếng Việt</option>
            </select>
            <span id={`${ids}-lang-soon`} className="text-[13px] text-muted-foreground">
              English · Sắp có
            </span>
          </div>
        </div>
      </Section>

      <Section id={`${ids}-share`} title="Chia sẻ" delay={0.16}>
        <div className="flex items-start gap-3.5 rounded-[16px] border-[1.5px] border-dashed border-border bg-muted p-[18px]">
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-[15px] leading-6">Mọi trang đều riêng tư, chỉ mình bạn xem được.</p>
            <p className="text-sm leading-[22px] text-muted-foreground">
              Chia sẻ một trang bằng link · <strong className="font-semibold text-foreground">Sắp có</strong>
            </p>
          </div>
        </div>
      </Section>

      <Section id={`${ids}-account`} title="Tài khoản" delay={0.2}>
        <Row title="Đăng xuất" hint="Nhật ký vẫn còn, đăng nhập lại bằng Google để xem.">
          <Button asChild variant="secondary" size="sm" className="h-10 px-3.5">
            <Link to="/">
              <LogOut aria-hidden="true" /> Đăng xuất
            </Link>
          </Button>
        </Row>
        <Row title="Tải dữ liệu về" hint="Toàn bộ nhật ký dạng JSON, luôn miễn phí.">
          <span className="inline-flex items-center gap-2">
            <Button variant="secondary" size="sm" className="h-10 px-3.5" disabled aria-describedby={`${ids}-export-soon`}>
              <Download aria-hidden="true" /> Tải về
            </Button>
            <span id={`${ids}-export-soon`} className="text-[13px] text-muted-foreground">
              Sắp có
            </span>
          </span>
        </Row>
        <div className="border-t-[1.5px] border-dashed border-border pt-[22px]">
          {wiped ? (
            <p role="status" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CircleCheck className="size-4" aria-hidden="true" /> Bản thử: chưa xóa gì. Xóa tài khoản thật có ở Bước 12.
            </p>
          ) : null}
          <Row title="Xóa tài khoản" hint="Xóa tài khoản cùng mọi trang, điểm và ảnh. Không thể lấy lại." danger>
            <Button variant="destructive" size="sm" className="h-10 px-3.5" onClick={() => setWipeOpen(true)}>
              <Trash2 aria-hidden="true" /> Xóa tài khoản
            </Button>
          </Row>
        </div>
      </Section>

      <footer className="flex flex-wrap gap-5 px-1 text-sm text-muted-foreground">
        <a href="#" className="link-underline">
          [Điều khoản sử dụng]
        </a>
        <a href="#" className="link-underline">
          [Chính sách quyền riêng tư]
        </a>
        <span>Jotly · bản dev</span>
      </footer>

      <DeleteAccountDialog
        open={wipeOpen}
        onOpenChange={setWipeOpen}
        pageCount={DEMO_ENTRIES.length}
        onConfirm={() => setWiped(true)}
      />
    </div>
  )
}
