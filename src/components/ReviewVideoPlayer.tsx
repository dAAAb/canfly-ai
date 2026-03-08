import { useRef, useState } from 'react'

interface SubtitleTrack {
  label: string
  srclang: string
  src: string
}

interface ReviewVideoPlayerProps {
  src: string
  poster?: string
  subtitles?: SubtitleTrack[]
}

export default function ReviewVideoPlayer({ src, poster, subtitles = [] }: ReviewVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeTrack, setActiveTrack] = useState<string | null>(null)

  const handleTrackChange = (srclang: string | null) => {
    const video = videoRef.current
    if (!video) return

    setActiveTrack(srclang)

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i]
      track.mode = track.language === srclang ? 'showing' : 'hidden'
    }
  }

  return (
    <div className="rounded-xl overflow-hidden bg-gray-900">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        playsInline
        className="w-full aspect-video"
        crossOrigin="anonymous"
      >
        {subtitles.map((sub) => (
          <track
            key={sub.srclang}
            kind="subtitles"
            label={sub.label}
            srcLang={sub.srclang}
            src={sub.src}
          />
        ))}
      </video>

      {subtitles.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/80">
          <span className="text-xs text-gray-400 mr-1">CC</span>
          <button
            onClick={() => handleTrackChange(null)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeTrack === null
                ? 'bg-white/20 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Off
          </button>
          {subtitles.map((sub) => (
            <button
              key={sub.srclang}
              onClick={() => handleTrackChange(sub.srclang)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeTrack === sub.srclang
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
