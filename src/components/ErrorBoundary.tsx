import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />
    }
    return this.props.children
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-black text-white">
      <span className="text-8xl mb-6">⚠️</span>
      <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
      <p className="text-lg text-gray-400 mb-8 max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="text-sm bg-green-600/20 border border-green-600 px-6 py-3 rounded-full hover:bg-green-600/30 transition-all text-green-400 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]"
      >
        Try Again
      </button>
    </div>
  )
}
