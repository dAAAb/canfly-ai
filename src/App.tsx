import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState, lazy, Suspense } from 'react'
import Footer from './sections/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import { langFromPrefix, loadLanguage, detectLanguageAuto } from './i18n'

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
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const UserShowcasePage = lazy(() => import('./pages/UserShowcasePage'))
const AgentCardPage = lazy(() => import('./pages/AgentCardPage'))
const FreeAgentsPage = lazy(() => import('./pages/FreeAgentsPage'))
const RankingsPage = lazy(() => import('./pages/RankingsPage'))
const BrandPage = lazy(() => import('./pages/BrandPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'))

/** Redirect /u/:username → /@:username */
function ProfileRedirect() {
  const { username } = useParams<{ username: string }>()
  return <Navigate to={`/@${username}`} replace />
}

/** Redirect /:lang/u/:username → /@:username (strip lang prefix) */
function LangProfileRedirect() {
  const { username } = useParams<{ username: string }>()
  return <Navigate to={`/@${username}`} replace />
}

/** Strip /:lang prefix and redirect to the unprefixed community path */
function StripLangRedirect() {
  const { lang } = useParams<{ lang: string }>()
  const location = useLocation()
  // Remove the /:lang prefix from the current path
  const prefix = `/${lang}`
  const path = location.pathname.startsWith(prefix)
    ? location.pathname.slice(prefix.length) || '/'
    : location.pathname
  return <Navigate to={path} replace />
}

/** Wrapper that syncs i18next language from URL :lang param.
 *  Loads translation bundle first, then switches language so React
 *  renders with translations already available (no flash of English). */
const VALID_LANG_PREFIXES = new Set(['en', 'zh-tw', 'zh-cn'])

/** 
 * Route dispatcher for top-level /:slug paths.
 * 
 * React Router v6 can't use /@:username because @ is absorbed into the param.
 * So /:lang will match /@dAAAb with lang="@dAAAb".
 * 
 * This wrapper detects @-prefixed slugs and renders the user profile page,
 * otherwise validates it as a language prefix.
 */
function LangOrProfile() {
  const { lang } = useParams<{ lang?: string }>()
  if (lang?.startsWith('@')) {
    return <AutoLangSync><UserShowcasePage /></AutoLangSync>
  }
  if (lang && !VALID_LANG_PREFIXES.has(lang.toLowerCase())) {
    return <Suspense fallback={<div className="min-h-screen" />}><NotFoundPage /></Suspense>
  }
  return <LangSync><HomePage /></LangSync>
}

function LangOrProfileEdit() {
  const { lang } = useParams<{ lang?: string }>()
  if (lang?.startsWith('@')) {
    return <AutoLangSync><ProfileEditPage /></AutoLangSync>
  }
  return null
}

function LangOrAgentCard() {
  const { lang } = useParams<{ lang?: string }>()
  if (lang?.startsWith('@')) {
    return <AutoLangSync><AgentCardPage /></AutoLangSync>
  }
  return null
}

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

/** Syncs i18next language from cookie/browser for pages without URL lang prefix.
 *  Priority: canfly_lang cookie → navigator.languages → fallback en */
function AutoLangSync({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const resolved = detectLanguageAuto()
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
              <Route path="/community" element={<AutoLangSync><CommunityPage /></AutoLangSync>} />
              <Route path="/community/register" element={<AutoLangSync><RegisterPage /></AutoLangSync>} />
              <Route path="/subscribe/confirmed" element={<SubscribeConfirmedPage />} />
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />

              {/* Community routes — no lang prefix, auto-detect from cookie/browser */}
              {/* NOTE: /@:username does NOT work in React Router v6 — @ is absorbed into param.
                  Instead, /:lang dispatcher handles @-prefixed slugs (see LangOrProfile). */}
              <Route path="/free" element={<AutoLangSync><FreeAgentsPage /></AutoLangSync>} />
              <Route path="/free/agent/:agentName" element={<AutoLangSync><AgentCardPage free /></AutoLangSync>} />
              <Route path="/rankings" element={<AutoLangSync><RankingsPage /></AutoLangSync>} />
              <Route path="/rankings/brand/:brandName" element={<AutoLangSync><BrandPage /></AutoLangSync>} />

              {/* Legacy redirect: /u/:username → /@:username */}
              <Route path="/u/:username" element={<ProfileRedirect />} />

              {/* /:lang — dispatches to HomePage OR /@username profile */}
              <Route path="/:lang/agent/:agentName" element={<LangOrAgentCard />} />
              <Route path="/:lang/edit" element={<LangOrProfileEdit />} />
              <Route path="/:lang" element={<LangOrProfile />} />
              <Route path="/:lang/apps" element={<LangSync><AppsPage /></LangSync>} />
              <Route path="/:lang/apps/:category" element={<LangSync><AppsPage /></LangSync>} />
              <Route path="/:lang/apps/:category/:slug" element={<LangSync><ProductPage /></LangSync>} />
              <Route path="/:lang/learn/hardware-compare" element={<LangSync><HardwareComparePage /></LangSync>} />
              <Route path="/:lang/learn/:slug" element={<LangSync><TutorialPage /></LangSync>} />
              <Route path="/:lang/get-started" element={<LangSync><GetStartedPage /></LangSync>} />
              <Route path="/:lang/checkout" element={<LangSync><CheckoutPage /></LangSync>} />
              <Route path="/:lang/pricing" element={<LangSync><PricingPage /></LangSync>} />
              <Route path="/:lang/community/register" element={<LangSync><RegisterPage /></LangSync>} />
              <Route path="/:lang/community" element={<LangSync><CommunityPage /></LangSync>} />
              <Route path="/:lang/subscribe/confirmed" element={<LangSync><SubscribeConfirmedPage /></LangSync>} />
              <Route path="/:lang/blog" element={<LangSync><BlogListPage /></LangSync>} />
              <Route path="/:lang/blog/:slug" element={<LangSync><BlogPostPage /></LangSync>} />

              {/* /free — lang prefix supported */}
              <Route path="/:lang/free/agent/:agentName" element={<LangSync><AgentCardPage free /></LangSync>} />
              <Route path="/:lang/free" element={<LangSync><FreeAgentsPage /></LangSync>} />

              {/* /@username — handled by /:lang dispatcher (LangOrProfile) above.
                  React Router v6 can't match /@:username, so /:lang/@:username won't work either.
                  The /:lang/agent/:agentName and /:lang/edit routes handle the sub-paths. */}
              <Route path="/:lang/rankings/brand/:brandName" element={<LangSync><BrandPage /></LangSync>} />
              <Route path="/:lang/rankings" element={<LangSync><RankingsPage /></LangSync>} />

              {/* Legacy redirect: /:lang/u/:username → /@:username */}
              <Route path="/:lang/u/:username" element={<LangProfileRedirect />} />

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
