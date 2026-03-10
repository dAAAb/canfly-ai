import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarCall } from '@runwayml/avatars-react'
import '@runwayml/avatars-react/styles.css'
import { MessageCircle, X } from 'lucide-react'

const AVATAR_ID = '47996119-0180-48cb-9e97-64e93e0478d8'

export default function AvatarSection() {
  const { t } = useTranslation()
  const [isCallActive, setIsCallActive] = useState(false)

  return (
    <section className="py-16 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-4xl mx-auto px-4 text-center">
        {/* Section header */}
        <div className="mb-8">
          <span className="inline-block px-3 py-1 text-xs font-medium text-cyan-400 bg-cyan-900/20 border border-cyan-800/30 rounded-full mb-4">
            🦞 {t('avatar.badge', 'AI Assistant')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {t('avatar.title', 'Talk to LittleLobster')}
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            {t('avatar.subtitle', 'Have questions about AI agents? Chat face-to-face with our AI assistant — powered by Runway Characters.')}
          </p>
        </div>

        {/* Avatar call area */}
        {!isCallActive ? (
          <button
            onClick={() => setIsCallActive(true)}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/50 hover:scale-105"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-lg">{t('avatar.startCall', 'Start Video Call with 🦞')}</span>
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </button>
        ) : (
          <div className="relative max-w-2xl mx-auto">
            {/* Close button */}
            <button
              onClick={() => setIsCallActive(false)}
              className="absolute top-3 right-3 z-20 p-2 bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Runway Avatar Call — use SDK default layout (control bar overlays video) */}
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20">
              <AvatarCall
                avatarId={AVATAR_ID}
                connectUrl="/api/avatar/connect"
                onEnd={() => setIsCallActive(false)}
                onError={(error) => {
                  console.error('Avatar error:', error)
                  setIsCallActive(false)
                }}
              />
            </div>

            <p className="mt-4 text-gray-500 text-sm">
              {t('avatar.hint', 'Speak naturally — LittleLobster can hear and respond in real-time.')}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
