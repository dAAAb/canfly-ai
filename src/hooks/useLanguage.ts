import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { langFromPrefix, prefixForLang, loadLanguage, detectLanguageAuto, type SupportedLang } from '../i18n'

/** Syncs i18next language from the URL :lang param and provides helpers. */
export function useLanguage() {
  const { lang } = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const switchingRef = useRef(false)

  // If no lang param in URL, use cookie/browser detection
  const currentLang = lang ? langFromPrefix(lang) : detectLanguageAuto()
  const hasLangPrefix = !!lang

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
    // No lang prefix for community pages
    if (!hasLangPrefix) return path
    const prefix = prefixForLang(currentLang)
    if (path === '/') return prefix || '/'
    return `${prefix}${path}`
  }

  /** Switch to a different language, preserving current page path. */
  async function switchLang(newLang: SupportedLang) {
    switchingRef.current = true

    // Remember manual choice in cookie
    document.cookie = `canfly_lang=${newLang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`

    // Pre-load the language bundle BEFORE switching so React renders
    // with translations already available (no flash of English).
    await loadLanguage(newLang)

    if (!hasLangPrefix) {
      // Community pages: no URL change, just switch i18n + update html lang
      i18n.changeLanguage(newLang)
      document.documentElement.lang = newLang
      return
    }

    // Lang-prefixed pages: navigate to new prefix
    const prefix = prefixForLang(currentLang)
    let path = location.pathname
    if (prefix && path.startsWith(prefix)) {
      path = path.slice(prefix.length) || '/'
    }
    const newPrefix = prefixForLang(newLang)

    navigate(`${newPrefix}${path === '/' ? '' : path}` || '/')
    i18n.changeLanguage(newLang)
  }

  return { currentLang, localePath, switchLang }
}

/** Hook for pages that need to read language from ?lang= query param */
export function useQueryLang() {
  const { i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const switchingRef = useRef(false)

  // Get language from query param, normalize case
  const queryLang = searchParams.get('lang')
  const normalizedLang = queryLang ? 
    queryLang.toLowerCase() === 'zh-tw' ? 'zh-TW' :
    queryLang.toLowerCase() === 'zh-cn' ? 'zh-CN' :
    queryLang.toLowerCase() === 'en' ? 'en' : null
    : null

  // Current language: use query param if valid, otherwise detect auto
  const currentLang = normalizedLang || detectLanguageAuto()

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
        document.documentElement.lang = currentLang
      })
    }
  }, [currentLang, i18n])

  /** Switch to a different language, updating the ?lang= query param */
  async function switchLang(newLang: SupportedLang) {
    switchingRef.current = true

    // Remember manual choice in cookie
    document.cookie = `canfly_lang=${newLang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`

    // Pre-load the language bundle BEFORE switching so React renders
    // with translations already available (no flash of English).
    await loadLanguage(newLang)

    // Update query param
    if (newLang === 'en') {
      // Remove lang param for English (default)
      searchParams.delete('lang')
    } else {
      searchParams.set('lang', newLang)
    }
    setSearchParams(searchParams, { replace: true })

    i18n.changeLanguage(newLang)
    document.documentElement.lang = newLang
  }

  return { currentLang, switchLang }
}
