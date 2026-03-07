import { useFadeIn } from '../hooks/useFadeIn'
import { Mail } from 'lucide-react'

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function CTASection() {
  const ref = useFadeIn()

  return (
    <section className="relative py-40 md:py-56 px-[8%]">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      <div ref={ref} className="fade-section relative z-10 max-w-4xl mx-auto text-center">
        <h2
          className="font-bold stagger-child stagger-1"
          style={{
            fontSize: 'clamp(36px, 6vw, 96px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
          }}
        >
          準備好了嗎？
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
            即將起飛。
          </span>
        </h2>

        <p
          className="mt-10 mx-auto opacity-70 stagger-child stagger-2"
          style={{
            fontSize: 'clamp(16px, 1.5vw, 24px)',
            lineHeight: 1.7,
            maxWidth: '560px',
          }}
        >
          CanFly.ai 正在打造 AI Agent 時代最友善的入門平台。
          <br />
          從免費體驗到專業配置，我們幫你從地面到雲端。
        </p>

        {/* CTA buttons */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 stagger-child stagger-3">
          <a
            href="mailto:hello@canfly.ai"
            className="group inline-flex items-center gap-4 rounded-2xl no-underline text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              padding: 'clamp(16px, 2vw, 24px) clamp(28px, 3vw, 44px)',
            }}
          >
            <Mail className="w-5 h-5 opacity-70 flex-shrink-0" />
            <span style={{ fontSize: 'clamp(15px, 1.2vw, 20px)' }}>hello@canfly.ai</span>
          </a>

          <a
            href="https://x.com/dAAAb"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-4 rounded-2xl no-underline text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              padding: 'clamp(16px, 2vw, 24px) clamp(28px, 3vw, 44px)',
            }}
          >
            <XIcon />
            <span style={{ fontSize: 'clamp(15px, 1.2vw, 20px)' }}>Follow @dAAAb</span>
          </a>
        </div>
      </div>
    </section>
  )
}
