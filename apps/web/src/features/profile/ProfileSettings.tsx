import { ApiError, googleLoginUrl } from '@/api/client'
import { ArchiveRestore, ChevronRight, CircleCheck, Eraser, Link2, Lock, LogOut, Mail, MessageSquare, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { BottomSheet } from '@/components/diary/BottomSheet'
import { Avatar } from '@/components/layout/Avatar'
import { ThemePicker } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LANGS, type Lang, useLanguage, useT } from '@/lib/i18n'
import { tierLimits } from '@/lib/limits'
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/lib/profile'
import { SIGNED_OUT, useLogout } from '@/lib/session'
import { cn } from '@/lib/utils'
import { AvatarField } from './components/AvatarField'
import { AccountDeletedDialog, DeleteAccountDialog, DeleteDataDialog } from './components/DeleteAccountDialog'
import { IconSetPicker } from './components/IconSetPicker'
import { StorageUsage } from './components/StorageUsage'
import { CustomFlagColors } from './components/CustomFlagColors'
import { TimeZoneField } from './components/TimeZoneField'
import { useDataSummary, useDeleteAccount, useWipeJournal } from './useJournalData'

// Dòng bấm được trong thẻ trên điện thoại (B10 .j-row): cao 56 px, đổi nền khi chạm, viền focus thụt vào trong.
const phoneRow =
  'row-press flex min-h-14 w-full cursor-pointer select-none items-center gap-3 px-4 text-left text-body focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60'
// Nét đứt giữa các khối trong cùng một thẻ.
const dashedBetween = '[&>*+*]:border-t-[1.5px] [&>*+*]:border-dashed [&>*+*]:border-line-soft'
// Nhãn và gợi ý của một trường trong thẻ.
const fieldLabel = 'text-sm leading-[22px] font-semibold'
const fieldHint = 'text-label font-normal leading-5 text-ink-soft'

/**
 * Một mục cài đặt. Máy tính (B7): thẻ lớn bóng 4 px, tiêu đề trong thẻ. Điện thoại (B10): nhãn nhỏ phía trên, nội dung
 * trong thẻ gọn bóng 2 px, các khối cách nhau bằng nét đứt.
 */
function Section({ id, title, delay, className, children }: { id: string; title: string; delay: number; className?: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex animate-rise flex-col gap-2 sm:gap-[22px] sm:rounded-lg sm:edge sm:bg-card sm:p-[clamp(20px,4vw,32px)] sm:shadow-md',
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <h2
        id={id}
        className="mx-1 text-label leading-5 tracking-[.02em] text-ink-soft sm:mx-0 sm:text-xl sm:leading-7 sm:font-semibold sm:tracking-normal sm:text-ink"
      >
        {title}
      </h2>
      <div
        className={cn(
          'flex flex-col sm:gap-[22px]',
          'max-sm:overflow-hidden max-sm:rounded-[18px] max-sm:edge max-sm:bg-card max-sm:shadow-sm',
          'max-sm:[&>*+*]:border-t-[1.5px] max-sm:[&>*+*]:border-dashed max-sm:[&>*+*]:border-line-soft',
        )}
      >
        {children}
      </div>
    </section>
  )
}

/** Hàng "tiêu đề + mô tả | nút" của máy tính (Góp ý, Tài khoản). */
function Row({ title, hint, children, danger }: { title: string; hint: string; children: ReactNode; danger?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
        <span className={cn('text-body font-semibold', danger && 'text-danger')}>{title}</span>
        <span className="text-sm leading-[22px] text-ink-soft">{hint}</span>
      </div>
      {children}
    </div>
  )
}

