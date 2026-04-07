/**
 * ResultPreview — Multimedia result preview component (CAN-289, CAN-290).
 *
 * Auto-detects content type from result_content_type or URL extension,
 * then renders the appropriate preview: image, video, audio, markdown,
 * 3D model, PDF, code, or a fallback download card.
 */
import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Image, Film, Music, FileText, Download, AlertCircle, Loader2, Maximize2, X,
  Box, FileCode, Copy, Check,
} from 'lucide-react'

/* ───── MIME / extension detection ───── */

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
  md: 'text/markdown',
  // 3D models
  gltf: 'model/gltf+json', glb: 'model/gltf-binary',
  // PDF
  pdf: 'application/pdf',
  // Code
  js: 'text/javascript', jsx: 'text/javascript',
  ts: 'text/typescript', tsx: 'text/typescript',
  py: 'text/x-python', rs: 'text/x-rust', go: 'text/x-go',
  sol: 'text/x-solidity', json: 'application/json',
  yaml: 'text/yaml', yml: 'text/yaml', toml: 'text/toml', sh: 'text/x-sh',
}

/** Map file extensions to shiki language IDs */
const EXT_TO_LANG: Record<string, string> = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', rs: 'rust', go: 'go', sol: 'solidity',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', sh: 'bash',
}

function extFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url, 'https://x').pathname
    const dot = pathname.lastIndexOf('.')
    if (dot === -1) return null
    return pathname.slice(dot + 1).toLowerCase()
  } catch {
    return null
  }
}

type MediaCategory = 'image' | 'video' | 'audio' | 'markdown' | 'model' | 'pdf' | 'code' | 'unknown'

const CODE_MIMES = new Set([
  'text/javascript', 'text/typescript', 'text/x-python', 'text/x-rust',
  'text/x-go', 'text/x-solidity', 'application/json', 'text/yaml',
  'text/toml', 'text/x-sh',
])

function categorise(contentType: string | null, url: string): MediaCategory {
  // 1. Use content type if available
  if (contentType) {
    const ct = contentType.toLowerCase()
    if (ct.startsWith('image/')) return 'image'
    if (ct.startsWith('video/')) return 'video'
    if (ct.startsWith('audio/')) return 'audio'
    if (ct.startsWith('model/')) return 'model'
    if (ct === 'application/pdf') return 'pdf'
    if (ct === 'text/markdown' || ct === 'text/x-markdown') return 'markdown'
    if (CODE_MIMES.has(ct)) return 'code'
  }
  // 2. Fallback: extension-based detection
  const ext = extFromUrl(url)
  if (ext) {
    const mime = EXT_TO_MIME[ext]
    if (mime) {
      if (mime.startsWith('image/')) return 'image'
      if (mime.startsWith('video/')) return 'video'
      if (mime.startsWith('audio/')) return 'audio'
      if (mime.startsWith('model/')) return 'model'
      if (mime === 'application/pdf') return 'pdf'
      if (mime.startsWith('text/markdown')) return 'markdown'
      if (CODE_MIMES.has(mime)) return 'code'
    }
  }
  return 'unknown'
}

/* ───── Sub-renderers ───── */

function ImagePreview({ url }: { url: string }) {
  const { t } = useTranslation()
  const [error, setError] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  if (error) return <ErrorFallback url={url} />

  return (
    <>
      <div className="flex justify-center p-4 cursor-pointer" onClick={() => setLightbox(true)}>
        <div className="relative group">
          <img
            src={url}
            alt={t('resultPreview.imageAlt', 'Task result')}
            className="max-w-full max-h-[500px] rounded-2xl object-contain"
            onError={() => setError(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-2xl">
            <Maximize2 className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={url}
            alt={t('resultPreview.imageAlt', 'Task result')}
            className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  )
}

function VideoPreview({ url }: { url: string }) {
  const [error, setError] = useState(false)
  if (error) return <ErrorFallback url={url} />

  return (
    <div className="p-4">
      <video
        src={url}
        controls
        className="w-full max-h-[500px] rounded-2xl bg-black"
        onError={() => setError(true)}
      />
    </div>
  )
}

function AudioPreview({ url }: { url: string }) {
  const [error, setError] = useState(false)
  if (error) return <ErrorFallback url={url} />

  return (
    <div className="p-4">
      <audio
        src={url}
        controls
        className="w-full"
        onError={() => setError(true)}
      />
    </div>
  )
}

function MarkdownPreview({ url }: { url: string }) {
  const { t } = useTranslation()
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (!cancelled) setContent(text)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [url])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('resultPreview.loading', 'Loading...')}
      </div>
    )
  }
  if (error || content === null) return <ErrorFallback url={url} />

  return (
    <div className="p-4">
      <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-gray-200 leading-relaxed">
        {content}
      </div>
    </div>
  )
}

/* ───── Lazy-loaded heavy previews (CAN-290) ───── */

