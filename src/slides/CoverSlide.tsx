import VideoBackground from '../components/VideoBackground'

export default function CoverSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <VideoBackground
        src="https://stream.mux.com/JNJEOYI6B3EffB9f5ZhpGbuxzc6gSyJcXaCBbCgZKRg.m3u8"
        overlay={0.5}
      />

      <div className="relative z-10 flex flex-col h-full px-[8%] pt-[6%] pb-[5%]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className="font-bold tracking-tight"
            style={{ fontSize: 'clamp(16px, 1.5vw, 28px)' }}
          >
            🦞 CanFly.ai
          </span>
          <span style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.8 }}>
            Coming Soon
          </span>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center" style={{ marginTop: '-3%' }}>
          <h1
            className="text-center font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(36px, 7vw, 120px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            Now You Can
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              Fly.
            </span>
          </h1>

          <p
            className="text-center mt-[2.5%]"
            style={{ fontSize: 'clamp(16px, 2vw, 40px)', opacity: 0.9, lineHeight: 1.4 }}
          >
            AI Agent 時代的起飛平台
          </p>
        </div>

        {/* Footer */}
        <div className="text-center" style={{ fontSize: 'clamp(12px, 1.05vw, 20px)', opacity: 0.5 }}>
          有了小龍蝦 AI，你也能飛 🦞
        </div>
      </div>
    </div>
  )
}
