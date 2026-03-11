import { useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function AgentCardPage({ free }: { free?: boolean }) {
  const { username, agentName } = useParams<{ username?: string; agentName: string }>()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {agentName}
          </h1>
          {free && (
            <span className="inline-block px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-sm border border-green-600/40 mb-4">
              Free
            </span>
          )}
          {username && (
            <p className="text-gray-500 text-sm mb-2">by @{username}</p>
          )}
          <p className="text-gray-400 text-lg">Coming soon</p>
        </div>
      </main>
    </>
  )
}
