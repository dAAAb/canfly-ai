import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { langFromPrefix, prefixForLang, type SupportedLang } from '../i18n'

/** Syncs i18next language from the URL :lang param and provides helpers. */
export function useLanguage() {
  const { lang } = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const currentLang = langFromPrefix(lang)

  useEffect(() => {
    if (i18n.language !== currentLang) {
      i18n.changeLanguage(currentLang)
    }
  }, [currentLang, i18n])

  /** Build a path with the current language prefix. */
  function localePath(path: string): string {
    const prefix = prefixForLang(currentLang)
    if (path === '/') return prefix || '/'
    return `${prefix}${path}`
  }

  /** Switch to a different language, preserving current page path. */
  function switchLang(newLang: SupportedLang) {
    // Change i18n language first so useTranslation() re-renders with new translations
    i18n.changeLanguage(newLang)

    const prefix = prefixForLang(currentLang)
    let path = location.pathname
    if (prefix && path.startsWith(prefix)) {
      path = path.slice(prefix.length) || '/'
    }
    const newPrefix = prefixForLang(newLang)
    navigate(`${newPrefix}${path === '/' ? '' : path}` || '/')
  }

  return { currentLang, localePath, switchLang }
}
