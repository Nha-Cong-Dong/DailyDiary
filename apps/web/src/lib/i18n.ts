import i18next from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { vi } from '@/locales/vi'

/**
 * Đa ngôn ngữ (ADR 0006). Tiếng Việt là nguồn chuẩn và luôn nằm trong bản build; tiếng Anh tải riêng khi cần.
 * Lựa chọn lưu ở localStorage của trình duyệt (không lưu ở máy chủ). Thiếu khóa tiếng Anh thì hiện tiếng Việt.
 */
export const LANGS = ['vi', 'en'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = 'vi'
export const DEFAULT_NS = 'common'

const STORAGE_KEY = 'jotly.lang'

function isLang(value: unknown): value is Lang {
  return LANGS.includes(value as Lang)
}

export function storedLang(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLang(value) ? value : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

/** Ngôn ngữ đang dùng; chưa khởi tạo hoặc lạ thì coi là tiếng Việt. */
export function currentLang(): Lang {
  return isLang(i18next.language) ? i18next.language : DEFAULT_LANG
}

/** Mã locale cho `Intl` và `toLocale*`. */
export function intlLocale(lang: Lang = currentLang()): string {
  return lang === 'en' ? 'en-US' : 'vi-VN'
}

async function ensureLoaded(lang: Lang): Promise<void> {
  if (lang === DEFAULT_LANG || i18next.hasResourceBundle(lang, DEFAULT_NS)) return
  const { en } = await import('@/locales/en')
  for (const [ns, data] of Object.entries(en)) i18next.addResourceBundle(lang, ns, data, true, true)
}

/** Đổi ngôn ngữ giao diện và nhớ lựa chọn. */
export async function setLanguage(lang: Lang): Promise<void> {
  await ensureLoaded(lang)
  await i18next.changeLanguage(lang)
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Chặn bộ nhớ (cửa sổ riêng tư): vẫn đổi được trong phiên này.
  }
}

i18next.on('languageChanged', (lang) => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  document.title = i18next.t('common:meta.title')
})

/** Khởi tạo một lần. Tiếng Việt có sẵn nên xong ngay; chỉ chờ khi lần trước người dùng chọn English. */
export const i18nReady: Promise<void> = (async () => {
  await i18next.use(initReactI18next).init({
    resources: { vi },
    lng: DEFAULT_LANG,
    fallbackLng: DEFAULT_LANG,
    supportedLngs: [...LANGS],
    defaultNS: DEFAULT_NS,
    ns: Object.keys(vi),
    interpolation: { escapeValue: false }, // React đã tự escape
    initAsync: false,
  })
  const lang = storedLang()
  if (lang !== DEFAULT_LANG) await setLanguage(lang)
})()

/** Hàm dịch cho code ngoài component (lib/, hàm thuần). Trong component dùng `useTranslation`. */
export const t: typeof i18next.t = i18next.t.bind(i18next)

/**
 * Hàm dịch dùng trong component: `const t = useT()`. Chính là `t` ở trên (kiểu khóa có nhóm, kèm biến và số nhiều chạy đúng;
 * `t` của `useTranslation()` thì không), thêm việc đăng ký để component vẽ lại khi đổi ngôn ngữ.
 */
export function useT(): typeof t {
  useTranslation()
  return t
}

/** [ngôn ngữ hiện tại, hàm đổi]; component tự vẽ lại khi đổi. */
export function useLanguage(): [Lang, (lang: Lang) => Promise<void>] {
  const { i18n } = useTranslation()
  return [isLang(i18n.language) ? i18n.language : DEFAULT_LANG, setLanguage]
}
