import { useVideoBackground } from '../hooks/useVideoBackground'

interface VideoBackgroundProps {
  src: string
  overlay?: number
}

export default function VideoBackground({ src, overlay = 0.4 }: VideoBackgroundProps) {
  const videoRef = useVideoBackground(src)

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${overlay})` }}
      />
    </>
  )
}
