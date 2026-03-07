import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AppsPage from './pages/AppsPage'
import ProductPage from './pages/ProductPage'
import TutorialPage from './pages/TutorialPage'
import Footer from './sections/Footer'

function App() {
  return (
    <Router>
      <div className="bg-black text-white min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/apps/:slug" element={<ProductPage />} />
          <Route path="/learn/:slug" element={<TutorialPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  )
}

export default App
