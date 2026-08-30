import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

function declarations(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('homepage visual continuity', () => {
  it('runs the CTA runway through both section edges', () => {
    const runway = declarations('.home-cta__runway')
    const beacon = declarations('.home-cta__runway span')

    expect(runway).toMatch(/position:\s*absolute/)
    expect(runway).toMatch(/top:\s*0/)
    expect(runway).toMatch(/bottom:\s*0/)
    expect(runway).toMatch(/height:\s*100%/)
    expect(runway).toMatch(/border-radius:\s*0/)
    expect(beacon).toMatch(/top:\s*var\(--takeoff-y/)
  })

  it('uses feathered mist instead of clipped cloud humps at section joins', () => {
    for (const selector of ['.home-manifest__cloud-line', '.flight-footer__horizon']) {
      const transition = declarations(selector)
      expect(transition).toMatch(/filter:\s*blur/)
      expect(transition).toMatch(/mask-image:\s*linear-gradient/)
      expect(transition).not.toMatch(/overflow:\s*hidden/)
    }
  })
})
