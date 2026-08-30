import { describe, expect, it } from 'vitest'
import { takeoffPointPercent, takeoffProgress } from './CTASection.logic'

describe('takeoffProgress', () => {
  it('moves from zero at viewport entry to one after section exit', () => {
    expect(
      takeoffProgress({
        sectionTop: 900,
        sectionHeight: 900,
        viewportHeight: 900,
      }),
    ).toBe(0)

    expect(
      takeoffProgress({
        sectionTop: 0,
        sectionHeight: 900,
        viewportHeight: 900,
      }),
    ).toBe(0.5)

    expect(
      takeoffProgress({
        sectionTop: -900,
        sectionHeight: 900,
        viewportHeight: 900,
      }),
    ).toBe(1)
  })

  it('clamps the runway point inside the section edges', () => {
    expect(takeoffPointPercent(-1)).toBe(90)
    expect(takeoffPointPercent(0.5)).toBe(48)
    expect(takeoffPointPercent(2)).toBe(6)
  })
})
