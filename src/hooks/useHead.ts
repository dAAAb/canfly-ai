import { useEffect } from 'react'

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

    return () => {
      if (title) document.title = 'Canfly — Now You Can Fly'
    }
  }, [title, description, ogImage, canonical, ogType])
}
