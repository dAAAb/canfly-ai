import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HomePage from './pages/HomePage'
import AppsPage from './pages/AppsPage'
import ProductPage from './pages/ProductPage'
import TutorialPage from './pages/TutorialPage'
import Footer from './sections/Footer'
import { langFromPrefix } from './i18n'

/** Wrapper that syncs i18next language from URL param */
function LangSync({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang?: string }>()
  const { i18n } = useTranslation()
  const resolved = langFromPrefix(lang)
  if (i18n.language !== resolved) {
    i18n.changeLanguage(resolved)
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
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
  )
}

function App() {
  return (
    <Router>
      <div className="bg-black text-white min-h-screen">
        <AppRoutes />
        <Footer />
      </div>
    </Router>
  )
}

export default App
