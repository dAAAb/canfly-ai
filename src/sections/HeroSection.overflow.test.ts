import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('hero overflow', () => {
  it('does not put overflow-x-hidden on the hero section', () => {
    const tsx = readFileSync(resolve(process.cwd(), 'src/sections/HeroSection.tsx'), 'utf8')
    const open = tsx.match(/<section className="hero-section[^"]*"/)?.[0] ?? ''
    expect(open).toContain('hero-section')
    expect(open).not.toContain('overflow-x-hidden')
    expect(open).not.toMatch(/\boverflow-hidden\b/)
    expect(open).not.toContain('overflow-y-auto')
  })

  it('clips horizontal bleed in CSS without creating a scrollport', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const block = css.match(/\.hero-section\s*\{[^}]+\}/)?.[0] ?? ''
    const decls = block.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(decls).toMatch(/overflow-x:\s*clip/)
    expect(decls).not.toMatch(/overflow-x:\s*hidden/)
    expect(decls).not.toMatch(/overflow-y:\s*auto/)
  })
})
