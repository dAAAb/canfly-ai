import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, lazy, Suspense } from 'react'
import Footer from './sections/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import { langFromPrefix, loadLanguage, detectLanguageAuto } from './i18n'
import { detectSubdomain } from './utils/subdomain'

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
const AgentRegisterPage = lazy(() => import('./pages/AgentRegisterPage'))
const TaskManagerPage = lazy(() => import('./pages/TaskManagerPage'))
const TasksDashboardPage = lazy(() => import('./pages/TasksDashboardPage'))
const PaperclipDashboardPage = lazy(() => import('./pages/PaperclipDashboardPage'))
const ChatProxyPage = lazy(() => import('./pages/ChatProxyPage'))
const DeployWizardPage = lazy(() => import('./pages/DeployWizardPage'))
const DeployPinataWizardPage = lazy(() => import('./pages/DeployPinataWizardPage'))
const BindZeaburPage = lazy(() => import('./pages/BindZeaburPage'))
const AgentSettingsPage = lazy(() => import('./pages/AgentSettingsPage'))
const TaskResultPage = lazy(() => import('./pages/TaskResultPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))

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

function LangGuard({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang?: string }>()
  if (!lang || !VALID_LANG_PREFIXES.has(lang)) return <NotFoundPage />
  return <LangSync>{children}</LangSync>
}

function LangSync({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()

  const resolved = langFromPrefix(lang)

  useEffect(() => {
    let cancelled = false
    async function sync() {
      await loadLanguage(resolved)
      if (cancelled) return
      if (i18n.language !== resolved) {
        await i18n.changeLanguage(resolved)
      }
    }
    sync()
    document.documentElement.lang = resolved
    return () => { cancelled = true }
  }, [resolved, i18n])

  return <>{children}</>
}

/** Syncs i18next language from cookie/browser for pages without URL lang prefix.
 *  Priority: canfly_lang cookie → navigator.languages → fallback en */
function AutoLangSync({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const resolved = detectLanguageAuto()

  useEffect(() => {
    let cancelled = false
    async function sync() {
      await loadLanguage(resolved)
      if (cancelled) return
      if (i18n.language !== resolved) {
        await i18n.changeLanguage(resolved)
      }
    }
    sync()
    document.documentElement.lang = resolved
    return () => { cancelled = true }
  }, [resolved, i18n])

  return <>{children}</>
}

/** On subdomain, render user pages directly without /u/ prefix in URL */
function SubdomainRouter({ subdomain }: { subdomain: string }) {
  return (
    <Router>
      <ErrorBoundary>
        <div className="site-shell min-h-screen">
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes>
              <Route path="/" element={<AutoLangSync><UserShowcasePage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="/agent/:agentName/chat" element={<AutoLangSync><ChatProxyPage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="/agent/:agentName" element={<AutoLangSync><AgentCardPage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="/agents/new" element={<AutoLangSync><AgentRegisterPage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="/agents/deploy-pinata" element={<AutoLangSync><DeployPinataWizardPage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="/tasks" element={<AutoLangSync><TasksDashboardPage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="/paperclip" element={<AutoLangSync><PaperclipDashboardPage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="/edit" element={<AutoLangSync><ProfileEditPage subdomainUsername={subdomain} /></AutoLangSync>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Footer />
        </div>
      </ErrorBoundary>
    </Router>
  )
}

function App() {
  const subdomain = detectSubdomain(window.location.hostname)
  if (subdomain) return <SubdomainRouter subdomain={subdomain} />

  return (
    <Router>
      <ErrorBoundary>
        <div className="site-shell min-h-screen">
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
              <Route path="/orders" element={<AutoLangSync><TaskManagerPage /></AutoLangSync>} />
              <Route path="/tasks/:taskId" element={<AutoLangSync><TaskResultPage /></AutoLangSync>} />
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />

              {/* Community routes — no lang prefix, auto-detect from cookie/browser */}
              {/* Community routes: /u/:username (no @ — React Router v6 can't handle it) */}
              <Route path="/u/:username/agents/new" element={<AutoLangSync><AgentRegisterPage /></AutoLangSync>} />
              <Route path="/u/:username/agent/:agentName/settings" element={<AutoLangSync><AgentSettingsPage /></AutoLangSync>} />
              <Route path="/u/:username/agents/deploy" element={<AutoLangSync><DeployWizardPage /></AutoLangSync>} />
              <Route path="/u/:username/agents/deploy-pinata" element={<AutoLangSync><DeployPinataWizardPage /></AutoLangSync>} />
              <Route path="/u/:username/agents/bind" element={<AutoLangSync><BindZeaburPage /></AutoLangSync>} />
              <Route path="/u/:username/agent/:agentName/chat" element={<AutoLangSync><ChatProxyPage /></AutoLangSync>} />
              <Route path="/u/:username/agent/:agentName" element={<AutoLangSync><AgentCardPage /></AutoLangSync>} />
              <Route path="/u/:username/tasks" element={<AutoLangSync><TasksDashboardPage /></AutoLangSync>} />
              <Route path="/u/:username/paperclip" element={<AutoLangSync><PaperclipDashboardPage /></AutoLangSync>} />
              <Route path="/u/:username/edit" element={<AutoLangSync><ProfileEditPage /></AutoLangSync>} />
              <Route path="/u/:username" element={<AutoLangSync><UserShowcasePage /></AutoLangSync>} />

              <Route path="/free" element={<AutoLangSync><FreeAgentsPage /></AutoLangSync>} />
              <Route path="/free/agent/:agentName" element={<AutoLangSync><AgentCardPage free /></AutoLangSync>} />
              <Route path="/rankings" element={<AutoLangSync><RankingsPage /></AutoLangSync>} />
              <Route path="/rankings/brand/:brandName" element={<AutoLangSync><BrandPage /></AutoLangSync>} />

              <Route path="/about" element={<AutoLangSync><LegalPage page="about" /></AutoLangSync>} />
              <Route path="/contact" element={<AutoLangSync><LegalPage page="contact" /></AutoLangSync>} />
              <Route path="/privacy" element={<AutoLangSync><LegalPage page="privacy" /></AutoLangSync>} />
              <Route path="/developers" element={<AutoLangSync><LegalPage page="developers" /></AutoLangSync>} />
              <Route path="/docs" element={<Navigate to="/developers" replace />} />

              {/* Language-prefixed homepage — :lang is only en|zh-tw|zh-cn */}
              <Route path="/:lang" element={<LangGuard><HomePage /></LangGuard>} />
              <Route path="/:lang/apps" element={<LangGuard><AppsPage /></LangGuard>} />
              <Route path="/:lang/apps/:category" element={<LangGuard><AppsPage /></LangGuard>} />
              <Route path="/:lang/apps/:category/:slug" element={<LangGuard><ProductPage /></LangGuard>} />
              <Route path="/:lang/learn/hardware-compare" element={<LangGuard><HardwareComparePage /></LangGuard>} />
              <Route path="/:lang/learn/:slug" element={<LangGuard><TutorialPage /></LangGuard>} />
              <Route path="/:lang/get-started" element={<LangGuard><GetStartedPage /></LangGuard>} />
              <Route path="/:lang/checkout" element={<LangGuard><CheckoutPage /></LangGuard>} />
              <Route path="/:lang/pricing" element={<LangGuard><PricingPage /></LangGuard>} />
              <Route path="/:lang/community/register" element={<LangGuard><RegisterPage /></LangGuard>} />
              <Route path="/:lang/community" element={<LangGuard><CommunityPage /></LangGuard>} />
              <Route path="/:lang/subscribe/confirmed" element={<LangGuard><SubscribeConfirmedPage /></LangGuard>} />
              <Route path="/:lang/orders" element={<LangGuard><TaskManagerPage /></LangGuard>} />
              <Route path="/:lang/tasks/:taskId" element={<LangGuard><TaskResultPage /></LangGuard>} />
              <Route path="/:lang/blog" element={<LangGuard><BlogListPage /></LangGuard>} />
              <Route path="/:lang/blog/:slug" element={<LangGuard><BlogPostPage /></LangGuard>} />
              <Route path="/:lang/about" element={<LangGuard><LegalPage page="about" /></LangGuard>} />
              <Route path="/:lang/contact" element={<LangGuard><LegalPage page="contact" /></LangGuard>} />
              <Route path="/:lang/privacy" element={<LangGuard><LegalPage page="privacy" /></LangGuard>} />
              <Route path="/:lang/developers" element={<LangGuard><LegalPage page="developers" /></LangGuard>} />
              <Route path="/:lang/docs" element={<LangGuard><Navigate to="/developers" replace /></LangGuard>} />

              {/* /free — lang prefix supported */}
              <Route path="/:lang/free/agent/:agentName" element={<LangGuard><AgentCardPage free /></LangGuard>} />
              <Route path="/:lang/free" element={<LangGuard><FreeAgentsPage /></LangGuard>} />

              <Route path="/:lang/rankings/brand/:brandName" element={<LangGuard><BrandPage /></LangGuard>} />
              <Route path="/:lang/rankings" element={<LangGuard><RankingsPage /></LangGuard>} />

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
