/**
 * Cloudflare Pages Function middleware — injects per-page OG meta tags
 * for social-media crawlers (Facebook, Twitter/X, LinkedIn, etc.).
 *
 * Normal users get the SPA as-is; bots get rewritten HTML with correct
 * og:title / og:description / og:image / og:url so link previews look right.
 *
 * Covers static pages, dynamic product pages (/apps/:slug), and blog posts
 * (/blog/:slug). Language-prefixed URLs (/:lang/...) are normalised before
 * lookup so every locale gets the same preview metadata.
 */

const SITE = 'https://canfly.ai'
const DEFAULT_OG_IMAGE = `${SITE}/og-image.png`

const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Applebot|Pinterest|Embedly|Quora Link Preview|vkShare|W3C_Validator/i

interface OgMeta {
  title: string
  description: string
  ogType?: string
  ogImage?: string // absolute URL or site-relative path
}

// ── Static route metadata ──────────────────────────────────────────────
// ogImage is omitted for static pages → resolves to DEFAULT_OG_IMAGE.
// When CMO creates per-page images, add them to public/og/ and set the
// path here (e.g. ogImage: `${SITE}/og/home.png`).
const ROUTE_META: Record<string, OgMeta> = {
  '/': {
    title: 'CanFly — Your Own AI Agent in 5 Minutes',
    description:
      'The launchpad for the AI Agent era. Free to start, knowledge-driven, white-glove service.',
  },
  '/apps': {
    title: 'CanFly Apps — AI Tools & Recommendations',
    description:
      'Discover the best AI tools for your workflow. From local LLMs to cloud deployment, find the right tool for you.',
  },
  '/apps/free': {
    title: 'Free AI Tools — CanFly',
    description:
      'Free tools to get started with AI. No credit card, no subscription — just download and go.',
  },
  '/apps/vm': {
    title: 'Virtual Machines for AI — CanFly',
    description:
      'Run Linux VMs on your Mac for safe AI experimentation. One-click setup, zero risk.',
  },
  '/apps/skills': {
    title: 'AI Skills & Integrations — CanFly',
    description:
      'Voice synthesis, video generation, web search, email — extend your AI agent with powerful skills.',
  },
  '/apps/hosting': {
    title: 'Cloud Hosting for AI — CanFly',
    description:
      'Deploy your AI agents to the cloud with one click. Always-on, always available.',
  },
  '/apps/hardware': {
    title: 'AI Hardware Recommendations — CanFly',
    description:
      'From $80 Raspberry Pi to Mac Mini M4 — find the perfect hardware for running local AI.',
  },
  '/pricing': {
    title: 'Pricing — CanFly',
    description:
      'Start free, upgrade when ready. Run your own AI Agent at zero cost.',
  },
  '/community': {
    title: 'Community — CanFly',
    description:
      'See what others are building with CanFly. Real setups from the community.',
  },
  '/checkout': {
    title: 'White-Glove Setup — CanFly',
    description:
      "Let our team set up your AI environment. Sit back, relax — we'll handle everything.",
  },
  '/get-started': {
    title: 'Get Started — CanFly',
    description:
      'Choose your path to running your own AI Agent. Beginner-friendly guides from zero to flying in 5 minutes.',
  },
  '/blog': {
    title: 'Blog — CanFly',
    description:
      'Guides, tutorials, and insights on running your own AI agents.',
  },
  '/learn/ollama-openclaw': {
    title: 'Free Local AI in 5 Minutes — Ollama Tutorial',
    description:
      'Set up a free, private AI on your own machine with Ollama. No cloud, no cost.',
    ogType: 'article',
  },
  '/learn/zeabur-deploy': {
    title: 'Deploy AI to the Cloud — Zeabur Tutorial',
    description:
      'Deploy your AI agents to the cloud with Zeabur in minutes.',
    ogType: 'article',
  },
  '/learn/elevenlabs-integration': {
    title: 'AI Voice Synthesis — ElevenLabs Tutorial',
    description:
      'Add natural voice synthesis to your AI with ElevenLabs.',
    ogType: 'article',
  },
  '/learn/heygen-video': {
    title: 'AI Video Generation — HeyGen Tutorial',
    description:
      'Create AI-powered videos with HeyGen for content and marketing.',
    ogType: 'article',
  },
  '/learn/hardware-compare': {
    title: 'AI Hardware Buying Guide — CanFly',
    description:
      'Compare hardware options for running local AI. Find the right setup for your budget.',
    ogType: 'article',
  },
}

