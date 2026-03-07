import { useFadeIn } from '../hooks/useFadeIn'
import { Rocket, BookOpen, Wrench, Users, Globe } from 'lucide-react'

const features = [
  {
    icon: Rocket,
    title: '免費起飛',
    desc: '零成本體驗 AI Agent — Ollama + OpenClaw，五分鐘搞定。不用花一毛錢，就能擁有你的第一個 AI 夥伴。',
    gradient: 'from-cyan-400 to-blue-500',
  },
  {
    icon: BookOpen,
    title: '知識導購',
    desc: '硬體評測、軟體教學、最佳實踐。從小白到專家的完整路徑，每一步都有人帶你走。',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    icon: Wrench,
    title: '白手套服務',
    desc: '不想自己搞？付費服務幫你搞定一切。選購、設定、部署、維護 — 交給我們。',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    icon: Users,
    title: '飛行社群',
    desc: '每位用戶一個展示頁面。你的 Agent、你的配置、你的飛行日誌。互相啟發，一起成長。',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    icon: Globe,
    title: 'Agent 名片',
    desc: 'alice.canfly.ai — 你的 AI Agent 在網路上的身分證。個人品牌從這裡開始。',
    gradient: 'from-blue-400 to-indigo-500',
  },
]

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useFadeIn(0.1)

  return (
    <div ref={ref} className="fade-section">
      <div
        className="relative rounded-3xl overflow-hidden h-full"
        style={{
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 'clamp(28px, 4vw, 56px)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.04), transparent 60%)',
          }}
        />

        <div className="relative text-center">
          <feature.icon
            className={`stagger-child stagger-${index + 1}`}
            style={{ width: 'clamp(36px, 4vw, 56px)', height: 'clamp(36px, 4vw, 56px)', marginBottom: '1.5rem', marginLeft: 'auto', marginRight: 'auto' }}
            strokeWidth={1.3}
          />

          <h3
            className={`font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}
            style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: 1.2 }}
          >
            {feature.title}
          </h3>

          <p style={{ fontSize: 'clamp(15px, 1.2vw, 20px)', lineHeight: 1.75, opacity: 0.7, marginTop: '1.25rem' }}>
            {feature.desc}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FeaturesSection() {
  const headerRef = useFadeIn()

  return (
    <section className="relative py-36 md:py-52" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
      <div style={{ maxWidth: '1024px', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* Section header */}
        <div ref={headerRef} className="fade-section" style={{ textAlign: 'center', marginBottom: 'clamp(48px, 6vw, 96px)' }}>
          <p
            className="text-cyan-400 font-semibold uppercase tracking-widest stagger-child stagger-1"
            style={{ fontSize: 'clamp(11px, 1vw, 14px)', marginBottom: '2rem' }}
          >
            Features
          </p>
          <h2
            className="font-bold stagger-child stagger-2"
            style={{
              fontSize: 'clamp(32px, 5vw, 72px)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
            }}
          >
            你需要的，
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              全都在這。
            </span>
          </h2>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.slice(0, 3).map((f, i) => (
            <FeatureCard key={i} feature={f} index={i} />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-8" style={{ marginTop: '2rem' }}>
          {features.slice(3).map((f, i) => (
            <div key={i + 3} style={{ width: 'calc((100% - 4rem) / 3)' }} className="min-w-[280px]">
              <FeatureCard feature={f} index={i + 3} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
