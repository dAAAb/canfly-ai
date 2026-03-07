import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zhTW from './zh-TW.json'
import zhCN from './zh-CN.json'

export const SUPPORTED_LANGS = ['en', 'zh-TW', 'zh-CN'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'EN',
  'zh-TW': '繁',
  'zh-CN': '简',
}

// URL prefix uses lowercase (zh-tw), i18next uses canonical (zh-TW)
const URL_TO_LANG: Record<string, SupportedLang> = {
  'zh-tw': 'zh-TW',
  'zh-cn': 'zh-CN',
}

const LANG_TO_URL: Record<SupportedLang, string> = {
  en: '',
  'zh-TW': '/zh-tw',
  'zh-CN': '/zh-cn',
}

/** Map URL prefix to i18next language code. */
export function langFromPrefix(prefix: string | undefined): SupportedLang {
  if (prefix) return URL_TO_LANG[prefix] || 'en'
  return 'en'
}

/** Get URL prefix for a language. English returns empty string. */
export function prefixForLang(lang: SupportedLang): string {
  return LANG_TO_URL[lang] || ''
}

/** Detect initial language from current URL path */
function detectLangFromUrl(): SupportedLang {
  const path = window.location.pathname
  if (path.startsWith('/zh-tw')) return 'zh-TW'
  if (path.startsWith('/zh-cn')) return 'zh-CN'
  return 'en'
}

const detectedLang = detectLangFromUrl()

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
  },
  lng: detectedLang,
  fallbackLng: 'en',
  load: 'currentOnly',
  supportedLngs: ['en', 'zh-TW', 'zh-CN'],
  interpolation: { escapeValue: false },
  initImmediate: false,
  react: { useSuspense: false },
})

export default i18n
