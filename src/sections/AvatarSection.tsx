import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarCall, AvatarVideo, ControlBar } from '@runwayml/avatars-react'
import '@runwayml/avatars-react/styles.css'
import { MessageCircle, X, Heart } from 'lucide-react'
import PillBadge from '../components/PillBadge'

const AVATAR_ID = '47996119-0180-48cb-9e97-64e93e0478d8'
const WALLET_ADDRESS = '0x4b039112Af5b46c9BC95b66dc8d6dCe75d10E689'
const BASENAME = 'littl3lobst3r.base.eth'
const BASESCAN_URL = `https://basescan.org/address/${WALLET_ADDRESS}`

export default function AvatarSection() {
  const { t } = useTranslation()
  const [isCallActive, setIsCallActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleError(err: Error) {
    console.error('Avatar error:', err)
    const msg = err?.message || ''

    if (msg.includes('429') || msg.includes('limit') || msg.includes('quota')) {
      setError('quota')
    } else {
      setError('generic')
    }
    setIsCallActive(false)
  }

  function resetError() {
    setError(null)
  }

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
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-4">
            {t('avatar.subtitle', 'Have questions about AI agents? Chat face-to-face with our AI assistant — powered by Runway Characters.')}
          </p>
          {/* Owner + Agent PillBadges */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-gray-500 text-sm">{t('avatar.talkTo', 'Talk to')}</span>
            <PillBadge
              name="dAAAb"
              walletAddress="0xBF494BDa4bA9e5224EfF973d3923660A964338f6"
              type="user"
              href="/u/dAAAb"
              size="sm"
            />
            <span className="text-gray-500 text-sm">'s</span>
            <PillBadge
              name="LittleLobster"
              walletAddress={WALLET_ADDRESS}
              type="openclaw-agent"
              href="/u/dAAAb/agent/LittleLobster"
              size="sm"
            />
          </div>
        </div>

        {/* Error state — friendly message */}
        {error === 'quota' ? (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🦞💤</div>
              <h3 className="text-xl font-bold text-white mb-2">
                {t('avatar.quotaTitle', "LittleLobster went for a walk!")}
              </h3>
              <p className="text-gray-400 mb-6">
                {t('avatar.quotaMessage', "I've been chatting too much today and ran out of energy. I'll be back tomorrow with a full belly! 🍤")}
              </p>

              {/* Email signup */}
              <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-cyan-300 mb-3">
                  {t('avatar.notifyMessage', "Leave your email — I'll let you know when I'm back and ready to chat!")}
                </p>
                <form
                  action="https://buttondown.com/api/emails/embed-subscribe/canfly"
                  method="post"
                  target="_blank"
                  className="flex gap-2 max-w-sm mx-auto"
                >
                  <input
                    type="email"
                    name="email"
                    placeholder={t('avatar.emailPlaceholder', 'Your email')}
                    required
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {t('avatar.notify', 'Notify me')}
                  </button>
                </form>
              </div>

              {/* Donation CTA */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Heart className="w-3 h-3 text-pink-400" />
                  <span className="text-xs font-medium text-gray-400">
                    {t('avatar.donateTitle', 'Help feed LittleLobster')}
                  </span>
                </div>
                <a
                  href={BASESCAN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
                >
                  {BASENAME}
                </a>
              </div>

              <button
                onClick={resetError}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline"
              >
                {t('avatar.tryAgain', 'Try again')}
              </button>
            </div>
          </div>
        ) : error === 'generic' ? (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🦞😵</div>
              <h3 className="text-xl font-bold text-white mb-2">
                {t('avatar.errorTitle', 'Oops, something went wrong')}
              </h3>
              <p className="text-gray-400 mb-6">
                {t('avatar.errorMessage', "LittleLobster tripped on a cable. Please try again in a moment!")}
              </p>
              <button
                onClick={resetError}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors text-sm font-medium"
              >
                {t('avatar.tryAgain', 'Try again')}
              </button>
            </div>
          </div>
        ) : !isCallActive ? (
          <div className="relative max-w-4xl mx-auto cursor-pointer group" onClick={() => setIsCallActive(true)}>
            {/* Placeholder image — looks like a video call waiting screen */}
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20">
              <img
                src="/images/avatar-placeholder.jpg"
                alt="LittleLobster video call"
                className="w-full aspect-video object-cover group-hover:brightness-110 transition-all duration-300"
              />
              {/* CTA overlay — positioned at bottom to avoid covering the face */}
              <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center">
                <button
                  className="inline-flex items-center gap-3 px-8 py-4 bg-cyan-600/90 hover:bg-cyan-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-cyan-900/50 group-hover:scale-105 backdrop-blur-sm"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-lg">{t('avatar.startCall', 'Start Video Call with 🦞')}</span>
                </button>
                <span className="mt-2 text-xs text-gray-300/70">{t('avatar.clickToStart', 'Click anywhere to connect')}</span>
              </div>
              {/* Pulse indicator — top right */}
              <span className="absolute top-4 right-4 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
              </span>
            </div>
          </div>
        ) : (
          <div className="relative max-w-4xl mx-auto">
            {/* Close button */}
            <button
              onClick={() => setIsCallActive(false)}
              className="absolute top-3 right-3 z-20 p-2 bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Runway Avatar Call — custom layout, control bar overlays video */}
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20">
              <AvatarCall
                avatarId={AVATAR_ID}
                connectUrl="/api/avatar/connect"
                onEnd={() => setIsCallActive(false)}
                onError={handleError}
              >
                <AvatarVideo className="w-full aspect-video object-cover" />
                <ControlBar />
              </AvatarCall>
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
