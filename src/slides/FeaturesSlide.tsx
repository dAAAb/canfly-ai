import VideoBackground from '../components/VideoBackground'
import GlassCard from '../components/GlassCard'
import { Rocket, BookOpen, Wrench, Users, Globe } from 'lucide-react'

const features = [
  {
    icon: Rocket,
    title: '免費起飛',
    desc: '零成本體驗 AI Agent — Ollama + OpenClaw，五分鐘搞定。',
  },
  {
    icon: BookOpen,
    title: '知識導購',
    desc: '硬體評測、軟體教學、最佳實踐。從小白到專家的完整路徑。',
  },
  {
    icon: Wrench,
    title: '白手套服務',
    desc: '不想自己搞？付費服務幫你搞定一切 — 選購、設定、部署。',
  },
  {
    icon: Users,
    title: '飛行社群',
    desc: '每位用戶一個展示頁面 — 你的 Agent、你的配置、你的飛行日誌。',
  },
  {
    icon: Globe,
    title: 'Agent 名片',
    desc: 'alice.canfly.ai — 你的 AI Agent 在網路上的身分證。',
  },
]

export default function FeaturesSlide() {
  const iconSize = 'clamp(28px, 3vw, 48px)'

  return (
    <div className="relative w-full h-full overflow-hidden">
      <VideoBackground
        src="https://stream.mux.com/fHfa8VIbBdqZelLGg5thjsypZ101M01dbyIMLNDWQwlLA.m3u8"
        overlay={0.6}
      />

      <div className="relative z-10 flex flex-col h-full px-[8%] pt-[6%] pb-[5%]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-tight" style={{ fontSize: 'clamp(16px, 1.5vw, 28px)' }}>
            🦞 Canfly
          </span>
          <span style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.8 }}>
            Features
          </span>
        </div>

        {/* Title */}
        <div className="text-center mt-[3%]">
          <p style={{ fontSize: 'clamp(13px, 1.2vw, 22px)', opacity: 0.9, lineHeight: 1.5 }}>
            AI Agent 時代的一站式平台
          </p>
          <h2
            className="font-bold mt-2"
            style={{ fontSize: 'clamp(24px, 4vw, 64px)', letterSpacing: '-0.02em', lineHeight: 1.15 }}
          >
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              五大核心功能
            </span>
          </h2>
        </div>

        {/* Card grid */}
        <div className="flex-1 flex flex-col mt-[3%] min-h-0" style={{ gap: 'clamp(12px, 1.8vw, 28px)' }}>
          {/* Top row - 3 cards */}
          <div className="flex flex-1 min-h-0" style={{ gap: 'clamp(12px, 1.8vw, 28px)' }}>
            {features.slice(0, 3).map((f, i) => (
              <GlassCard key={i} className="flex-1">
                <div className="flex flex-col justify-end h-full" style={{ padding: 'clamp(20px, 3vw, 48px)' }}>
                  <f.icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.5} className="mb-4 opacity-90" />
                  <h3 className="font-bold" style={{ fontSize: 'clamp(16px, 2vw, 36px)', lineHeight: 1.2 }}>
                    {f.title}
                  </h3>
                  <p className="mt-2" style={{ fontSize: 'clamp(11px, 1.05vw, 20px)', opacity: 0.8, lineHeight: 1.55 }}>
                    {f.desc}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Bottom row - 2 cards */}
          <div className="flex flex-1 min-h-0" style={{ gap: 'clamp(12px, 1.8vw, 28px)' }}>
            {features.slice(3).map((f, i) => (
              <GlassCard key={i} className="flex-1">
                <div className="flex flex-col justify-end h-full" style={{ padding: 'clamp(20px, 3vw, 48px)' }}>
                  <f.icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.5} className="mb-4 opacity-90" />
                  <h3 className="font-bold" style={{ fontSize: 'clamp(16px, 2vw, 36px)', lineHeight: 1.2 }}>
                    {f.title}
                  </h3>
                  <p className="mt-2" style={{ fontSize: 'clamp(11px, 1.05vw, 20px)', opacity: 0.8, lineHeight: 1.55 }}>
                    {f.desc}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
