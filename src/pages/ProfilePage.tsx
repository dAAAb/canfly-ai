import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'
import { Cpu, Globe, Mic, Video } from 'lucide-react'

/** Mock user data — replace with API call later */
const MOCK_USERS: Record<string, {
  name: string
  avatar: string
  bio: string
  showcase: { icon: string; titleKey: string; descKey: string; stack: string[] }[]
}> = {
  demo: {
    name: 'Demo User',
    avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=demo',
    bio: 'AI enthusiast building local-first agents with Ollama and OpenClaw.',
    showcase: [
      { icon: 'cpu', titleKey: 'profile.showcase.localLlm', descKey: 'profile.showcase.localLlmDesc', stack: ['Ollama', 'Llama 3', 'MacBook Pro'] },
      { icon: 'globe', titleKey: 'profile.showcase.cloudDeploy', descKey: 'profile.showcase.cloudDeployDesc', stack: ['Zeabur', 'OpenClaw', 'Docker'] },
      { icon: 'mic', titleKey: 'profile.showcase.voiceBot', descKey: 'profile.showcase.voiceBotDesc', stack: ['ElevenLabs', 'Ollama'] },
      { icon: 'video', titleKey: 'profile.showcase.videoCreator', descKey: 'profile.showcase.videoCreatorDesc', stack: ['HeyGen', 'ElevenLabs'] },
    ],
  },
}

const ICON_MAP: Record<string, typeof Cpu> = { cpu: Cpu, globe: Globe, mic: Mic, video: Video }

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  const user = username ? MOCK_USERS[username] : undefined

  useHead({
    title: user ? `${user.name} — CanFly` : t('meta.profile.title'),
    description: user?.bio ?? t('meta.profile.description'),
    canonical: `https://canfly.ai${localePath(`/u/${username ?? ''}`)}`,
    ogType: 'profile',
  })

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">{t('profile.notFound')}</h1>
            <p className="text-gray-400 mb-8">{t('profile.notFoundDesc')}</p>
            <Link to={localePath('/')} className="inline-block px-6 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors">
              {t('profile.backHome')}
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full border-2 border-gray-700 bg-gray-800"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{user.name}</h1>
              <p className="text-gray-400 max-w-lg">{user.bio}</p>
            </div>
          </div>

          {/* Showcase */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-6">{t('profile.showcaseTitle')}</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {user.showcase.map((item, i) => {
                const Icon = ICON_MAP[item.icon] || Cpu
                return (
                  <div key={i} className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 hover:border-gray-700 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-600/40 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-white">{t(item.titleKey)}</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 leading-relaxed">{t(item.descKey)}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.stack.map((tech) => (
                        <span key={tech} className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
