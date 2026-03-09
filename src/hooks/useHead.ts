import { useEffect } from 'react'

const SITE_ORIGIN = 'https://canfly.ai'
const LANG_PREFIXES = ['/zh-tw', '/zh-cn']
const HREFLANG_MAP: { hreflang: string; prefix: string }[] = [
  { hreflang: 'en', prefix: '' },
  { hreflang: 'zh-Hant', prefix: '/zh-tw' },
  { hreflang: 'zh-Hans', prefix: '/zh-cn' },
]

/** Extract the language-neutral base path from a canonical URL. */
function basePathFromCanonical(canonical: string): string {
  let path = canonical.replace(SITE_ORIGIN, '')
  for (const prefix of LANG_PREFIXES) {
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length) || '/'
      break
    }
  }
  return path
}

interface HeadProps {
  title?: string
  description?: string
  ogImage?: string
  canonical?: string
  ogType?: string
}

export function useHead({ title, description, ogImage, canonical, ogType }: HeadProps) {
  useEffect(() => {
    if (title) {
      document.title = title
    }

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.content = content
    }

    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
    if (title) {
      setMeta('property', 'og:title', title)
      setMeta('name', 'twitter:title', title)
    }
    if (ogImage) {
      setMeta('property', 'og:image', ogImage)
      setMeta('name', 'twitter:image', ogImage)
    }
    if (canonical) {
      setMeta('property', 'og:url', canonical)
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = canonical
    }
    if (ogType) {
      setMeta('property', 'og:type', ogType)
    }
    setMeta('name', 'twitter:card', 'summary_large_image')

    // --- hreflang alternate links ---
    // Remove any existing hreflang links (both static from index.html and from prior renders)
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove())

    if (canonical) {
      const basePath = basePathFromCanonical(canonical)
      const created: HTMLLinkElement[] = []

      for (const { hreflang, prefix } of HREFLANG_MAP) {
        const link = document.createElement('link')
        link.rel = 'alternate'
        link.hreflang = hreflang
        link.href = `${SITE_ORIGIN}${prefix}${basePath === '/' ? '' : basePath}`
        document.head.appendChild(link)
        created.push(link)
      }

      // x-default points to English
      const xDefault = document.createElement('link')
      xDefault.rel = 'alternate'
      xDefault.hreflang = 'x-default'
      xDefault.href = `${SITE_ORIGIN}${basePath === '/' ? '' : basePath}`
      document.head.appendChild(xDefault)
      created.push(xDefault)
    }

    return () => {
      if (title) document.title = 'CanFly — OpenClaw AI Agent | Now You Can Fly'
    }
  }, [title, description, ogImage, canonical, ogType])
}
