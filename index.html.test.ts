import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('index.html crawler shell', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
  const start = html.indexOf('<div id="root">')
  const script = html.indexOf('<script type="module"', start)
  const root = html.slice(start, script)
  const text = root.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  it('puts an H1 and 500+ characters inside #root', () => {
    expect(root).toMatch(/<h1>/)
    expect(text.length).toBeGreaterThan(500)
    expect(text).toContain('CanFly.ai')
  })

  it('includes Organization contactPoint and address', () => {
    expect(html).toContain('"contactPoint"')
    expect(html).toContain('"contactType"')
    expect(html).toContain('juchunko@gmail.com')
    expect(html).toContain('"PostalAddress"')
    expect(html).toContain('Taipei')
  })
})
