import { LANGS, useLanguage, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Nút chọn ngôn ngữ VI / EN: lưu trong trình duyệt (ADR 0006). Dùng ở trang chủ và đăng nhập, nơi chưa có Hồ sơ. */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useT()
  const [lang, setLang] = useLanguage()
  const item =
    'inline-flex h-full min-w-[34px] items-center justify-center rounded-[7px] px-1.5 text-label focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'
  return (
    <div role="group" aria-label={t('common:language.label')} className={cn('inline-flex h-9 gap-0.5 rounded-[10px] border-2 border-stroke p-[3px]', className)}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          aria-label={t(`common:language.${code}`)}
          onClick={() => void setLang(code)}
          className={cn(item, lang === code ? 'bg-primary text-on-primary' : 'text-ink-soft hover:text-ink')}
        >
          {t(`common:language.${code}Short`)}
        </button>
      ))}
    </div>
  )
}
