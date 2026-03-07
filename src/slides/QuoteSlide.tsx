import VideoBackground from '../components/VideoBackground'

export default function QuoteSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <VideoBackground
        src="https://stream.mux.com/4IMYGcL01xjs7ek5ANO17JC4VQVUTsojZlnw4fXzwSxc.m3u8"
        overlay={0.55}
      />

      <div className="relative z-10 flex items-center justify-center h-full px-[10%]">
        <div className="text-center" style={{ maxWidth: '75%' }}>
          <blockquote
            className="font-bold"
            style={{
              fontSize: 'clamp(24px, 4.5vw, 72px)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            <span className="opacity-40">&ldquo;</span>
            AI 不會取代你，
            <br />
            但擁有 AI 的人會。
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              現在，你也能飛。
            </span>
            <span className="opacity-40">&rdquo;</span>
          </blockquote>
          <p className="mt-[4%]" style={{ fontSize: 'clamp(13px, 1.2vw, 22px)', opacity: 0.6 }}>
            🦞 CanFly.ai
          </p>
        </div>
      </div>
    </div>
  )
}
