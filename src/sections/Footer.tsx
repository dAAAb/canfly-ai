import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-white/5" style={{ padding: '3rem 8%' }}>
      <div style={{ maxWidth: '1024px', marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', opacity: 0.4 }}>
          {t('footer.copyright')}
        </span>
        <span style={{ fontSize: '14px', opacity: 0.4 }}>
          {t('footer.tagline')} 🦞
        </span>
      </div>
    </footer>
  )
}
