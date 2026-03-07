import { useFadeIn } from '../hooks/useFadeIn'

export default function VisionSection() {
  const ref = useFadeIn()

  return (
    <section className="relative py-32 md:py-48 px-[6%]">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      <div ref={ref} className="fade-section relative z-10 max-w-6xl mx-auto">
        {/* Eyebrow */}
        <p
          className="text-cyan-400 font-semibold uppercase tracking-widest mb-6 stagger-child stagger-1"
          style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}
        >
          The Vision
        </p>

        {/* Big heading */}
        <h2
          className="font-bold stagger-child stagger-2"
          style={{
            fontSize: 'clamp(32px, 5vw, 80px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            maxWidth: '900px',
          }}
        >
          Every person deserves
          <br />
          an{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            AI Agent.
          </span>
        </h2>

        {/* Description */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
          <div className="stagger-child stagger-3">
            <p
              className="opacity-80"
              style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.7 }}
            >
              AI Agent 市場正在爆發 — 從個人助理到企業自動化，2026 是人人都能擁有 AI 夥伴的元年。但大多數人不知道從哪裡開始。
            </p>
            <p
              className="opacity-80 mt-8"
              style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.7 }}
            >
              硬體怎麼選？軟體怎麼裝？Agent 怎麼跑？這些問題，CanFly.ai 一次解決。
            </p>
          </div>

          <div className="stagger-child stagger-4">
            <p
              className="opacity-80"
              style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.7 }}
            >
              我們是 AI Agent 世界的知識嚮導。從免費體驗到硬體導購，從白手套設定到社群互助 — 帶你從零開始起飛。
            </p>
            <p
              className="opacity-80 mt-8"
              style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.7 }}
            >
              不只是工具平台，更是一個社群。每位使用者都有自己的飛行日誌，展示你的 AI Agent、分享你的配置、啟發更多人。
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-3 gap-8">
          <div className="stagger-child stagger-3">
            <span
              className="font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent block"
              style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
            >
              $300B
            </span>
            <p className="mt-2 opacity-60" style={{ fontSize: 'clamp(13px, 1vw, 18px)', lineHeight: 1.5 }}>
              2027 AI Agent 市場規模
            </p>
          </div>
          <div className="stagger-child stagger-4">
            <span
              className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block"
              style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
            >
              87%
            </span>
            <p className="mt-2 opacity-60" style={{ fontSize: 'clamp(13px, 1vw, 18px)', lineHeight: 1.5 }}>
              想用 AI 但不知如何開始
            </p>
          </div>
          <div className="stagger-child stagger-5">
            <span
              className="font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent block"
              style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
            >
              5 min
            </span>
            <p className="mt-2 opacity-60" style={{ fontSize: 'clamp(13px, 1vw, 18px)', lineHeight: 1.5 }}>
              用 CanFly 從零到起飛
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