// ── Dynamic product metadata (keyed by product slug / id) ──────────────
const PRODUCT_META: Record<string, OgMeta> = {
  ollama: {
    title: 'Ollama — Free Local AI Models | CanFly',
    description:
      'Run powerful AI models locally without API keys or internet. Privacy-focused, free, and easy.',
    ogImage: `${SITE}/images/icons/ollama.png`,
  },
  zeabur: {
    title: 'Zeabur — One-Click Cloud Deployment | CanFly',
    description:
      'Deploy AI agents to the cloud with zero configuration. Get started in minutes.',
    ogImage: `${SITE}/images/icons/zeabur.png`,
  },
  elevenlabs: {
    title: 'ElevenLabs — AI Voice Synthesis | CanFly',
    description:
      'Add realistic voice capabilities to your AI agents with high-quality text-to-speech.',
    ogImage: `${SITE}/images/icons/elevenlabs.png`,
  },
  heygen: {
    title: 'HeyGen — AI Video Generation | CanFly',
    description:
      'Create professional AI-generated videos with digital avatars for content and marketing.',
    ogImage: `${SITE}/images/icons/heygen.png`,
  },
  umbrel: {
    title: 'Umbrel — Self-Hosted Home Server | CanFly',
    description:
      'Run your own personal cloud server at home with complete data sovereignty.',
    ogImage: `${SITE}/images/icons/umbrel.png`,
  },
  pinata: {
    title: 'Pinata — IPFS & Web3 Storage | CanFly',
    description:
      'Decentralised file storage powered by IPFS. Perfect for Web3 apps and permanent data.',
    ogImage: `${SITE}/images/icons/pinata.png`,
  },
  'switchbot-ai-hub': {
    title: 'SwitchBot AI Hub — Smart Home Meets AI | CanFly',
    description:
      'Connect smart home devices with AI. Voice and agent-controlled home automation.',
    ogImage: `${SITE}/images/icons/switchbot-ai-hub.png`,
  },
  perplexity: {
    title: 'Perplexity — AI-Powered Search | CanFly',
    description:
      'AI search engine with direct answers and citations. Free tier available.',
    ogImage: `${SITE}/images/icons/perplexity.png`,
  },
  'even-g2-bridge': {
    title: 'Even Realities G2 Bridge — Smart Glasses AI | CanFly',
    description:
      'Talk to your AI through smart glasses. Voice-to-AI via Cloudflare Worker.',
    ogImage: `${SITE}/images/icons/even-g2.png`,
  },
  'brave-search': {
    title: 'Brave Search API — Free Web Search | CanFly',
    description:
      'Privacy-focused web search API with 2,000 free queries/month. No credit card required.',
    ogImage: `${SITE}/images/icons/brave-search.png`,
  },
  utm: {
    title: 'UTM — Free Virtual Machines for Mac | CanFly',
    description:
      'Run Windows, Linux, or other OSes safely inside your Mac with free, open-source UTM.',
    ogImage: `${SITE}/images/icons/utm.webp`,
  },
  'virtual-buddy': {
    title: 'Virtual Buddy — One-Click Linux VM | CanFly',
    description:
      'The easiest way to get Linux on your Mac. One click and you have a full environment.',
    ogImage: `${SITE}/images/icons/virtual-buddy.png`,
  },
  'mac-mini-m4': {
    title: 'Apple Mac Mini M4 — Compact AI Powerhouse | CanFly',
    description:
      'M4 chip, 16GB unified memory, Thunderbolt 5 — your palm-sized AI workstation.',
    ogImage: `${SITE}/images/products/mac-mini-m4.jpg`,
  },
  'macbook-neo': {
    title: 'Apple MacBook Neo — Most Affordable MacBook | CanFly',
    description:
      "Apple's most affordable laptop. A18 Pro chip, 13\" Liquid Retina — AI-ready out of the box.",
    ogImage: `${SITE}/images/products/macbook-neo.jpg`,
  },
  'hdmi-dummy-plug': {
    title: 'HDMI Dummy Plug — Unlock Full Resolution on Headless Servers | CanFly',
    description:
      'No monitor? No problem. Plug in and unlock full GPU acceleration + crisp remote desktop on your Mac Mini or AI server. Under $10.',
    ogImage: `${SITE}/images/products/hdmi-dummy-plug.jpg`,
  },
  'geekom-a8': {
    title: 'GEEKOM A8 Mini PC — Best for Local AI | CanFly',
    description:
      'AMD Ryzen 7, 32GB DDR5 — handles Ollama and OpenClaw with ease. Compact and quiet.',
    ogImage: `${SITE}/images/products/geekom-a8.jpg`,
  },
  'beelink-ser5-max': {
    title: 'Beelink SER5 MAX — High Value AI Mini PC | CanFly',
    description:
      'AMD Ryzen 7 5800H, 24GB RAM, 1TB SSD — unbeatable price for dedicated AI hardware.',
    ogImage: `${SITE}/images/products/beelink-ser5-max.jpg`,
  },
  'raspberry-pi-5': {
    title: 'Raspberry Pi 5 — Budget AI Learning Kit | CanFly',
    description:
      'The most affordable way to start local AI. Sub-$100 setup with Ollama.',
    ogImage: `${SITE}/images/products/raspberry-pi-5.jpg`,
  },
  'elgato-stream-deck': {
    title: 'Elgato Stream Deck MK.2 — AI Control Panel | CanFly',
    description:
      '15 programmable LCD keys to trigger AI agents and workflows with one tap.',
    ogImage: `${SITE}/images/products/elgato-stream-deck.jpg`,
  },
  'fifine-am8': {
    title: 'Fifine AM8 Microphone — AI Voice Input | CanFly',
    description:
      'Crystal-clear USB microphone with noise cancellation for AI voice commands.',
    ogImage: `${SITE}/images/products/fifine-am8.jpg`,
  },
  basemail: {
    title: 'BaseMail — Crypto-Native Email for AI Agents | CanFly',
    description:
      'Wallet-based email with SIWE auth, ERC-8004 identity, and $ATTN economy. Your wallet is your identity.',
    ogImage: `${SITE}/images/icons/basemail.png`,
  },
  agentmail: {
    title: 'AgentMail — Email Infrastructure for AI Agents | CanFly',
    description:
      'Y Combinator-backed. Create inboxes on the fly, Python/Node SDKs, webhooks, semantic search.',
    ogImage: `${SITE}/images/icons/agentmail.png`,
  },
  agentcard: {
    title: 'AgentCard — Virtual Visa Cards for AI Agents | CanFly',
    description:
      'Prepaid virtual Visa cards with MCP-native integration. Let your agents make purchases autonomously.',
    ogImage: `${SITE}/images/icons/agentcard.png`,
  },
}

