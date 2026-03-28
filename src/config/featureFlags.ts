/**
 * V3 Feature Flag definitions (CAN-249 / CAN-256)
 *
 * All flags default to OFF. Override locally via VITE_FF_<FLAG_NAME>=1
 * or remotely via the D1 feature_flags table.
 */

/** All v3 feature flag names */
export const V3_FLAGS = {
  V3_ROUTING: 'v3_routing',
  V3_PAPERCLIP_BRIDGE: 'v3_paperclip_bridge',
  V3_ESCROW: 'v3_escrow',
  V3_MARKETPLACE: 'v3_marketplace',
  V3_TG_PM: 'v3_tg_pm',
} as const

export type V3FlagName = (typeof V3_FLAGS)[keyof typeof V3_FLAGS]

/** All flag names for iteration */
export const ALL_V3_FLAGS: V3FlagName[] = Object.values(V3_FLAGS)

/** Default values — all OFF */
export const FLAG_DEFAULTS: Record<V3FlagName, boolean> = {
  [V3_FLAGS.V3_ROUTING]: false,
  [V3_FLAGS.V3_PAPERCLIP_BRIDGE]: false,
  [V3_FLAGS.V3_ESCROW]: false,
  [V3_FLAGS.V3_MARKETPLACE]: false,
  [V3_FLAGS.V3_TG_PM]: false,
}

/**
 * Map flag names to VITE_FF_* env var names.
 * Setting VITE_FF_V3_ROUTING=true in .env overrides the API value.
 */
const ENV_VAR_MAP: Record<V3FlagName, string> = {
  [V3_FLAGS.V3_ROUTING]: 'VITE_FF_V3_ROUTING',
  [V3_FLAGS.V3_PAPERCLIP_BRIDGE]: 'VITE_FF_V3_PAPERCLIP_BRIDGE',
  [V3_FLAGS.V3_ESCROW]: 'VITE_FF_V3_ESCROW',
  [V3_FLAGS.V3_MARKETPLACE]: 'VITE_FF_V3_MARKETPLACE',
  [V3_FLAGS.V3_TG_PM]: 'VITE_FF_V3_TG_PM',
}

/**
 * Check if a flag is overridden by an env var.
 * Returns the override value, or null if no override is set.
 */
export function getEnvOverride(flagName: V3FlagName): boolean | null {
  const envKey = ENV_VAR_MAP[flagName]
  if (!envKey) return null
  const val = import.meta.env[envKey]
  if (val === undefined || val === '') return null
  return val === 'true' || val === '1'
}
