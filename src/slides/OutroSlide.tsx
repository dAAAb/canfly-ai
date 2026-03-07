import VideoBackground from '../components/VideoBackground'
import GlassCard from '../components/GlassCard'
import { Mail } from 'lucide-react'

function XIcon({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="white" style={{ width: size, height: size }}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function OutroSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <VideoBackground
        src="https://stream.mux.com/00qQnfNo7sSpn3pB1hYKkyeSDvxs01NxiQ3sr29uL3e028.m3u8"
        overlay={0.55}
      />

      <div className="relative z-10 flex flex-col h-full px-[8%] pt-[6%] pb-[5%]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-tight" style={{ fontSize: 'clamp(16px, 1.5vw, 28px)' }}>
            🦞 Canfly
          </span>
          <span style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.8 }}>
            Stay Tuned
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center">
          <h2
            className="font-bold"
            style={{ fontSize: 'clamp(28px, 5vw, 80px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            準備好了嗎？
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              即將起飛。
            </span>
          </h2>

          <p
            className="mt-[3%]"
            style={{ fontSize: 'clamp(14px, 1.3vw, 24px)', opacity: 0.9, maxWidth: '45%', lineHeight: 1.7 }}
          >
            Canfly 正在打造 AI Agent 時代最友善的入門平台。
            從免費體驗到專業配置，我們幫你從地面到雲端。
          </p>

          {/* CTA Cards */}
          <div className="flex gap-[3%] mt-[4%]" style={{ maxWidth: '55%' }}>
            <GlassCard className="flex-1">
              <a href="mailto:hello@canfly.ai" className="flex items-center gap-4 no-underline text-white" style={{ padding: 'clamp(16px, 2.5vw, 36px)' }}>
                <Mail style={{ width: 'clamp(20px, 2vw, 32px)', height: 'clamp(20px, 2vw, 32px)', flexShrink: 0 }} strokeWidth={1.5} />
                <div>
                  <p className="font-semibold" style={{ fontSize: 'clamp(13px, 1.2vw, 22px)', lineHeight: 1.3 }}>
                    聯繫我們
                  </p>
                  <p style={{ fontSize: 'clamp(11px, 1vw, 18px)', opacity: 0.7, lineHeight: 1.5 }}>
                    hello@canfly.ai
                  </p>
                </div>
              </a>
            </GlassCard>

            <GlassCard className="flex-1">
              <a href="https://x.com/dAAAb" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 no-underline text-white" style={{ padding: 'clamp(16px, 2.5vw, 36px)' }}>
                <XIcon size="clamp(20px, 2vw, 32px)" />
                <div>
                  <p className="font-semibold" style={{ fontSize: 'clamp(13px, 1.2vw, 22px)', lineHeight: 1.3 }}>
                    關注動態
                  </p>
                  <p style={{ fontSize: 'clamp(11px, 1vw, 18px)', opacity: 0.7, lineHeight: 1.5 }}>
                    @dAAAb
                  </p>
                </div>
              </a>
            </GlassCard>
          </div>

          {/* Tagline */}
          <p
            className="mt-[5%] font-medium tracking-wide"
            style={{ fontSize: 'clamp(12px, 1.1vw, 20px)', opacity: 0.5 }}
          >
            有了小龍蝦 AI，你也能飛 🦞
          </p>
        </div>
      </div>
    </div>
  )
}
