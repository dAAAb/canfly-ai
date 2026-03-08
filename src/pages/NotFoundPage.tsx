import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import Navbar from '../components/Navbar'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  return (
    <>
      <Navbar />
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-8xl mb-6">🦞</span>
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8 max-w-md">
          {t('errors.notFoundMessage')}
        </p>
        <Link
          to={localePath('/')}
          className="text-sm bg-green-600/20 border border-green-600 px-6 py-3 rounded-full hover:bg-green-600/30 transition-all text-green-400 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]"
        >
          {t('errors.backHome')}
        </Link>
      </div>
    </>
  )
}
