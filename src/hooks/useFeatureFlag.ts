import { useState, useEffect } from 'react'
import { type V3FlagName, FLAG_DEFAULTS, getEnvOverride } from '../config/featureFlags'

/** In-memory cache shared across all hook instances for the session */
const flagCache = new Map<string, boolean>()

/**
 * React hook to check if a v3 feature flag is enabled.
 *
 * Resolution order:
 * 1. VITE_FF_* env var override (instant, for local dev)
 * 2. In-memory session cache
 * 3. API fetch → cache result
 * 4. Default (false)
 */
export function useFeatureFlag(flagName: V3FlagName): boolean {
  // 1. Env var override — deterministic, no state needed
  const envOverride = getEnvOverride(flagName)
  if (envOverride !== null) return envOverride

  // 2. Session cache hit
  const cached = flagCache.get(flagName)
  const [enabled, setEnabled] = useState<boolean>(cached ?? FLAG_DEFAULTS[flagName] ?? false)

  useEffect(() => {
    // Already resolved from cache
    if (flagCache.has(flagName)) {
      setEnabled(flagCache.get(flagName)!)
      return
    }

    let cancelled = false

    fetch(`/api/feature-flags?flag=${encodeURIComponent(flagName)}`)
      .then((res) => res.json())
      .then((data: { enabled?: boolean }) => {
        if (cancelled) return
        const val = data.enabled === true
        flagCache.set(flagName, val)
        setEnabled(val)
      })
      .catch(() => {
        // On error, keep default (false)
        if (!cancelled) flagCache.set(flagName, false)
      })

    return () => {
      cancelled = true
    }
  }, [flagName])

  return enabled
}
