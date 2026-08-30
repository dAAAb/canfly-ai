import { useCallback, useEffect, useState } from 'react'
import {
  BOARDING_PREFERENCE_EVENT,
  setSkipBoardingPreference,
  shouldSkipBoarding,
} from '../utils/boardingPreference'

export function useBoardingPreference() {
  const [skipBoarding, setSkipBoardingState] = useState(shouldSkipBoarding)

  useEffect(() => {
    function syncPreference() {
      setSkipBoardingState(shouldSkipBoarding())
    }

    window.addEventListener(BOARDING_PREFERENCE_EVENT, syncPreference)
    window.addEventListener('focus', syncPreference)

    return () => {
      window.removeEventListener(BOARDING_PREFERENCE_EVENT, syncPreference)
      window.removeEventListener('focus', syncPreference)
    }
  }, [])

  const updatePreference = useCallback((nextValue: boolean) => {
    setSkipBoardingPreference(nextValue)
    setSkipBoardingState(nextValue)
  }, [])

  return {
    skipBoarding,
    setSkipBoarding: updatePreference,
  }
}
