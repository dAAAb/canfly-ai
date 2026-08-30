import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BOARDING_PREFERENCE_EVENT,
  setSkipBoardingPreference,
  shouldSkipBoarding,
} from './boardingPreference'

describe('boardingPreference', () => {
  beforeEach(() => {
    setSkipBoardingPreference(false)
  })

  it('reads only the enabled CanFly boarding cookie', () => {
    expect(shouldSkipBoarding('other=1; canfly_skip_boarding=1')).toBe(true)
    expect(shouldSkipBoarding('canfly_skip_boarding=0; other=1')).toBe(false)
    expect(shouldSkipBoarding('canfly_skip_boarding_extra=1')).toBe(false)
  })

  it('persists and clears the preference for the whole site', () => {
    const preferenceChanged = vi.fn()
    window.addEventListener(BOARDING_PREFERENCE_EVENT, preferenceChanged)

    setSkipBoardingPreference(true)
    expect(shouldSkipBoarding()).toBe(true)

    setSkipBoardingPreference(false)
    expect(shouldSkipBoarding()).toBe(false)
    expect(preferenceChanged).toHaveBeenCalledTimes(2)

    window.removeEventListener(BOARDING_PREFERENCE_EVENT, preferenceChanged)
  })
})
