import { useState, useEffect } from 'react'
import { type V3FlagName, getEnvOverride, FLAG_DEFAULTS } from '../config/featureFlags'

/** In-memory cache so we only fetch each flag once per session */
const flagCache = new Map<string, boolean>()

/**
 * React hook to check if a v3 feature flag is enabled.
 *
 * Resolution order:
 * 1. Env var override (VITE_FF_<FLAG_NAME>=1)
 * 2. API fetch from D1 (cached per session)
 * 3. Default (false)
 */
export function useFeatureFlag(flagName: V3FlagName): boolean {
  // 1. Check env var override first (instant, no async)
  const envOverride = getEnvOverride(flagName)

  const [enabled, setEnabled] = useState<boolean>(() => {
    if (envOverride !== null) return envOverride
    if (flagCache.has(flagName)) return flagCache.get(flagName)!
    return FLAG_DEFAULTS[flagName] ?? false
  })

  useEffect(() => {
    // If env var override exists, use it and skip API
    if (envOverride !== null) {
      setEnabled(envOverride)
      return
    }

    // If already cached, use cache
    if (flagCache.has(flagName)) {
      setEnabled(flagCache.get(flagName)!)
      return
    }

    // Fetch from API
    let cancelled = false
    fetch(`/api/feature-flags?flag=${encodeURIComponent(flagName)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const val = Boolean(data.enabled)
        flagCache.set(flagName, val)
        setEnabled(val)
      })
      .catch(() => {
        // On error, keep default (OFF)
      })

    return () => {
      cancelled = true
    }
  }, [flagName, envOverride])

  return enabled
}
