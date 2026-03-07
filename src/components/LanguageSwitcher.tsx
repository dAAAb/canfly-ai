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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-500"
      >
        {LANG_LABELS[currentLang]}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl z-50 min-w-[80px]">
          {SUPPORTED_LANGS.map((lang: SupportedLang) => (
            <button
              key={lang}
              onClick={() => { switchLang(lang); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                lang === currentLang
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
