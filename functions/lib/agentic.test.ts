import { describe, expect, it } from 'vitest'
import {
  crawlerInnerHtml,
  isKnownSpaPath,
  isPassThroughPath,
  markdownForPath,
  negotiateAgentic,
  notFoundResponse,
  problemJson,
  stripLangPrefix,
  wantsMarkdown,
  withVaryAccept,
} from './agentic'

describe('stripLangPrefix', () => {
  it('strips locale prefixes', () => {
    expect(stripLangPrefix('/zh-tw/about')).toBe('/about')
    expect(stripLangPrefix('/en')).toBe('/')
    expect(stripLangPrefix('/apps')).toBe('/apps')
  })
})

describe('isKnownSpaPath', () => {
  it('allows product and community surfaces', () => {
    expect(isKnownSpaPath('/')).toBe(true)
    expect(isKnownSpaPath('/zh-tw/apps/free/ollama')).toBe(true)
    expect(isKnownSpaPath('/u/dAAAb/agent/LittleLobster')).toBe(true)
    expect(isKnownSpaPath('/@dAAAb')).toBe(true)
    expect(isKnownSpaPath('/about')).toBe(true)
  })

  it('rejects unknown probe paths', () => {
    expect(isKnownSpaPath('/some-path-that-does-not-exist')).toBe(false)
    expect(isKnownSpaPath('/zh-tw/not-a-real-page')).toBe(false)
  })
})

describe('wantsMarkdown', () => {
  it('honors Accept: text/markdown', () => {
    expect(wantsMarkdown('text/markdown')).toBe(true)
    expect(wantsMarkdown('text/html')).toBe(false)
    expect(wantsMarkdown('text/markdown, text/html;q=0.8')).toBe(true)
  })
})

describe('markdown pages', () => {
  it('serves 500+ characters on homepage and trust pages', () => {
    for (const path of ['/', '/about', '/contact', '/privacy', '/developers']) {
      const md = markdownForPath(path)
      expect(md, path).toBeTruthy()
      expect(md!.replace(/\s+/g, ' ').length).toBeGreaterThan(500)
    }
  })
})

describe('notFoundResponse', () => {
  it('returns HTTP 404 with agent pointers', async () => {
    const res = notFoundResponse('text/markdown')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toMatch(/markdown/)
    const text = await res.text()
    expect(text).toContain('llms.txt')
    expect(text).toContain('sitemap.xml')
  })
})

describe('negotiateAgentic', () => {
  it('returns HTTP 404 for unknown paths', async () => {
    const res = negotiateAgentic('/some-path-that-does-not-exist', '*/*')
    expect(res).toBeTruthy()
    expect(res!.status).toBe(404)
    expect(await res!.text()).toContain('llms.txt')
  })

  it('serves markdown with Vary: Accept on the homepage', () => {
    const res = negotiateAgentic('/', 'text/markdown')
    expect(res).toBeTruthy()
    expect(res!.headers.get('content-type')).toMatch(/markdown/)
    expect(res!.headers.get('vary') || '').toMatch(/Accept/i)
  })

  it('serves the MCP manifest', async () => {
    const res = negotiateAgentic('/.well-known/mcp.json', 'application/json')
    expect(res!.status).toBe(200)
    const body = await res!.json() as { url: string }
    expect(body.url).toBe('https://canfly.ai/mcp')
  })

  it('lets API and MCP paths fall through', () => {
    expect(negotiateAgentic('/api/community/agents', '*/*')).toBeNull()
    expect(negotiateAgentic('/mcp', 'application/json')).toBeNull()
    expect(isPassThroughPath('/api')).toBe(true)
  })
})

describe('crawlerInnerHtml', () => {
  it('includes an H1 and 500+ characters', () => {
    const html = crawlerInnerHtml('/')
    expect(html).toMatch(/<h1>/)
    expect(html!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length).toBeGreaterThan(500)
  })
})

describe('withVaryAccept', () => {
  it('adds Accept to a response that only varied encoding', () => {
    const res = withVaryAccept(new Response('ok', { headers: { Vary: 'accept-encoding' } }))
    const vary = res.headers.get('Vary') || ''
    expect(vary.toLowerCase()).toContain('accept')
    expect(vary.toLowerCase()).toContain('accept-encoding')
  })
})

describe('problemJson', () => {
  it('returns RFC 9457-style JSON', async () => {
    const res = problemJson(404, 'not_found', 'No such route')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toMatch(/problem\+json/)
    const body = await res.json() as { status: number; code: string; hint: string }
    expect(body.status).toBe(404)
    expect(body.code).toBe('not_found')
    expect(body.hint).toContain('openapi.json')
  })
})
