import VideoBackground from '../components/VideoBackground'
import GlassCard from '../components/GlassCard'
import { Mail, Send } from 'lucide-react'

export default function OutroSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <VideoBackground
        src="https://stream.mux.com/00qQnfNo7sSpn3pB1hYKkyeSDvxs01NxiQ3sr29uL3e028.m3u8"
        overlay={0.55}
      />

      <div className="relative z-10 flex flex-col h-full px-[5.2%] pt-[4%] pb-[3%]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-tight" style={{ fontSize: 'clamp(16px, 1.5vw, 28px)' }}>
            ✈️ CanFly.ai
          </span>
          <span style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.8 }}>
            Stay Tuned
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center">
          <h2
            className="font-bold"
            style={{ fontSize: 'clamp(28px, 5vw, 80px)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
          >
            準備好了嗎？
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              即將起飛。
            </span>
          </h2>

          <p
            className="mt-[2%]"
            style={{ fontSize: 'clamp(14px, 1.3vw, 24px)', opacity: 0.9, maxWidth: '45%', lineHeight: 1.5 }}
          >
            CanFly.ai 正在打造 AI Agent 時代最友善的入門平台。
            從免費體驗到專業配置，我們幫你從地面到雲端。
          </p>

          {/* CTA Cards */}
          <div className="flex gap-[2%] mt-[3%]" style={{ maxWidth: '60%' }}>
            <GlassCard className="flex-1">
              <div className="flex items-center gap-3" style={{ padding: 'clamp(12px, 2vw, 32px)' }}>
                <Mail style={{ width: 'clamp(20px, 2vw, 32px)', height: 'clamp(20px, 2vw, 32px)' }} strokeWidth={1.5} />
                <div>
                  <p className="font-semibold" style={{ fontSize: 'clamp(13px, 1.2vw, 22px)' }}>
                    聯繫我們
                  </p>
                  <p style={{ fontSize: 'clamp(11px, 1vw, 18px)', opacity: 0.7 }}>
                    hello@canfly.ai
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="flex-1">
              <div className="flex items-center gap-3" style={{ padding: 'clamp(12px, 2vw, 32px)' }}>
                <Send style={{ width: 'clamp(20px, 2vw, 32px)', height: 'clamp(20px, 2vw, 32px)' }} strokeWidth={1.5} />
                <div>
                  <p className="font-semibold" style={{ fontSize: 'clamp(13px, 1.2vw, 22px)' }}>
                    關注動態
                  </p>
                  <p style={{ fontSize: 'clamp(11px, 1vw, 18px)', opacity: 0.7 }}>
                    @dAAAb
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Tagline */}
          <p
            className="mt-[4%] font-medium tracking-wide"
            style={{ fontSize: 'clamp(12px, 1.1vw, 20px)', opacity: 0.5 }}
          >
            有了 AI，你也能飛。 ✈️
          </p>
        </div>
      </div>
    </div>
  )
}
