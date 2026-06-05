import { describe, it, expect } from 'vitest'
import { hasIntegrationTutorial, INTEGRATION_TUTORIAL_SLUGS } from './tutorials'

describe('hasIntegrationTutorial (skill tutorial link gating — audit #37/#38)', () => {
  it('returns true only for slugs that have a real tutorial page', () => {
    expect(hasIntegrationTutorial('elevenlabs')).toBe(true)
    expect(INTEGRATION_TUTORIAL_SLUGS.has('elevenlabs')).toBe(true)
  })

  it('returns false for skills with no tutorial (would have 404’d)', () => {
    expect(hasIntegrationTutorial('heygen')).toBe(false)
    expect(hasIntegrationTutorial('some-random-skill')).toBe(false)
  })

  it('is case-insensitive and null-safe', () => {
    expect(hasIntegrationTutorial('ElevenLabs')).toBe(true)
    expect(hasIntegrationTutorial(null)).toBe(false)
    expect(hasIntegrationTutorial(undefined)).toBe(false)
    expect(hasIntegrationTutorial('')).toBe(false)
  })
})
