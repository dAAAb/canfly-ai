import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

function declarations(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('avatar media layout', () => {
  it('keeps the active mobile call inside the same 16:9 frame', () => {
    const call = declarations('.avatar-media-call')
    const remoteVideo = declarations('.avatar-media-call .avatar-remote-video')

    expect(call).toMatch(/aspect-ratio:\s*16\s*\/\s*9/)
    expect(call).toMatch(/min-height:\s*0/)
    expect(css).not.toMatch(/\.avatar-media-call\s*\{[^}]*min-height:\s*55svh/)

    expect(remoteVideo).toMatch(/position:\s*absolute/)
    expect(remoteVideo).toMatch(/inset:\s*0/)
    expect(remoteVideo).toMatch(/width:\s*100%/)
    expect(remoteVideo).toMatch(/height:\s*100%/)
  })
})
