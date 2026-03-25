/**
 * SmartAvatar — Avatar with automatic fallback chain:
 * 1. Custom upload (avatarUrl)
 * 2. ENS/Basename avatar (via ensdata.net)
 * 3. Gravatar (via email hash)
 * 4. Wallet gradient with emoji
 */
import { useState, useEffect, useMemo } from 'react'
import { walletGradient } from '../utils/walletGradient'

interface SmartAvatarProps {
  avatarUrl?: string | null
  walletAddress?: string | null
  basename?: string | null   // e.g. "daaaaab.base.eth" or "nick.eth"
  email?: string | null
  name?: string              // display name for alt text
  size?: number              // px, default 112 (w-28)
  className?: string
  emoji?: string             // fallback emoji, default 👤
  border?: string            // border class, default "border-4 border-black"
  editable?: boolean
  onUpload?: (file: File) => void
}

function sha256Hex(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str)
  return crypto.subtle.digest('SHA-256', buf).then((hash) => {
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  })
}

export default function SmartAvatar({
  avatarUrl,
  walletAddress,
  basename,
  email,
  name,
  size = 112,
  className = '',
  emoji = '👤',
  border = 'border-4 border-black',
  editable = false,
  onUpload,
}: SmartAvatarProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(avatarUrl || null)
  const [triedSources, setTriedSources] = useState<Set<string>>(new Set())

  const sizeClass = `w-[${size}px] h-[${size}px]`
  const sizePx = { width: size, height: size }

  // Build fallback chain
  useEffect(() => {
    let cancelled = false

    async function resolve() {
      // 1. Custom upload
      if (avatarUrl) {
        setResolvedUrl(avatarUrl)
        return
      }

      // 2. ENS/Basename avatar
      if (basename && !triedSources.has('ens')) {
        try {
          const ensUrl = `https://ensdata.net/media/avatar/${basename}`
          const res = await fetch(ensUrl, { method: 'HEAD' })
          if (!cancelled && res.ok) {
            setResolvedUrl(ensUrl)
            return
          }
        } catch { /* CORS or network error — skip silently */ }
        if (!cancelled) setTriedSources((s) => new Set(s).add('ens'))
      }

      // 3. Gravatar
      if (email && !triedSources.has('gravatar')) {
        try {
          const hash = await sha256Hex(email.trim().toLowerCase())
          const gravatarUrl = `https://gravatar.com/avatar/${hash}?d=404&s=${size}`
          const ok = await testImage(gravatarUrl)
          if (!cancelled && ok) {
            setResolvedUrl(gravatarUrl)
            return
          }
        } catch { /* skip */ }
        if (!cancelled) setTriedSources((s) => new Set(s).add('gravatar'))
      }

      // 4. No image — will show gradient fallback
      if (!cancelled) setResolvedUrl(null)
    }

    resolve()
    return () => { cancelled = true }
  }, [avatarUrl, basename, email, walletAddress, size, triedSources])

  const gradient = useMemo(
    () => walletGradient(walletAddress),
    [walletAddress]
  )

  const handleError = () => {
    // Current image broke, try next source
    setResolvedUrl(null)
    if (avatarUrl) setTriedSources((s) => new Set(s).add('custom'))
  }

  const content = resolvedUrl ? (
    <img
      src={resolvedUrl}
      alt={name || 'Avatar'}
      style={sizePx}
      className={`rounded-full ${border} object-cover ${className}`}
      onError={handleError}
    />
  ) : (
    <div
      style={{ ...sizePx, background: gradient }}
      className={`rounded-full ${border} flex items-center justify-center ${className}`}
    >
      <span style={{ fontSize: size * 0.35 }}>{emoji}</span>
    </div>
  )

  if (editable && onUpload) {
    const inputId = `avatar-upload-${name || 'default'}`
    return (
      <div className="relative group" style={sizePx}>
        {content}
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          id={inputId}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > 5 * 1024 * 1024) {
              alert('File too large (max 5MB)')
              return
            }
            onUpload(file)
          }}
        />
        <label
          htmlFor={inputId}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </label>
      </div>
    )
  }

  return content
}

/** Test if an image URL loads successfully */
function testImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    // Timeout after 3s
    const timer = setTimeout(() => {
      img.src = ''
      resolve(false)
    }, 3000)
    img.onload = () => { clearTimeout(timer); resolve(true) }
    img.onerror = () => { clearTimeout(timer); resolve(false) }
    img.src = url
  })
}
