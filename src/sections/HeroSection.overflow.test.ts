import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('hero overflow', () => {
  it('does not put overflow utilities on the hero section', () => {
    const tsx = readFileSync(resolve(process.cwd(), 'src/sections/HeroSection.tsx'), 'utf8')
    const open = tsx.match(/<section className="hero-section[^"]*"/)?.[0] ?? ''
    expect(open).toContain('hero-section')
    expect(open).not.toContain('overflow-x-hidden')
    expect(open).not.toContain('overflow-x-clip')
    expect(open).not.toMatch(/\boverflow-hidden\b/)
    expect(open).not.toContain('overflow-y-auto')
  })

  it('keeps overflow off the hero and clips only at the viewport and visual layers', () => {
    const css = stripComments(readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8'))
    const hero = css.match(/\.hero-section\s*\{[^}]*\}/)?.[0] ?? ''
    const cabinRoof = css.match(/\.cabin-hero__roof\s*\{[^}]*\}/)?.[0] ?? ''
    const cabinWindow = css.match(/\.cabin-window__inner\s*\{[^}]*\}/)?.[0] ?? ''
    const html = css.match(/^html\s*\{[^}]*\}/m)?.[0] ?? ''

    expect(hero).not.toMatch(/overflow\s*:/)
    expect(hero).not.toMatch(/overflow-x\s*:/)
    expect(hero).not.toMatch(/overflow-y\s*:/)

    expect(cabinRoof).toMatch(/overflow:\s*hidden/)
    expect(cabinWindow).toMatch(/overflow:\s*hidden/)

    expect(html).toMatch(/overflow-x:\s*clip/)
    expect(html).toMatch(/overflow-y:\s*scroll/)
    expect(html).toMatch(/scrollbar-gutter:\s*stable/)
  })
})
