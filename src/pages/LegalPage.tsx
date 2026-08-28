import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useHead } from '../hooks/useHead'
import { useLanguage } from '../hooks/useLanguage'

export type LegalSlug = 'about' | 'contact' | 'privacy' | 'developers'

const LINKS = [
  { href: 'https://canfly.ai/llms.txt', label: 'llms.txt' },
  { href: 'https://canfly.ai/api/openapi.json', label: 'OpenAPI 3.1' },
  { href: 'https://canfly.ai/mcp', label: 'MCP' },
  { href: 'https://canfly.ai/.well-known/mcp.json', label: 'MCP manifest' },
  { href: 'https://canfly.ai/api', label: 'API discovery' },
]

export default function LegalPage({ page }: { page: LegalSlug }) {
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  useHead({
    title: t(`meta.${page}.title`),
    description: t(`meta.${page}.description`),
    canonical: `https://canfly.ai${localePath(`/${page}`)}`,
    ogType: 'website',
  })

  const paragraphs = [1, 2, 3, 4, 5].map((index) => t(`legal.${page}.p${index}`))

  return (
    <div className="page-enter">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-28 pb-20">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-blue-400">
          CanFly.ai
        </p>
        <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
          {t(`legal.${page}.heading`)}
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-gray-300">
          {t(`legal.${page}.lead`)}
        </p>
        <div className="space-y-5 text-base leading-relaxed text-gray-400">
          {paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        {page === 'developers' && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-white">
              {t('legal.resourcesTitle')}
            </h2>
            <ul className="space-y-2 text-sm">
              {LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-blue-400 underline decoration-blue-400/30 underline-offset-4 hover:text-blue-300"
                  >
                    {item.label}
                  </a>
                  <span className="ml-2 text-gray-600">{item.href}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {page === 'contact' && (
          <p className="mt-10 text-gray-300">
            <a
              href="mailto:juchunko@gmail.com"
              className="text-blue-400 underline decoration-blue-400/30 underline-offset-4"
            >
              juchunko@gmail.com
            </a>
          </p>
        )}
        <p className="mt-12 text-sm text-gray-600">
          <Link to={localePath('/')} className="hover:text-white">
            {t('errors.backHome')}
          </Link>
        </p>
      </main>
    </div>
  )
}