/**
 * Trang Hồ sơ & cài đặt (thiết kế B7, bản điện thoại B10). Tên, bộ icon, múi giờ, gỡ ảnh lưu qua PATCH /me.
 * Ảnh đại diện tải lên kho ảnh. Mục Tài khoản theo canvas (quyết định 21/10/2026): không có xuất dữ liệu;
 * "Xóa toàn bộ dữ liệu" gõ "XÓA"; "Xóa tài khoản" gõ đúng email. English vẫn khóa.
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
  const ids = useId()
  const t = useT()
  const [lang, setLang] = useLanguage()
  const [name, setName] = useState(profile.displayName)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState(profile.timeZone)
  // Múi giờ lúc mở trang: đổi khác đi thì nhắc "chỉ áp dụng từ ngày đang viết".
  const [initialTimeZone] = useState(() => profile.timeZone)
  const { data: summary } = useDataSummary()
  const deleteAccount = useDeleteAccount()
  // Phiên đăng nhập đã quá 10 phút: máy chủ đòi đăng nhập lại trước khi xóa tài khoản (403 REAUTH_REQUIRED).
  const needsReauth = deleteAccount.error instanceof ApiError && deleteAccount.error.code === 'REAUTH_REQUIRED'
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
    if (!trimmed) return setNameError(t('profile:name.empty'))
    if (trimmed.length > maxName) return setNameError(t('profile:name.tooLong', { max: maxName }))
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
        onError: () => setNameError(t('profile:name.saveError')),
      },
    )
  }

  function signOut() {
    logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true, state: SIGNED_OUT }) })
  }

  const avatarProps = {
    name: name || profile.displayName,
    src: avatarSrc,
    busy: avatar.isPending,
    uploadError: avatar.isError ? t('profile:avatar.uploadError') : null,
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
      <label htmlFor={inputId} className={cn(fieldLabel, 'max-sm:leading-5')}>
        {t('profile:name.label')}
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
        className="bg-paper"
      />
      <span id={`${inputId}-hint`} className={nameError ? 'text-label leading-5 font-medium text-danger' : fieldHint}>
        {nameError ?? t('profile:name.hint')}
      </span>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6 max-sm:gap-5">
      <h1 className="animate-rise text-title font-bold max-sm:text-[22px] max-sm:leading-[30px]">{t('profile:settings.title')}</h1>

      {/* Điện thoại: thẻ hồ sơ gọn, bấm Sửa để mở bảng trượt. */}
      <div className="-mb-2 flex flex-col gap-3 sm:hidden">
        <div className="flex animate-rise items-center gap-3.5 rounded-[18px] edge bg-card p-4 shadow-sm">
          <Avatar name={profile.displayName} src={avatarSrc} size={60} className="font-bold" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-lg leading-6 font-semibold">{profile.displayName}</span>
            <span className="truncate text-label leading-5 font-normal text-ink-soft">{profile.email}</span>
          </span>
          <Button variant="outline" className="h-10 rounded-[12px] px-3.5" aria-haspopup="dialog" onClick={() => openEdit(true)}>
            {t('profile:settings.edit')}
          </Button>
        </div>
        {saved && !editOpen ? (
          <p role="status" className="mx-1 animate-fade text-label leading-5 font-normal text-ink-soft">
            {t('profile:settings.nameSaved')}
          </p>
        ) : null}
      </div>

      <Section id={`${ids}-profile`} title={t('profile:settings.profileSection')} delay={0.04} className="max-sm:hidden">
        <AvatarField {...avatarProps} />
        {nameField(`${ids}-name`)}
        <div className="flex flex-col gap-2">
          <span id={`${ids}-mail`} className={fieldLabel}>
            {t('profile:settings.email')}
          </span>
          <div
            aria-labelledby={`${ids}-mail`}
            className="flex h-12 items-center gap-2.5 rounded-md border-[1.5px] border-dashed border-line-soft bg-sunk px-3.5 text-body text-ink-soft"
          >
            <Mail className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{profile.email}</span>
            <Lock className="size-4 shrink-0" aria-hidden="true" />
          </div>
          <span className={fieldHint}>{t('profile:settings.emailHint')}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t-[1.5px] border-dashed border-line-soft pt-[18px]">
          <span role="status" className="inline-flex items-center gap-1.5 text-label leading-5 font-normal text-ink-soft">
            {dirty ? (
              t('profile:settings.unsaved')
            ) : saved ? (
              <span className="inline-flex animate-fade items-center gap-1.5">
                <CircleCheck className="size-4 text-sage-ink" aria-hidden="true" /> {t('profile:settings.saved')}
              </span>
            ) : null}
          </span>
          <Button disabled={!dirty || save.isPending} onClick={() => saveName()}>
            {save.isPending && dirty ? t('profile:settings.saving') : t('profile:settings.saveChanges')}
          </Button>
        </div>
      </Section>

      <Section id={`${ids}-journal`} title={t('profile:settings.journalSection')} delay={0.08}>
        <div className="flex flex-col gap-3 max-sm:gap-1 max-sm:pt-3.5 max-sm:pb-1">
          <div className="flex flex-col gap-0.5 max-sm:px-4">
            <span id={`${ids}-set`} className={cn(fieldLabel, 'max-sm:text-body max-sm:leading-[22px]')}>
              {t('profile:settings.iconSetTitle')}
            </span>
            <span className={cn(fieldHint, 'max-sm:leading-[18px]')}>{t('profile:settings.iconSetHint')}</span>
          </div>
          {/* Điện thoại: các bộ xếp một hàng, vuốt ngang (B10 .j-hs .j-sets). */}
          <IconSetPicker
            labelledBy={`${ids}-set`}
            value={profile.iconSetId}
            onChange={(iconSetId) => save.mutate({ icon_set_id: iconSetId })}
            className="sm:pt-1.5 max-sm:flex max-sm:gap-3 max-sm:overflow-x-auto max-sm:scroll-quiet max-sm:px-4 max-sm:pt-3.5 max-sm:pb-2.5 max-sm:[&>button]:w-[176px] max-sm:[&>button]:flex-none"
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
        <StorageUsage />
      </Section>

      <Section id={`${ids}-look`} title={t('profile:settings.lookSection')} delay={0.12}>
        <div className="flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch max-sm:gap-2.5 max-sm:px-4 max-sm:py-3.5">
          <span id={`${ids}-theme`} className={cn(fieldLabel, 'max-sm:text-body max-sm:leading-[22px]')}>
            {t('profile:settings.colorMode')}
          </span>
          {/* Sáng / Tối / Hệ thống / Theo giờ (B11-Theme), kèm chú thích cho Hệ thống và Theo giờ. */}
          <ThemePicker labelledBy={`${ids}-theme`} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 max-sm:min-h-14 max-sm:px-4 max-sm:py-2">
          <label htmlFor={`${ids}-lang`} className={cn(fieldLabel, 'max-sm:text-body max-sm:leading-[22px]')}>
            {t('common:language.label')}
          </label>
          <select
            id={`${ids}-lang`}
            value={lang}
            onChange={(e) => void setLang(e.target.value as Lang)}
            className="h-11 rounded-md border-[1.5px] border-line-soft bg-card px-3 text-body text-ink max-sm:h-10 max-sm:rounded-[10px] max-sm:px-2"
          >
            {LANGS.map((code) => (
              <option key={code} value={code} lang={code}>
                {t(`common:language.${code}`)}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section id={`${ids}-share`} title={t('profile:settings.shareSection')} delay={0.16}>
        <Link to="/profile/shares" className={cn(phoneRow, 'sm:hidden')}>
          <Link2 className="size-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 font-semibold">{t('profile:settings.sharedPages')}</span>
          {shareCount ? (
            <span className="min-w-6 rounded-full bg-ink px-[7px] text-center text-label leading-5 font-bold text-paper nums">
              {shareCount}
            </span>
          ) : null}
          <ChevronRight className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" />
        </Link>
        <div className="max-sm:hidden">
          {sharing ?? (
            <p className="flex items-start gap-3.5 text-body">
              <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {t('profile:settings.allPrivate')}
            </p>
          )}
        </div>
      </Section>

      {onFeedback ? (
        <Section id={`${ids}-feedback`} title={t('profile:settings.feedbackSection')} delay={0.18}>
          <button type="button" className={cn(phoneRow, 'sm:hidden')} onClick={onFeedback}>
            <MessageSquare className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">{t('profile:settings.feedbackTitle')}</span>
            <ChevronRight className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" />
          </button>
          <div className="max-sm:hidden">
            <Row title={t('profile:settings.feedbackTitle')} hint={t('profile:settings.feedbackHint')}>
              <Button variant="secondary" size="sm" className="h-10" onClick={onFeedback}>
                <MessageSquare aria-hidden="true" /> {t('profile:settings.feedbackSend')}
              </Button>
            </Row>
          </div>
        </Section>
      ) : null}

      <Section id={`${ids}-account`} title={t('profile:settings.accountSection')} delay={0.2}>
        {/* Điện thoại: danh sách dòng bấm được (thiết kế B10). */}
        <div className={cn('flex flex-col sm:hidden', dashedBetween)}>
          <button type="button" className={phoneRow} disabled={logout.isPending} onClick={signOut}>
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">{t('profile:settings.signOut')}</span>
            <ChevronRight className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" />
          </button>
          <Link to="/profile/trash" className={phoneRow}>
            <ArchiveRestore className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">{t('profile:settings.trash')}</span>
            {summary?.trash ? <span className="text-sm leading-5 text-ink-soft nums">{t('profile:settings.trashPages', { count: summary.trash })}</span> : null}
            <ChevronRight className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" />
          </Link>
          <button type="button" className={cn(phoneRow, 'text-danger')} onClick={() => setDataOpen(true)}>
            <Eraser className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">{t('profile:settings.wipeTitle')}</span>
          </button>
          <button type="button" className={cn(phoneRow, 'text-danger')} onClick={() => setAccountOpen(true)}>
            <Trash2 className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">{t('profile:settings.deleteAccountTitle')}</span>
          </button>
        </div>
        <div className="flex flex-col gap-[22px] max-sm:hidden">
          <Row title={t('profile:settings.signOut')} hint={t('profile:settings.signOutHint')}>
            <Button variant="secondary" size="sm" className="h-10" disabled={logout.isPending} onClick={signOut}>
              <LogOut aria-hidden="true" /> {t('profile:settings.signOut')}
            </Button>
          </Row>
          <Row
            title={t('profile:settings.trash')}
            hint={`${t('profile:settings.trashHint', { days: tierLimits().entry.restore_days })}${summary?.trash ? t('profile:settings.trashHintCount', { count: summary.trash }) : ''}`}
          >
            <Button asChild variant="secondary" size="sm" className="h-10">
              <Link to="/profile/trash">
                <ArchiveRestore aria-hidden="true" /> {t('profile:settings.openTrash')}
              </Link>
            </Button>
          </Row>
          <div className="flex flex-col gap-[22px] border-t-[1.5px] border-dashed border-line-soft pt-[22px]">
            <p className="text-sm leading-[22px] text-ink-soft">
              {t('profile:settings.noExport')}
            </p>
            <Row title={t('profile:settings.wipeTitle')} hint={t('profile:settings.wipeHint')} danger>
              <Button variant="destructive-solid" size="sm" className="h-10" onClick={() => setDataOpen(true)}>
                <Eraser aria-hidden="true" /> {t('profile:settings.wipeButton')}
              </Button>
            </Row>
            <Row title={t('profile:settings.deleteAccountTitle')} hint={t('profile:settings.deleteAccountHint')} danger>
              <Button variant="destructive-solid" size="sm" className="h-10" onClick={() => setAccountOpen(true)}>
                <Trash2 aria-hidden="true" /> {t('profile:settings.deleteAccountTitle')}
              </Button>
            </Row>
          </div>
        </div>
      </Section>
      {wiped ? (
        <p
          role="status"
          className="-mt-3 inline-flex animate-fade items-center gap-2 px-1 text-sm leading-[22px] text-ink-soft max-sm:-mt-2 max-sm:text-label max-sm:leading-5 max-sm:font-normal"
        >
          <CircleCheck className="size-4 shrink-0 text-sage-ink" aria-hidden="true" /> {t('profile:settings.wiped')}
        </p>
      ) : null}
      {needsReauth ? (
        <div role="alert" className="-mt-3 flex flex-wrap items-center gap-3 rounded-md edge bg-card px-4 py-3 shadow-sm max-sm:-mt-2">
          <p className="min-w-0 flex-1 text-sm leading-[22px]">
            {t('profile:settings.reauth')}
          </p>
          <Button asChild variant="secondary" size="sm" className="h-10">
            <a href={googleLoginUrl(profile.timeZone, '/profile')}>{t('profile:settings.reauthButton')}</a>
          </Button>
        </div>
      ) : wipe.isError || deleteAccount.isError ? (
        <p role="alert" className="-mt-3 px-1 text-sm leading-[22px] font-medium text-danger max-sm:-mt-2 max-sm:text-label max-sm:leading-5">
          {wipe.isError ? t('profile:settings.wipeFailed') : t('profile:settings.deleteFailed')} {t('profile:settings.retryNote')}
        </p>
      ) : null}
      <p className="mx-1 -mt-1.5 text-label leading-[18px] font-normal text-ink-soft sm:hidden">
        {t('profile:settings.noExportMobile')}
      </p>

      <footer className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm leading-[22px] text-ink-soft max-sm:mt-2 max-sm:justify-center max-sm:gap-x-4 max-sm:gap-y-1.5 max-sm:text-label max-sm:leading-[18px] max-sm:font-normal">
        <a href="#" className="link-underline">
          {t('profile:settings.terms')}
        </a>
        <Link to="/privacy" className="link-underline">
          {t('profile:settings.privacy')}
        </Link>
        <span>{t('profile:settings.devBuild')}</span>
      </footer>

      {/* Chỉ mở từ thẻ hồ sơ trên điện thoại (thiết kế B10). */}
      <BottomSheet open={editOpen} onOpenChange={openEdit} title={t('profile:settings.editSheet')}>
        <AvatarField {...avatarProps} />
        {nameField(`${ids}-name-sheet`)}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="h-[50px]" onClick={() => openEdit(false)}>
            {t('profile:settings.cancel')}
          </Button>
          <Button className="h-[50px]" disabled={save.isPending} onClick={() => saveName(() => setEditOpen(false))}>
            {t('profile:settings.save')}
          </Button>
        </div>
      </BottomSheet>

      <DeleteDataDialog
        open={dataOpen}
        onOpenChange={setDataOpen}
        pageCount={summary?.pages}
        photoCount={summary?.photos}
        onConfirm={() => wipe.mutate(undefined, { onSuccess: () => setWiped(true) })}
      />
      <DeleteAccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        email={profile.email}
        pageCount={summary?.pages}
        photoCount={summary?.photos}
        shareCount={summary?.share_links ?? shareCount}
        onConfirm={() => deleteAccount.mutate(undefined, { onSuccess: () => setAccountGone(true) })}
      />
      <AccountDeletedDialog
        open={accountGone}
        // Máy chủ đã xóa phiên và cookie; trang chủ bỏ nốt dữ liệu trong bộ nhớ (cờ SIGNED_OUT).
        onHome={() => navigate('/', { replace: true, state: SIGNED_OUT })}
      />
    </div>
  )
}
