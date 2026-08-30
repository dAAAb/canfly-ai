import { useState, useRef, useEffect } from 'react'
import { SUPPORTED_LANGS, LANG_LABELS, type SupportedLang } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

export default function LanguageSwitcher() {
  const { currentLang, switchLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="flight-language">
      <button
        onClick={() => setOpen(!open)}
        className="flight-language__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {LANG_LABELS[currentLang]}
      </button>
      {open && (
        <div className="flight-language__menu" role="menu">
          {SUPPORTED_LANGS.map((lang: SupportedLang) => (
            <button
              key={lang}
              onClick={() => { switchLang(lang); setOpen(false) }}
              className={lang === currentLang ? 'is-active' : ''}
              role="menuitem"
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
