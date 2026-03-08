import { useEffect, useRef } from 'react'

export function useVideoBackground(src: string) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: { destroy(): void } | null = null

    // Dynamic import hls.js only when needed
    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        const instance = new Hls({ enableWorker: true })
        hls = instance
        instance.loadSource(src)
        instance.attachMedia(video)
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {})
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(() => {})
        })
      }
    })

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [src])

  return videoRef
}
