import VideoBackground from '../components/VideoBackground'

export default function VisionSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <VideoBackground
        src="https://stream.mux.com/Kec29dVyJgiPdtWaQtPuEiiGHkJIYQAVUJcNiIHUYeo.m3u8"
        overlay={0.55}
      />

      <div className="relative z-10 flex flex-col h-full px-[5.2%] pt-[4%] pb-[3%]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-tight" style={{ fontSize: 'clamp(16px, 1.5vw, 28px)' }}>
            ✈️ CanFly.ai
          </span>
          <span style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.8 }}>
            The Vision
          </span>
        </div>

        {/* Title */}
        <h2
          className="mt-[4%] font-bold"
          style={{ fontSize: 'clamp(24px, 4.5vw, 72px)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          Every Person
          <br />
          Deserves an
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> AI Agent</span>
        </h2>

        {/* Three columns */}
        <div className="flex gap-[4%] mt-[3.5%] flex-1 min-h-0">
          {/* Column 1 - Stats */}
          <div className="flex-[0_0_22%] flex flex-col justify-between">
            <p style={{ fontSize: 'clamp(12px, 1.05vw, 18px)', opacity: 0.8, lineHeight: 1.5 }}>
              AI Agent 市場正在爆發。從個人助理到企業自動化，2026 年是人人都能擁有 AI 夥伴的元年。
            </p>
            <div className="mt-auto">
              <span
                className="font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
                style={{ fontSize: 'clamp(28px, 4vw, 64px)' }}
              >
                $300B
              </span>
              <span className="ml-2" style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', opacity: 0.8 }}>
                2027 市場規模
              </span>
            </div>
          </div>

          {/* Column 2 - Description */}
          <div className="flex-[0_0_38%]">
            <p style={{ fontSize: 'clamp(13px, 1.1vw, 20px)', opacity: 0.9, lineHeight: 1.6 }}>
              但現實是：大多數人不知道從哪裡開始。硬體怎麼選？軟體怎麼裝？Agent 怎麼跑？
            </p>
            <p className="mt-[3%]" style={{ fontSize: 'clamp(13px, 1.1vw, 20px)', opacity: 0.9, lineHeight: 1.6 }}>
              CanFly.ai 解決的就是這個問題。我們是 AI Agent 世界的知識嚮導 — 從零開始，帶你起飛。免費體驗、硬體導購、白手套設定，一站搞定。
            </p>
            <p className="mt-[3%]" style={{ fontSize: 'clamp(13px, 1.1vw, 20px)', opacity: 0.9, lineHeight: 1.6 }}>
              不只是工具，是一個社群。每位使用者都有自己的飛行日誌頁面，展示你的 AI Agent、分享你的配置、啟發更多人起飛。
            </p>
          </div>

          {/* Column 3 - Stat + Graph */}
          <div className="flex-[0_0_20%] flex flex-col">
            <span
              className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
              style={{ fontSize: 'clamp(28px, 4vw, 64px)' }}
            >
              87%
            </span>
            <p className="mt-1" style={{ fontSize: 'clamp(12px, 1vw, 18px)', opacity: 0.8, lineHeight: 1.5 }}>
              的人想用 AI 但不知道如何開始
            </p>
            {/* Mini graph */}
            <svg className="mt-auto w-full" viewBox="0 0 200 80" style={{ maxHeight: '30%' }}>
              <defs>
                <linearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,70 Q40,65 80,50 T160,20 L200,10 L200,80 L0,80 Z" fill="url(#graphGrad)" />
              <path d="M0,70 Q40,65 80,50 T160,20 L200,10" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="0" cy="70" r="4" fill="#a855f7" stroke="white" strokeWidth="2" />
              <circle cx="200" cy="10" r="4" fill="#22d3ee" stroke="white" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="text-right" style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.6 }}>
          The Vision
        </div>
      </div>
    </div>
  )
}