// ── Dynamic blog post metadata ─────────────────────────────────────────
const BLOG_META: Record<string, OgMeta> = {
  'local-ai-privacy-2026': {
    title: 'Local AI & Privacy in 2026 — CanFly Blog',
    description:
      'Why running AI locally matters for privacy, and how to get started for free.',
    ogType: 'article',
  },
  'deploy-ai-agent-cloud': {
    title: 'Deploy AI Agents to the Cloud — CanFly Blog',
    description:
      'Step-by-step guide to deploying your AI agents with one-click cloud hosting.',
    ogType: 'article',
  },
  'ai-voice-video-content-creation': {
    title: 'AI Voice & Video Content Creation — CanFly Blog',
    description:
      'How to use AI voice synthesis and video generation for content marketing.',
    ogType: 'article',
  },
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Strip /:lang prefix from path to match against lookup keys */
function stripLangPrefix(path: string): string {
  const match = path.match(/^\/(en|zh-tw|zh-cn)(\/.*)?$/)
  if (match) return match[2] || '/'
  return path
}

/** Resolve OG metadata for any path (static → product → blog → null) */
function resolveMeta(path: string): OgMeta | null {
  // 1. Exact static match
  if (ROUTE_META[path]) return ROUTE_META[path]

  // 2a. Dynamic product page: /apps/:category/:slug (new URL format)
  const productMatch2 = path.match(/^\/apps\/[a-z]+\/([a-z0-9-]+)$/)
  if (productMatch2) {
    const slug = productMatch2[1]
    if (PRODUCT_META[slug]) return PRODUCT_META[slug]
  }

  // 2b. Legacy product page: /apps/:slug (old URL format, still matched for compat)
  const productMatch = path.match(/^\/apps\/([a-z0-9-]+)$/)
  if (productMatch) {
    const slug = productMatch[1]
    // Skip if slug is a category name
    if (!['all', 'free', 'vm', 'skills', 'hosting', 'hardware'].includes(slug) && PRODUCT_META[slug]) {
      return PRODUCT_META[slug]
    }
  }

  // 3. Dynamic blog post: /blog/:slug
  const blogMatch = path.match(/^\/blog\/([a-z0-9-]+)$/)
  if (blogMatch) {
    const slug = blogMatch[1]
    if (BLOG_META[slug]) return BLOG_META[slug]
  }

  return null
}

/** Ensure og:image is an absolute URL */
function resolveOgImage(img: string | undefined): string {
  if (!img) return DEFAULT_OG_IMAGE
  if (img.startsWith('http')) return img
  return `${SITE}${img}`
}

// ── Language auto-detection ─────────────────────────────────────────────

/** Static asset extensions — never redirect these */
const STATIC_EXT = /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|mp4|vtt|srt|json|xml|txt|map)$/i

