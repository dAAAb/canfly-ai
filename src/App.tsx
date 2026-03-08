import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMemo, useEffect, lazy, Suspense } from 'react'
import Footer from './sections/Footer'
import { langFromPrefix } from './i18n'

const HomePage = lazy(() => import('./pages/HomePage'))
const AppsPage = lazy(() => import('./pages/AppsPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const TutorialPage = lazy(() => import('./pages/TutorialPage'))

/** Wrapper that syncs i18next language from URL :lang param.
 *  Uses useMemo (not useEffect) so language is set before children render. */
function LangSync({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()
  const resolved = langFromPrefix(lang)

  useMemo(() => {
    if (i18n.language !== resolved) {
      i18n.changeLanguage(resolved)
    }
  }, [resolved]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update HTML lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = resolved
  }, [resolved])

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <div className="bg-black text-white min-h-screen">
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            {/* Default (English) — no prefix */}
            <Route path="/" element={<HomePage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/apps/:slug" element={<ProductPage />} />
            <Route path="/learn/:slug" element={<TutorialPage />} />

            {/* Language-prefixed routes */}
            <Route path="/:lang" element={<LangSync><HomePage /></LangSync>} />
            <Route path="/:lang/apps" element={<LangSync><AppsPage /></LangSync>} />
            <Route path="/:lang/apps/:slug" element={<LangSync><ProductPage /></LangSync>} />
            <Route path="/:lang/learn/:slug" element={<LangSync><TutorialPage /></LangSync>} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
    </Router>
  )
}

export default App
