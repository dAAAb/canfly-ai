import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Cpu, Globe, Mic, Video, Server, Bot } from 'lucide-react'

const ICON_MAP: Record<string, typeof Cpu> = {
  cpu: Cpu,
  globe: Globe,
  mic: Mic,
  video: Video,
  server: Server,
  bot: Bot,
}

/** Static showcase entries — replace with API data later */
const SHOWCASE_ENTRIES = [
  { id: 'local-llm', icon: 'cpu', stack: ['Ollama', 'Llama 3', 'MacBook Pro M3'] },
  { id: 'cloud-deploy', icon: 'globe', stack: ['Zeabur', 'OpenClaw', 'Docker'] },
  { id: 'voice-assistant', icon: 'mic', stack: ['ElevenLabs', 'Ollama', 'Python'] },
  { id: 'video-creator', icon: 'video', stack: ['HeyGen', 'ElevenLabs', 'Canva'] },
  { id: 'home-server', icon: 'server', stack: ['Umbrel', 'Ollama', 'Raspberry Pi 5'] },
  { id: 'coding-agent', icon: 'bot', stack: ['Ollama', 'Continue.dev', 'VS Code'] },
]

export default function CommunityPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  useHead({
    title: t('meta.community.title'),
    description: t('meta.community.description'),
    canonical: `https://canfly.ai${localePath('/community')}`,
    ogType: 'website',
  })

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-purple-400 text-sm font-medium tracking-wider uppercase mb-3">
              {t('community.eyebrow')}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {t('community.title')}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('community.subtitle')}
            </p>
          </div>

          {/* Showcase Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {SHOWCASE_ENTRIES.map((entry) => {
              const Icon = ICON_MAP[entry.icon] || Bot
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-600/40 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white">
                      {t(`community.entries.${entry.id}.title`)}
                    </h3>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    {t(`community.entries.${entry.id}.desc`)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {entry.stack.map((tech) => (
                      <span
                        key={tech}
                        className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div className="text-center rounded-2xl border border-gray-800 bg-gray-900/40 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              {t('community.cta.title')}
            </h2>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              {t('community.cta.desc')}
            </p>
            <Link
              to={localePath('/get-started')}
              className="inline-block px-6 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
            >
              {t('community.cta.button')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
