import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarCall, AvatarVideo, ControlBar } from '@runwayml/avatars-react'
import '@runwayml/avatars-react/styles.css'
import { Video, X } from 'lucide-react'

interface AgentAvatarCallProps {
  agentName: string
  avatarId: string
  connectUrl: string
  platformEmoji?: string
}

export default function AgentAvatarCall({ agentName, avatarId, connectUrl, platformEmoji = '🤖' }: AgentAvatarCallProps) {
  const { t } = useTranslation()
  const [isCallActive, setIsCallActive] = useState(false)
  const [error, setError] = useState<'quota' | 'generic' | null>(null)

  function handleError(err: Error) {
    console.error('Agent avatar error:', err)
    const msg = err?.message || ''
    if (msg.includes('429') || msg.includes('limit') || msg.includes('quota')) {
      setError('quota')
    } else {
      setError('generic')
    }
    setIsCallActive(false)
  }

  if (error === 'quota') {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">{platformEmoji}💤</div>
        <h3 className="text-lg font-bold text-white mb-2">
          {t('agentAvatar.quotaTitle', '{{name}} is resting!', { name: agentName })}
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          {t('agentAvatar.quotaMessage', 'Video call quota reached for today. Please try again tomorrow.')}
        </p>
        <button
          onClick={() => setError(null)}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline"
        >
          {t('agentAvatar.tryAgain', 'Try again')}
        </button>
      </div>
    )
  }

  if (error === 'generic') {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">{platformEmoji}😵</div>
        <h3 className="text-lg font-bold text-white mb-2">
          {t('agentAvatar.errorTitle', 'Something went wrong')}
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          {t('agentAvatar.errorMessage', 'Could not connect to the avatar. Please try again.')}
        </p>
        <button
          onClick={() => setError(null)}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors text-sm font-medium"
        >
          {t('agentAvatar.tryAgain', 'Try again')}
        </button>
      </div>
    )
  }

  if (!isCallActive) {
    return (
      <div
        className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer group"
        onClick={() => setIsCallActive(true)}
      >
        <div className="relative">
          <img
            src="/images/avatar-placeholder.jpg"
            alt={`Video call with ${agentName}`}
            className="w-full aspect-video object-cover group-hover:brightness-110 transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          {/* CTA overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600/90 hover:bg-cyan-500 text-white font-medium rounded-xl transition-all group-hover:scale-105 shadow-lg shadow-cyan-900/50">
              <Video className="w-5 h-5" />
              {t('agentAvatar.startCall', 'Start Video Call with {{emoji}}', { emoji: platformEmoji })}
            </button>
          </div>
          {/* Online indicator */}
          <span className="absolute top-4 right-4 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Close button */}
      <button
        onClick={() => setIsCallActive(false)}
        className="absolute top-3 right-3 z-20 p-2 bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Runway Avatar Call */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20">
        <AvatarCall
          avatarId={avatarId}
          connectUrl={connectUrl}
          onEnd={() => setIsCallActive(false)}
          onError={handleError}
        >
          <AvatarVideo className="w-full aspect-video object-cover" />
          <ControlBar />
        </AvatarCall>
      </div>

      <p className="mt-3 text-gray-500 text-sm text-center">
        {t('agentAvatar.hint', 'Speak naturally — {{name}} can hear and respond in real-time.', { name: agentName })}
      </p>
    </div>
  )
}
