import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState, lazy, Suspense } from 'react'
import Footer from './sections/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import { langFromPrefix, loadLanguage } from './i18n'

const HomePage = lazy(() => import('./pages/HomePage'))
const AppsPage = lazy(() => import('./pages/AppsPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const TutorialPage = lazy(() => import('./pages/TutorialPage'))
const HardwareComparePage = lazy(() => import('./pages/HardwareComparePage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const GetStartedPage = lazy(() => import('./pages/GetStartedPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const BlogListPage = lazy(() => import('./pages/BlogListPage'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const SubscribeConfirmedPage = lazy(() => import('./pages/SubscribeConfirmedPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

/** Wrapper that syncs i18next language from URL :lang param.
 *  Loads translation bundle first, then switches language so React
 *  renders with translations already available (no flash of English). */
function LangSync({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()
  const resolved = langFromPrefix(lang)
  const [ready, setReady] = useState(i18n.language === resolved)

  useEffect(() => {
    let cancelled = false
    async function sync() {
      await loadLanguage(resolved)
      if (cancelled) return
      if (i18n.language !== resolved) {
        await i18n.changeLanguage(resolved)
      }
      setReady(true)
    }
    if (i18n.language !== resolved) {
      setReady(false)
      sync()
    } else {
      setReady(true)
    }
    document.documentElement.lang = resolved
    return () => { cancelled = true }
  }, [resolved, i18n])

  // Show nothing briefly while loading translations (avoids English flash)
  if (!ready) return <div className="min-h-screen" />

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="bg-black text-white min-h-screen">
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes>
              {/* Default (English) — no prefix */}
              <Route path="/" element={<HomePage />} />
              <Route path="/apps" element={<AppsPage />} />
              <Route path="/apps/:category" element={<AppsPage />} />
              <Route path="/apps/:category/:slug" element={<ProductPage />} />
              <Route path="/learn/hardware-compare" element={<HardwareComparePage />} />
              <Route path="/learn/:slug" element={<TutorialPage />} />
              <Route path="/get-started" element={<GetStartedPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/subscribe/confirmed" element={<SubscribeConfirmedPage />} />
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />

              {/* Language-prefixed routes */}
              <Route path="/:lang" element={<LangSync><HomePage /></LangSync>} />
              <Route path="/:lang/apps" element={<LangSync><AppsPage /></LangSync>} />
              <Route path="/:lang/apps/:category" element={<LangSync><AppsPage /></LangSync>} />
              <Route path="/:lang/apps/:category/:slug" element={<LangSync><ProductPage /></LangSync>} />
              <Route path="/:lang/learn/hardware-compare" element={<LangSync><HardwareComparePage /></LangSync>} />
              <Route path="/:lang/learn/:slug" element={<LangSync><TutorialPage /></LangSync>} />
              <Route path="/:lang/get-started" element={<LangSync><GetStartedPage /></LangSync>} />
              <Route path="/:lang/checkout" element={<LangSync><CheckoutPage /></LangSync>} />
              <Route path="/:lang/pricing" element={<LangSync><PricingPage /></LangSync>} />
              <Route path="/:lang/community" element={<LangSync><CommunityPage /></LangSync>} />
              <Route path="/:lang/subscribe/confirmed" element={<LangSync><SubscribeConfirmedPage /></LangSync>} />
              <Route path="/:lang/blog" element={<LangSync><BlogListPage /></LangSync>} />
              <Route path="/:lang/blog/:slug" element={<LangSync><BlogPostPage /></LangSync>} />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Footer />
        </div>
      </ErrorBoundary>
    </Router>
  )
}

export default App
