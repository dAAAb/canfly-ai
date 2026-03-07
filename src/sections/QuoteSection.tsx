import { useFadeIn } from '../hooks/useFadeIn'
import { useVideoBackground } from '../hooks/useVideoBackground'

export default function QuoteSection() {
  const ref = useFadeIn()
  const videoRef = useVideoBackground(
    'https://stream.mux.com/4IMYGcL01xjs7ek5ANO17JC4VQVUTsojZlnw4fXzwSxc.m3u8'
  )

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/60" />

      <div ref={ref} className="fade-section relative z-10 text-center px-[10%] py-40 max-w-5xl mx-auto">
        <blockquote
          className="font-bold stagger-child stagger-1"
          style={{
            fontSize: 'clamp(28px, 5vw, 80px)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          <span className="opacity-30">&ldquo;</span>
          AI 不會取代你，
          <br />
          但擁有 AI 的人會。
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            現在，你也能飛。
          </span>
          <span className="opacity-30">&rdquo;</span>
        </blockquote>

        <p
          className="mt-12 opacity-50 stagger-child stagger-2"
          style={{ fontSize: 'clamp(14px, 1.2vw, 20px)' }}
        >
          🦞 CanFly.ai
        </p>
      </div>
    </section>
  )
}
