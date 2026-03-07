import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zhTW from './zh-tw.json'
import zhCN from './zh-cn.json'

export const SUPPORTED_LANGS = ['en', 'zh-tw', 'zh-cn'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'EN',
  'zh-tw': '繁',
  'zh-cn': '简',
}

/** Map URL prefix to i18next language code. */
export function langFromPrefix(prefix: string | undefined): SupportedLang {
  if (prefix === 'zh-tw' || prefix === 'zh-cn') return prefix
  return 'en'
}

/** Get URL prefix for a language. English returns empty string. */
export function prefixForLang(lang: SupportedLang): string {
  return lang === 'en' ? '' : `/${lang}`
}

/** Detect initial language from current URL path */
function detectLangFromUrl(): SupportedLang {
  const path = window.location.pathname
  if (path.startsWith('/zh-tw')) return 'zh-tw'
  if (path.startsWith('/zh-cn')) return 'zh-cn'
  return 'en'
}

const detectedLang = detectLangFromUrl()
console.log('[i18n] detected language from URL:', detectedLang, 'path:', window.location.pathname)

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-tw': { translation: zhTW },
    'zh-cn': { translation: zhCN },
  },
  lng: detectedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // Synchronous init — resources are bundled, no need for async loading.
  initImmediate: false,
  react: {
    useSuspense: false,
  },
})

console.log('[i18n] after init, language:', i18n.language, 'test t:', i18n.t('hero.subtitle'))

export default i18n
