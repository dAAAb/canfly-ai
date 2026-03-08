/**
 * Cloudflare Pages Function middleware — injects per-page OG meta tags
 * for social-media crawlers (Facebook, Twitter/X, LinkedIn, etc.).
 *
 * Normal users get the SPA as-is; bots get rewritten HTML with correct
 * og:title / og:description / og:url so link previews look right.
 */

const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Applebot|Pinterest|Embedly|Quora Link Preview|vkShare|W3C_Validator/i

interface OgMeta {
  title: string
  description: string
  ogType?: string
}

// Route → OG metadata (English defaults; covers all static pages)
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

/** Strip /:lang prefix from path to match against ROUTE_META keys */
function stripLangPrefix(path: string): string {
  const match = path.match(/^\/(zh-tw|zh-cn)(\/.*)?$/)
  if (match) return match[2] || '/'
  return path
}

export const onRequest: PagesFunction = async (context) => {
  const ua = context.request.headers.get('user-agent') || ''

  // Only intercept for social crawlers
  if (!BOT_UA.test(ua)) {
    return context.next()
  }

  const response = await context.next()

  // Only rewrite HTML responses
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const url = new URL(context.request.url)
  const strippedPath = stripLangPrefix(url.pathname)
  const meta = ROUTE_META[strippedPath]

  if (!meta) {
    return response
  }

  const ogUrl = `https://canfly.ai${url.pathname}`
  const ogType = meta.ogType || 'website'

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
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', ogUrl)
      },
    })
    .transform(response)
}
