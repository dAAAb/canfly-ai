import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import { useFadeIn } from '../hooks/useFadeIn'
import Navbar from '../components/Navbar'
import { Terminal, Cloud, HardDrive, Cpu, ArrowRight, ChevronLeft, Sparkles } from 'lucide-react'

type PathKey = 'beginner' | 'experienced' | 'cloud' | 'hardware'

interface PathOption {
  key: PathKey
  icon: typeof Terminal
  color: string
  borderColor: string
  bgColor: string
  glowColor: string
  tutorialSlug: string
}

const PATHS: PathOption[] = [
  {
    key: 'beginner',
    icon: Sparkles,
    color: 'text-green-400',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
    glowColor: 'rgba(34,197,94,0.15)',
    tutorialSlug: 'virtual-machine',
  },
  {
    key: 'experienced',
    icon: Terminal,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    glowColor: 'rgba(6,182,212,0.15)',
    tutorialSlug: 'ollama',
  },
  {
    key: 'cloud',
    icon: Cloud,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    glowColor: 'rgba(168,85,247,0.15)',
    tutorialSlug: 'zeabur',
  },
  {
    key: 'hardware',
    icon: HardDrive,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
    glowColor: 'rgba(251,146,60,0.15)',
    tutorialSlug: 'umbrel',
  },
]

export default function GetStartedPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [selected, setSelected] = useState<PathKey | null>(null)
  const heroRef = useFadeIn()
  const quizRef = useFadeIn(0.1)
  const resultRef = useFadeIn(0.1)

  useHead({
    title: t('onboarding.meta.title'),
    description: t('onboarding.meta.description'),
  })

  const selectedPath = PATHS.find((p) => p.key === selected)

  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      {/* Hero */}
      <section
        ref={heroRef}
        className="fade-section relative py-24 md:py-36"
        style={{ paddingLeft: '8%', paddingRight: '8%' }}
      >
        <div style={{ maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
          <p className="text-cyan-400 font-semibold uppercase tracking-widest text-sm mb-6 stagger-child stagger-1">
            {t('onboarding.eyebrow')}
          </p>
          <h1
            className="font-bold stagger-child stagger-2"
            style={{ fontSize: 'clamp(32px, 6vw, 64px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            {t('onboarding.title')}
          </h1>
          <p className="text-gray-400 mt-6 text-lg stagger-child stagger-3" style={{ maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
            {t('onboarding.subtitle')}
          </p>
        </div>
      </section>

      {/* Quiz / Path Selection */}
      {!selected && (
        <section
          ref={quizRef}
          className="fade-section pb-36"
          style={{ paddingLeft: '8%', paddingRight: '8%' }}
        >
          <div style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h2 className="text-center text-xl font-semibold text-gray-300 mb-10 stagger-child stagger-1">
              {t('onboarding.question')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {PATHS.map((path, i) => {
                const Icon = path.icon
                return (
                  <button
                    key={path.key}
                    onClick={() => setSelected(path.key)}
                    className={`stagger-child stagger-${i + 1} text-left p-6 rounded-2xl border ${path.borderColor} ${path.bgColor} card-hover transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
                    style={{ boxShadow: `0 0 30px ${path.glowColor}` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${path.bgColor} ${path.color}`}>
                        <Icon size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold text-lg ${path.color}`}>
                          {t(`onboarding.paths.${path.key}.label`)}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                          {t(`onboarding.paths.${path.key}.description`)}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Cpu size={14} className="text-gray-500" />
                          <span className="text-gray-500 text-xs">
                            {t(`onboarding.paths.${path.key}.tag`)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Result / Recommendation */}
      {selected && selectedPath && (
        <section
          ref={resultRef}
          className="fade-section pb-36"
          style={{ paddingLeft: '8%', paddingRight: '8%' }}
        >
          <div style={{ maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-8 cursor-pointer"
            >
              <ChevronLeft size={18} />
              <span className="text-sm">{t('onboarding.backToQuiz')}</span>
            </button>

            <div
              className={`rounded-2xl border ${selectedPath.borderColor} ${selectedPath.bgColor} p-8 md:p-10`}
              style={{ boxShadow: `0 0 40px ${selectedPath.glowColor}` }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-xl ${selectedPath.bgColor} ${selectedPath.color}`}>
                  <selectedPath.icon size={32} />
                </div>
                <div>
                  <h2 className={`font-bold text-2xl ${selectedPath.color}`}>
                    {t(`onboarding.paths.${selected}.label`)}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {t(`onboarding.paths.${selected}.tag`)}
                  </p>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed mb-4">
                {t(`onboarding.paths.${selected}.recommendation`)}
              </p>

              {/* Steps preview */}
              <div className="space-y-3 mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedPath.bgColor} ${selectedPath.color} border ${selectedPath.borderColor}`}>
                      {step}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {t(`onboarding.paths.${selected}.steps.${step - 1}`)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={localePath(`/learn/${selectedPath.tutorialSlug}`)}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-black transition-all ${
                    selected === 'beginner' ? 'bg-green-400 hover:bg-green-300' :
                    selected === 'experienced' ? 'bg-cyan-400 hover:bg-cyan-300' :
                    selected === 'cloud' ? 'bg-purple-400 hover:bg-purple-300' :
                    'bg-orange-400 hover:bg-orange-300'
                  }`}
                >
                  {t('onboarding.startTutorial')}
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to={localePath('/apps')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-all"
                >
                  {t('onboarding.browseAll')}
                </Link>
              </div>
            </div>

            {/* Other paths hint */}
            <p className="text-center text-gray-600 text-sm mt-8">
              {t('onboarding.otherPaths')}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
