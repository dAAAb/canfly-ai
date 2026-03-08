import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { langFromPrefix, prefixForLang, loadLanguage, type SupportedLang } from '../i18n'

/** Syncs i18next language from the URL :lang param and provides helpers. */
export function useLanguage() {
  const { lang } = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const switchingRef = useRef(false)

  const currentLang = langFromPrefix(lang)

  useEffect(() => {
    // Skip sync-back when switchLang is actively navigating
    if (switchingRef.current) {
      switchingRef.current = false
      return
    }
    if (i18n.language !== currentLang) {
      // Load translations first, then switch language
      loadLanguage(currentLang).then(() => {
        i18n.changeLanguage(currentLang)
      })
    }
  }, [currentLang, i18n])

  /** Build a path with the current language prefix. */
  function localePath(path: string): string {
    const prefix = prefixForLang(currentLang)
    if (path === '/') return prefix || '/'
    return `${prefix}${path}`
  }

  /** Switch to a different language, preserving current page path. */
  async function switchLang(newLang: SupportedLang) {
    switchingRef.current = true

    const prefix = prefixForLang(currentLang)
    let path = location.pathname
    if (prefix && path.startsWith(prefix)) {
      path = path.slice(prefix.length) || '/'
    }
    const newPrefix = prefixForLang(newLang)

    // Pre-load the language bundle BEFORE switching so React renders
    // with translations already available (no flash of English).
    await loadLanguage(newLang)

    navigate(`${newPrefix}${path === '/' ? '' : path}` || '/')
    i18n.changeLanguage(newLang)
  }

  return { currentLang, localePath, switchLang }
}
