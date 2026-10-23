import { ChevronRight, CircleCheck, Eraser, Link2, Lock, LogOut, Mail, MessageSquare, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { BottomSheet } from '@/components/diary/BottomSheet'
import { Avatar } from '@/components/layout/Avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { tierLimits } from '@/lib/limits'
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/lib/profile'
import { useLogout } from '@/lib/session'
import { setThemePreference, useThemePreference, type ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { AvatarField } from './components/AvatarField'
import { AccountDeletedDialog, DeleteAccountDialog, DeleteDataDialog } from './components/DeleteAccountDialog'
import { IconSetPicker } from './components/IconSetPicker'
import { CustomFlagColors } from './components/CustomFlagColors'
import { TimeZoneField } from './components/TimeZoneField'
import { usePageCount, useWipeJournal } from './useJournalData'

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
  { id: 'system', label: 'Theo hệ thống' },
]

const focusRing = 'focus-visible:outline-3 focus-visible:outline-ring'
// Dòng bấm được trong thẻ trên điện thoại (thiết kế B10): cao 56 px, đổi nền khi chạm.
const phoneRow = cn(
  'flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 text-left text-[15px] leading-[22px] transition-colors active:bg-foreground/5 focus-visible:-outline-offset-3',
  focusRing,
)
// Đường kẻ đứt giữa các khối trong cùng một thẻ.
const dashedBetween = '[&>*+*]:border-t-[1.5px] [&>*+*]:border-dashed [&>*+*]:border-border'

/**
 * Một mục cài đặt. Máy tính: thẻ lớn có tiêu đề bên trong (thiết kế B7).
 * Điện thoại: nhãn nhỏ phía trên, nội dung trong thẻ gọn, các khối cách nhau bằng nét đứt (thiết kế B10).
 */
function Section({ id, title, delay, className, children }: { id: string; title: string; delay: number; className?: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex animate-rise flex-col gap-2 sm:gap-[22px] sm:rounded-[22px] sm:border-[1.5px] sm:border-line sm:bg-card sm:p-[clamp(20px,4vw,32px)] sm:shadow-ink',
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <h2 id={id} className="mx-1 max-sm:font-sans text-[13px] leading-5 font-semibold tracking-[.02em] text-muted-foreground sm:mx-0 sm:text-xl sm:leading-7 sm:tracking-normal sm:text-foreground">
        {title}
      </h2>
      <div
        className={cn(
          'flex flex-col sm:gap-[22px]',
          'max-sm:overflow-hidden max-sm:rounded-[18px] max-sm:border-[1.5px] max-sm:border-line max-sm:bg-card max-sm:shadow-[3px_3px_0_var(--ink-shadow)]',
          'max-sm:[&>*+*]:border-t-[1.5px] max-sm:[&>*+*]:border-dashed max-sm:[&>*+*]:border-border',
        )}
      >
        {children}
      </div>
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

/**
 * Trang Hồ sơ & cài đặt (thiết kế B7, bản điện thoại B10). Tên, bộ icon, múi giờ, gỡ ảnh lưu qua PATCH /me.
 * Ảnh đại diện tải lên kho ảnh (Bước 7). Chưa có: xóa dữ liệu và xóa tài khoản thật (Bước 12; ở đây là bản thử trên dữ liệu mẫu).
 * Mục Tài khoản theo canvas (quyết định 21/10/2026): không có xuất dữ liệu; "Xóa toàn bộ dữ liệu" gõ "XÓA";
 * "Xóa tài khoản" gõ đúng email. English vẫn khóa (giữ như code, cùng quyết định với Landing).
 */
type ProfileSettingsProps = {
  /** Nội dung mục Chia sẻ do trang ghép vào (features/share); không có thì hiện "mọi trang đều riêng tư". */
  sharing?: ReactNode
  /** Số link đang bật, để nhắc trong hộp thoại xóa tài khoản. */
  shareCount?: number
  /** Tắt mọi link chia sẻ khi xóa dữ liệu hoặc tài khoản (trang ghép từ features/share). */
  onClearShares?: () => void
  /** Mở form góp ý (trang ghép từ features/feedback); không có thì ẩn mục Góp ý. */
  onFeedback?: () => void
}

export function ProfileSettings({ sharing, shareCount = 0, onClearShares, onFeedback }: ProfileSettingsProps) {
  const profile = useProfile()
  const save = useUpdateProfile()
  const logout = useLogout()
  const navigate = useNavigate()
  const avatar = useUploadAvatar()
  const theme = useThemePreference()
  const ids = useId()
  const [name, setName] = useState(profile.displayName)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState(profile.timeZone)
  // Múi giờ lúc mở trang: đổi khác đi thì nhắc "chỉ áp dụng từ ngày đang viết".
  const [initialTimeZone] = useState(() => profile.timeZone)
  const pageCount = usePageCount()
  const wipe = useWipeJournal(onClearShares)
  const [dataOpen, setDataOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountGone, setAccountGone] = useState(false)
  const [wiped, setWiped] = useState(false)
  // Điện thoại: sửa tên và ảnh trong bảng trượt "Sửa hồ sơ".
  const [editOpen, setEditOpen] = useState(false)
  const maxName = tierLimits().profile.display_name_max
  const dirty = name.trim() !== profile.displayName
  const avatarSrc = profile.avatarUrl

  function saveName(onDone?: () => void) {
    const trimmed = name.trim()
    if (!trimmed) return setNameError('Tên không được để trống')
    if (trimmed.length > maxName) return setNameError(`Tên tối đa ${maxName} ký tự`)
    if (trimmed === profile.displayName) {
      setName(trimmed)
      return onDone?.()
    }
    save.mutate(
      { display_name: trimmed },
      {
        onSuccess: () => {
          setName(trimmed)
          setNameError(null)
          setSaved(true)
          onDone?.()
        },
        onError: () => setNameError('Chưa lưu được. Thử lại nhé.'),
      },
    )
  }

  const avatarProps = {
    name: name || profile.displayName,
    src: avatarSrc,
    busy: avatar.isPending,
    uploadError: avatar.isError ? 'Chưa đổi được ảnh. Kiểm tra kết nối rồi thử lại.' : null,
    onPick: (file: File) => avatar.mutate(file),
    onRemove: () => {
      avatar.reset()
      if (profile.avatarUrl) save.mutate({ avatar_url: null })
    },
  }

  function openEdit(open: boolean) {
    // Mở hoặc hủy đều bắt đầu lại từ tên đang lưu.
    setName(profile.displayName)
    setNameError(null)
    setEditOpen(open)
  }

  const nameField = (inputId: string) => (
    <div className="flex flex-col gap-2 max-sm:gap-1.5">
      <label htmlFor={inputId} className="text-sm leading-[22px] font-semibold max-sm:leading-5">
        Tên hiển thị
      </label>
      <Input
        id={inputId}
        value={name}
        maxLength={maxName}
        autoComplete="name"
        aria-invalid={nameError ? true : undefined}
        aria-describedby={`${inputId}-hint`}
        onChange={(e) => {
          setName(e.target.value)
          setSaved(false)
          setNameError(null)
        }}
        className="bg-background"
      />
      <span
        id={`${inputId}-hint`}
        className={nameError ? 'text-[13px] leading-5 font-medium text-destructive' : 'text-[13px] leading-5 text-muted-foreground'}
      >
        {nameError ?? 'Tên và ảnh hiện trên hồ sơ của bạn.'}
      </span>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6 max-sm:gap-5">
      <h1 className="animate-rise text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold max-sm:text-[22px] max-sm:leading-[30px]">
        Hồ sơ &amp; cài đặt
      </h1>

      {/* Điện thoại: thẻ hồ sơ gọn, bấm Sửa để mở bảng trượt. */}
      <div className="-mb-2 flex flex-col gap-3 sm:hidden">
        <div className="flex animate-rise items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-card p-4 shadow-[3px_3px_0_var(--ink-shadow)]">
          <Avatar name={profile.displayName} src={avatarSrc} size={60} className="font-heading font-bold" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[17px] leading-6 font-semibold">{profile.displayName}</span>
            <span className="truncate text-[13px] leading-5 text-muted-foreground">{profile.email}</span>
          </span>
          <Button variant="outline" className="press h-10 rounded-[12px] px-3.5" aria-haspopup="dialog" onClick={() => openEdit(true)}>
            Sửa
          </Button>
        </div>
        {saved && !editOpen ? (
          <p role="status" className="mx-1 text-[13px] leading-5 text-muted-foreground">
            Đã lưu tên hiển thị.
          </p>
        ) : null}
      </div>

      <Section id={`${ids}-profile`} title="Hồ sơ" delay={0.04} className="max-sm:hidden">
        <AvatarField {...avatarProps} />
        {nameField(`${ids}-name`)}
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
          <Button className="press" disabled={!dirty} onClick={() => saveName()}>
            Lưu thay đổi
          </Button>
        </div>
      </Section>

      <Section id={`${ids}-journal`} title="Nhật ký" delay={0.08}>
        <div className="flex flex-col gap-3 max-sm:gap-1 max-sm:pt-3.5 max-sm:pb-1">
          <div className="flex flex-col gap-0.5 max-sm:px-4">
            <span id={`${ids}-set`} className="text-sm leading-[22px] font-semibold max-sm:text-[15px]">
              Bộ icon chấm điểm
            </span>
            <span className="text-[13px] leading-5 text-muted-foreground max-sm:text-xs max-sm:leading-[18px]">
              Đổi bộ icon chỉ thay hình. Điểm đã ghi giữ nguyên.
            </span>
          </div>
          {/* Điện thoại: các bộ xếp một hàng, vuốt ngang. */}
          <IconSetPicker
            labelledBy={`${ids}-set`}
            value={profile.iconSetId}
            onChange={(iconSetId) => save.mutate({ icon_set_id: iconSetId })}
            className="max-sm:flex max-sm:gap-3 max-sm:overflow-x-auto max-sm:px-4 max-sm:pt-3.5 max-sm:pb-2.5 max-sm:[scrollbar-width:none] max-sm:[&>button]:w-[176px] max-sm:[&>button]:flex-none"
          />
        </div>
        <CustomFlagColors />
        <div className="max-sm:px-4 max-sm:pt-3.5 max-sm:pb-4">
          <TimeZoneField
            value={timeZone}
            saved={initialTimeZone}
            onChange={(tz) => {
              setTimeZone(tz)
              save.mutate({ timezone: tz })
            }}
          />
        </div>
      </Section>

      <Section id={`${ids}-look`} title="Giao diện" delay={0.12}>
        <div className="flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch max-sm:gap-2.5 max-sm:px-4 max-sm:py-3.5">
          <span id={`${ids}-theme`} className="text-sm leading-[22px] font-semibold max-sm:text-[15px]">
            Chế độ màu
          </span>
          <div
            role="radiogroup"
            aria-labelledby={`${ids}-theme`}
            className="inline-flex gap-0.5 rounded-[14px] border-[1.5px] border-line bg-background p-[3px] max-sm:grid max-sm:grid-cols-3"
          >
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
                    'h-[38px] cursor-pointer rounded-[11px] px-3.5 text-sm transition-colors max-sm:h-10 max-sm:px-1 max-sm:text-[13px]',
                    focusRing,
                    on ? 'bg-foreground font-semibold text-background' : 'font-medium hover:bg-secondary',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 max-sm:min-h-14 max-sm:px-4 max-sm:py-2">
          <label htmlFor={`${ids}-lang`} className="text-sm leading-[22px] font-semibold max-sm:text-[15px]">
            Ngôn ngữ
          </label>
          <div className="flex items-center gap-2.5">
            {/* MVP chỉ có tiếng Việt: hiện ô chọn như thiết kế nhưng khóa. */}
            <select
              id={`${ids}-lang`}
              disabled
              aria-describedby={`${ids}-lang-soon`}
              className="h-11 cursor-not-allowed rounded-md border-[1.5px] border-dashed border-border bg-muted px-3 text-[15px] text-muted-foreground max-sm:h-10 max-sm:rounded-[10px] max-sm:px-2"
            >
              <option>Tiếng Việt</option>
            </select>
            <span id={`${ids}-lang-soon`} className="text-[13px] text-muted-foreground max-sm:text-xs">
              English · Sắp có
            </span>
          </div>
        </div>
      </Section>

      <Section id={`${ids}-share`} title="Chia sẻ" delay={0.16}>
        <Link to="/profile/shares" className={cn(phoneRow, 'sm:hidden')}>
          <Link2 className="size-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 font-semibold">Trang đang chia sẻ</span>
          {shareCount ? (
            <span className="min-w-6 rounded-full bg-foreground px-[7px] text-center text-xs leading-5 font-bold text-background tabular-nums">
              {shareCount}
            </span>
          ) : null}
          <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
        <div className="max-sm:hidden">
          {sharing ?? (
            <p className="flex items-start gap-3.5 text-[15px] leading-6">
              <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              Mọi trang đều riêng tư, chỉ mình bạn xem được.
            </p>
          )}
        </div>
      </Section>

      {onFeedback ? (
        <Section id={`${ids}-feedback`} title="Góp ý" delay={0.18}>
          <button type="button" className={cn(phoneRow, 'sm:hidden')} onClick={onFeedback}>
            <MessageSquare className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">Góp ý cho Jotly</span>
            <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
          <div className="max-sm:hidden">
            <Row title="Góp ý cho Jotly" hint="Báo lỗi hoặc đề xuất tính năng. Jotly trả lời qua email tài khoản của bạn.">
              <Button variant="secondary" size="sm" className="h-10 px-3.5" onClick={onFeedback}>
                <MessageSquare aria-hidden="true" /> Gửi góp ý
              </Button>
            </Row>
          </div>
        </Section>
      ) : null}

      <Section id={`${ids}-account`} title="Tài khoản" delay={0.2}>
        {/* Điện thoại: danh sách dòng bấm được (thiết kế B10). */}
        <div className={cn('flex flex-col sm:hidden', dashedBetween)}>
          <button
            type="button"
            className={phoneRow}
            disabled={logout.isPending}
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })}
          >
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">Đăng xuất</span>
            <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
          <button type="button" className={cn(phoneRow, 'text-destructive')} onClick={() => setDataOpen(true)}>
            <Eraser className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">Xóa toàn bộ dữ liệu</span>
          </button>
          <button type="button" className={cn(phoneRow, 'text-destructive')} onClick={() => setAccountOpen(true)}>
            <Trash2 className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">Xóa tài khoản</span>
          </button>
        </div>
        <div className="flex flex-col gap-[22px] max-sm:hidden">
          <Row title="Đăng xuất" hint="Nhật ký vẫn còn, đăng nhập lại bằng Google để xem.">
            <Button
              variant="secondary"
              size="sm"
              className="h-10 px-3.5"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })}
            >
              <LogOut aria-hidden="true" /> Đăng xuất
            </Button>
          </Row>
          <div className="flex flex-col gap-[22px] border-t-[1.5px] border-dashed border-border pt-[22px]">
            <p className="text-sm leading-[22px] text-muted-foreground">
              Jotly không có tính năng xuất dữ liệu. Hai thao tác dưới đây không thể hoàn tác.
            </p>
            <Row title="Xóa toàn bộ dữ liệu" hint="Xóa mọi trang, điểm và ảnh. Tài khoản vẫn giữ để bạn viết tiếp." danger>
              <Button variant="destructive" size="sm" className="h-10 px-3.5" onClick={() => setDataOpen(true)}>
                <Eraser aria-hidden="true" /> Xóa dữ liệu
              </Button>
            </Row>
            <Row title="Xóa tài khoản" hint="Xóa mọi trang, link chia sẻ và hồ sơ của bạn. Jotly không còn lưu gì về bạn." danger>
              <Button variant="destructive" size="sm" className="h-10 px-3.5" onClick={() => setAccountOpen(true)}>
                <Trash2 aria-hidden="true" /> Xóa tài khoản
              </Button>
            </Row>
          </div>
        </div>
      </Section>
      {wiped ? (
        <p role="status" className="-mt-3 inline-flex items-center gap-2 px-1 text-sm text-muted-foreground max-sm:-mt-2 max-sm:text-[13px]">
          <CircleCheck className="size-4" aria-hidden="true" /> Đã xóa toàn bộ dữ liệu. Trang Hôm nay đang chờ bạn.
          <span className="sr-only">Bản thử trên dữ liệu mẫu.</span>
        </p>
      ) : null}
      <p className="mx-1 -mt-1.5 text-xs leading-[18px] text-muted-foreground sm:hidden">
        Jotly không có tính năng xuất dữ liệu. Các thao tác xóa không thể hoàn tác.
      </p>

      <footer className="flex flex-wrap gap-5 px-1 text-sm text-muted-foreground max-sm:mt-2 max-sm:justify-center max-sm:gap-x-4 max-sm:gap-y-1.5 max-sm:text-xs">
        <a href="#" className="link-underline">
          [Điều khoản sử dụng]
        </a>
        <a href="#" className="link-underline">
          [Chính sách quyền riêng tư]
        </a>
        <span>Jotly · bản dev</span>
      </footer>

      {/* Chỉ mở từ thẻ hồ sơ trên điện thoại (thiết kế B10). */}
      <BottomSheet open={editOpen} onOpenChange={openEdit} title="Sửa hồ sơ">
        <AvatarField {...avatarProps} />
        {nameField(`${ids}-name-sheet`)}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="press h-[50px] rounded-[14px] text-[15px] font-medium" onClick={() => openEdit(false)}>
            Hủy
          </Button>
          <Button className="press h-[50px] rounded-[14px] text-[15px]" disabled={save.isPending} onClick={() => saveName(() => setEditOpen(false))}>
            Lưu
          </Button>
        </div>
      </BottomSheet>

      <DeleteDataDialog
        open={dataOpen}
        onOpenChange={setDataOpen}
        pageCount={pageCount}
        onConfirm={() => wipe.mutate(undefined, { onSuccess: () => setWiped(true) })}
      />
      <DeleteAccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        email={profile.email}
        pageCount={pageCount}
        shareCount={shareCount}
        onConfirm={() => wipe.mutate(undefined, { onSuccess: () => setAccountGone(true) })}
      />
      {/* Bản thử: "xóa" tài khoản = xóa dữ liệu mẫu rồi đăng xuất khi bấm Về trang chủ (API thật ở Bước 12). */}
      <AccountDeletedDialog
        open={accountGone}
        onHome={() => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })}
      />
    </div>
  )
}
