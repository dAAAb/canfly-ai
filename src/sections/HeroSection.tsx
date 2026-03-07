import { useVideoBackground } from '../hooks/useVideoBackground'

export default function HeroSection() {
  const videoRef = useVideoBackground(
    'https://stream.mux.com/JNJEOYI6B3EffB9f5ZhpGbuxzc6gSyJcXaCBbCgZKRg.m3u8'
  )

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between py-10" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
        <span className="font-bold text-xl tracking-tight">🦞 CanFly.ai</span>
        <span className="text-sm opacity-60">Coming Soon</span>
      </nav>

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
        <h1
          className="font-black tracking-tight"
          style={{
            fontSize: 'clamp(48px, 10vw, 140px)',
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
          }}
        >
          Now You Can
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
            Fly.
          </span>
        </h1>

        <p
          className="mt-10 mx-auto opacity-80"
          style={{
            fontSize: 'clamp(18px, 2.5vw, 32px)',
            lineHeight: 1.5,
            maxWidth: '600px',
          }}
        >
          有了 AI，你也能飛。
          <br />
          AI Agent 時代的起飛平台。
        </p>

        {/* Scroll indicator */}
        <div className="mt-20 flex flex-col items-center opacity-40 animate-bounce">
          <span className="text-xs tracking-widest uppercase mb-2">Scroll</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>
    </section>
  )
}
