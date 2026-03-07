import { Link } from 'react-router-dom'

interface NavbarProps {
  /** Show search box */
  search?: {
    value: string
    onChange: (val: string) => void
    placeholder?: string
  }
  /** Extra right-side elements */
  children?: React.ReactNode
}

export default function Navbar({ search, children }: NavbarProps) {
  return (
    <div className="border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl">🦞</span>
          <span className="font-bold text-lg tracking-tight text-white">CanFly.ai</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {search && (
            <div className="relative hidden sm:block">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={search.placeholder || 'Search...'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none w-56 text-sm"
              />
            </div>
          )}
          {children}
          <Link to="/apps" className="text-sm text-gray-400 hover:text-white transition-colors">
            Browse Apps
          </Link>
          <Link
            to="/apps/ollama"
            className="text-sm bg-green-600/20 border border-green-600 px-3 py-1.5 rounded-full hover:bg-green-600/30 transition-colors text-green-400"
          >
            Start Free
          </Link>
        </div>
      </div>
    </div>
  )
}
