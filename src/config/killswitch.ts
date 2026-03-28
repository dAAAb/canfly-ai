/**
 * Kill-switch configuration (CAN-249 / CAN-258)
 *
 * Global circuit breaker for v3 features.
 * When enabled, all mutating v3 operations are rejected with 503.
 */

/** Env var override: set V3_KILL_SWITCH=1 to force kill-switch ON */
export function getKillSwitchEnvOverride(): boolean | null {
  if (typeof process !== 'undefined' && process.env?.V3_KILL_SWITCH) {
    return process.env.V3_KILL_SWITCH === '1' || process.env.V3_KILL_SWITCH === 'true'
  }
  return null
}

/** Response body when kill-switch is active */
export const KILL_SWITCH_RESPONSE = {
  error: 'v3_killed',
  message: 'V3 features are temporarily disabled by kill-switch.',
} as const