/** Parse Accept-Language header into sorted [lang, q] pairs */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=')
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
    .map((x) => x.lang)
}

/** Detect preferred language. Returns 'zh-TW' | 'zh-CN' | null (null = English, no redirect) */
function detectLanguage(request: Request): 'zh-TW' | 'zh-CN' | null {
  const acceptLang = request.headers.get('accept-language')

  // 1. Accept-Language header exists → browser language is the ONLY authority
  //    (An English speaker in Taiwan must NOT be redirected to Chinese)
  if (acceptLang) {
    const langs = parseAcceptLanguage(acceptLang)
    for (const lang of langs) {
      if (lang === 'zh-tw' || lang === 'zh-hant' || lang === 'zh-hant-tw') return 'zh-TW'
      if (lang === 'zh-cn' || lang === 'zh-hans' || lang === 'zh-hans-cn' || lang === 'zh-sg') return 'zh-CN'
    }
    // Bare "zh" without region — use IP to disambiguate
    if (langs.some((l) => l === 'zh')) {
      const country = request.headers.get('cf-ipcountry')
      if (country === 'CN' || country === 'SG' || country === 'MY') return 'zh-CN'
      return 'zh-TW'
    }
    // Accept-Language present but no Chinese → user prefers non-Chinese → English
    return null
  }

  // 2. No Accept-Language header at all (rare: some bots, curl, old clients)
  //    Only then fall back to IP geolocation
  const country = request.headers.get('cf-ipcountry')
  if (country === 'TW') return 'zh-TW'
  if (country === 'CN' || country === 'SG' || country === 'MY') return 'zh-CN'

  return null // English — no redirect
}

/** Get cookie value by name */
function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie') || ''
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? match[1] : null
}

const LANG_URL_PREFIX: Record<string, string> = {
  'zh-TW': '/zh-tw',
  'zh-CN': '/zh-cn',
}

// ── Middleware entry point ──────────────────────────────────────────────

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const path = url.pathname
  const ua = context.request.headers.get('user-agent') || ''

  // ── Language auto-redirect (before bot check) ──
  // Only for non-bot, non-static, paths WITHOUT a language prefix
  const hasLangPrefix = path.startsWith('/en') || path.startsWith('/zh-tw') || path.startsWith('/zh-cn')
  const isStatic = STATIC_EXT.test(path)
  const isApi = path.startsWith('/api/')
  const isBot = BOT_UA.test(ua)

  if (!hasLangPrefix && !isStatic && !isApi && !isBot) {
    // If user manually chose a language before, respect it
    const cookieLang = getCookie(context.request, 'canfly_lang')

    if (cookieLang && LANG_URL_PREFIX[cookieLang]) {
      // User previously chose a non-English language — redirect
      const target = `${LANG_URL_PREFIX[cookieLang]}${path === '/' ? '' : path}${url.search}`
      return new Response(null, {
        status: 302,
        headers: { Location: target },
      })
    }

    if (!cookieLang) {
      // First visit — auto-detect
      const detected = detectLanguage(context.request)
      if (detected) {
        const prefix = LANG_URL_PREFIX[detected]
        const target = `${prefix}${path === '/' ? '' : path}${url.search}`
        // Set cookie so we don't redirect again (1 year)
        return new Response(null, {
          status: 302,
          headers: {
            Location: target,
            'Set-Cookie': `canfly_lang=${detected};path=/;max-age=31536000;SameSite=Lax`,
          },
        })
      }
      // Detected English — set cookie so we skip detection next time
      // (Don't redirect, just remember the choice)
    }
  }

  // ── OG meta injection for social crawlers ──
  if (!isBot) {
    return context.next()
  }

  const response = await context.next()

  // Only rewrite HTML responses
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const strippedPath = stripLangPrefix(url.pathname)
  const meta = resolveMeta(strippedPath)

  if (!meta) {
    return response
  }

  const ogUrl = `${SITE}${url.pathname}`
  const ogType = meta.ogType || 'website'
  const ogImage = resolveOgImage(meta.ogImage)

  // Use HTMLRewriter to replace OG meta tags in the response
  return new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(meta.title)
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute('content', meta.title)
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute('content', meta.title)
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute('content', meta.description)
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute('content', meta.description)
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute('content', meta.description)
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute('content', ogUrl)
      },
    })
    .on('meta[property="og:type"]', {
      element(el) {
        el.setAttribute('content', ogType)
      },
    })
    .on('meta[property="og:image"]', {
      element(el) {
        el.setAttribute('content', ogImage)
      },
    })
    .on('meta[name="twitter:image"]', {
      element(el) {
        el.setAttribute('content', ogImage)
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', ogUrl)
      },
    })
    .transform(response)
}
