import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

describe('canfly CLI', () => {
  it('prints usage when invoked without a command', () => {
    const out = execFileSync(process.execPath, [join(here, 'canfly.mjs')], { encoding: 'utf8' })
    expect(out).toContain('canfly — CanFly.ai CLI')
    expect(out).toContain('canfly agents')
    expect(out).toContain('canfly openapi')
  })
})
