import { useRef, useState, useEffect } from 'react'

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

  // Apply track modes AFTER render (React re-creates <track> elements on re-render)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const applyModes = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i]
        track.mode = track.language === activeTrack ? 'showing' : 'disabled'
      }
    }

    // Apply immediately
    applyModes()

    // Also apply when tracks load (they may not be ready on first render)
    const onTrackChange = () => applyModes()
    video.textTracks.addEventListener('change', onTrackChange)

    return () => {
      video.textTracks.removeEventListener('change', onTrackChange)
    }
  }, [activeTrack])

  return (
    <div className="rounded-xl overflow-hidden bg-gray-900">
      <style>{`
        video::cue {
          font-size: clamp(10px, 1.8vw, 16px);
          line-height: 1.3;
          background: rgba(0,0,0,0.75);
          color: white;
          padding: 1px 4px;
        }
      `}</style>
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
            onClick={() => setActiveTrack(null)}
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
              onClick={() => setActiveTrack(sub.srclang)}
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