function ModelPreview({ url }: { url: string }) {
  const [error, setError] = useState(false)

  useEffect(() => {
    // Ensure model-viewer custom element is registered
    import('@google/model-viewer').catch(() => setError(true))
  }, [])

  if (error) return <ErrorFallback url={url} />

  return (
    <div className="p-4">
      {/* @ts-expect-error model-viewer is a web component */}
      <model-viewer
        src={url}
        auto-rotate
        camera-controls
        shadow-intensity="1"
        environment-image="neutral"
        style={{ width: '100%', height: '400px', borderRadius: '1rem', background: '#111' }}
        onError={() => setError(true)}
      />
    </div>
  )
}

function PdfPreview({ url }: { url: string }) {
  const { t } = useTranslation()
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div className="p-4">
      <div className="relative rounded-2xl overflow-hidden bg-black" style={{ height: fullscreen ? '80vh' : '500px' }}>
        <iframe
          src={url}
          title="PDF preview"
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts"
        />
        <button
          onClick={() => setFullscreen(f => !f)}
          className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white transition-colors"
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      <div className="mt-2 text-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {t('resultPreview.download', 'Download File')}
        </a>
      </div>
    </div>
  )
}

function CodePreview({ url }: { url: string }) {
  const { t } = useTranslation()
  const [html, setHtml] = useState<string | null>(null)
  const [rawCode, setRawCode] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const ext = extFromUrl(url)
  const lang = (ext && EXT_TO_LANG[ext]) || 'text'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [res, shikiModule] = await Promise.all([
          fetch(url),
          import('shiki'),
        ])
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const code = await res.text()
        if (cancelled) return
        setRawCode(code)
        const highlighter = await shikiModule.createHighlighter({
          themes: ['github-dark'],
          langs: [lang],
        })
        const highlighted = highlighter.codeToHtml(code, { lang, theme: 'github-dark' })
        if (!cancelled) setHtml(highlighted)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [url, lang])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [rawCode])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('resultPreview.loading', 'Loading...')}
      </div>
    )
  }
  if (error || html === null) return <ErrorFallback url={url} />

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
        title="Copy code"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <div
        className="overflow-auto max-h-[500px] text-sm [&_pre]:p-4 [&_pre]:m-0 [&_code]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function ErrorFallback({ url }: { url: string }) {
  const { t } = useTranslation()
  return (
    <div className="p-4 text-center">
      <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
      <p className="text-sm text-gray-400 mb-3">
        {t('resultPreview.loadError', 'Unable to load preview. Please contact the seller.')}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors"
      >
        <Download className="w-4 h-4" />
        {t('resultPreview.download', 'Download File')}
      </a>
    </div>
  )
}

function DownloadCard({ url, contentType }: { url: string; contentType: string | null }) {
  const { t } = useTranslation()
  const filename = extFromUrl(url) ? url.split('/').pop() || 'file' : 'file'

  return (
    <div className="p-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/40 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center shrink-0">
          <Download className="w-6 h-6 text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{filename}</p>
          {contentType && (
            <p className="text-xs text-gray-500">{contentType}</p>
          )}
        </div>
        <span className="text-xs text-blue-400 font-medium shrink-0">
          {t('resultPreview.download', 'Download File')}
        </span>
      </a>
    </div>
  )
}

/* ───── Skeleton loader ───── */

function PreviewSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="w-full h-64 rounded-2xl bg-gray-800" />
    </div>
  )
}

/* ───── Main component ───── */

interface ResultPreviewProps {
  url: string
  contentType: string | null
  loading?: boolean
}

const CATEGORY_ICON: Record<MediaCategory, typeof Image> = {
  image: Image,
  video: Film,
  audio: Music,
  markdown: FileText,
  model: Box,
  pdf: FileText,
  code: FileCode,
  unknown: Download,
}

const CATEGORY_LABEL: Record<MediaCategory, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  markdown: 'Document',
  model: '3D Model',
  pdf: 'PDF',
  code: 'Code',
  unknown: 'File',
}

export default function ResultPreview({ url, contentType, loading }: ResultPreviewProps) {
  const { t } = useTranslation()
  const category = categorise(contentType, url)
  const Icon = CATEGORY_ICON[category]
  const label = CATEGORY_LABEL[category]

  return (
    <div className="rounded-2xl border border-gray-800 overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Icon className="w-4 h-4" />
          {t(`resultPreview.type.${category}`, label)}
        </div>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          title={t('resultPreview.download', 'Download File')}
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      {/* Content */}
      {loading ? (
        <PreviewSkeleton />
      ) : (
        <>
          {category === 'image' && <ImagePreview url={url} />}
          {category === 'video' && <VideoPreview url={url} />}
          {category === 'audio' && <AudioPreview url={url} />}
          {category === 'markdown' && <MarkdownPreview url={url} />}
          {category === 'model' && (
            <Suspense fallback={<PreviewSkeleton />}>
              <ModelPreview url={url} />
            </Suspense>
          )}
          {category === 'pdf' && (
            <Suspense fallback={<PreviewSkeleton />}>
              <PdfPreview url={url} />
            </Suspense>
          )}
          {category === 'code' && (
            <Suspense fallback={<PreviewSkeleton />}>
              <CodePreview url={url} />
            </Suspense>
          )}
          {category === 'unknown' && <DownloadCard url={url} contentType={contentType} />}
        </>
      )}
    </div>
  )
}
