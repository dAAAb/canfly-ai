import { describe, expect, it } from 'vitest'
import {
  CRUISING_ALTITUDES,
  formatTaipeiTime,
  nextAltitudeIndex,
} from './HeroSection.logic'

describe('HeroSection flight data', () => {
  it('formats the real time in Asia/Taipei', () => {
    expect(formatTaipeiTime(new Date('2026-08-30T05:20:00.000Z'))).toBe('13:20')
  })

  it('cycles altitude upward and downward without jumping', () => {
    expect(CRUISING_ALTITUDES).toEqual([
      38_000,
      39_000,
      40_000,
      39_000,
      38_000,
      37_000,
      36_000,
      37_000,
    ])
    expect(nextAltitudeIndex(CRUISING_ALTITUDES.length - 1)).toBe(0)
  })
})
