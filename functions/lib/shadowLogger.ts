/**
 * Shadow Logger — CAN-259
 *
 * Logs what v3 bridge operations WOULD do without executing them.
 * Used in shadow mode to compare v3 behaviour against v2.
 */

import type { Env } from '../api/community/_helpers'

export type BridgeMode = 'shadow' | 'active' | 'off'

/**
 * Resolve the current bridge mode.
 * Priority: BRIDGE_MODE env var > feature flag > 'off'
 */
export async function getBridgeMode(env: Env & { BRIDGE_MODE?: string }): Promise<BridgeMode> {
  // 1. Explicit env var takes priority
  const envMode = env.BRIDGE_MODE as BridgeMode | undefined
  if (envMode && ['shadow', 'active', 'off'].includes(envMode)) {
    return envMode
  }

  // 2. Check feature flag
  const row = await env.DB.prepare(
    "SELECT enabled FROM feature_flags WHERE flag_name = 'v3_bridge_mode' AND scope = 'global' AND scope_id IS NULL"
  ).first<{ enabled: number }>()

  if (row && row.enabled === 1) {
    return 'shadow'
  }

  return 'off'
}

/**
 * Log a shadow operation — records what v3 would do without executing.
 */
export async function logShadowOp(
  env: Env,
  operation: string,
  inputPayload: unknown,
  expectedOutput: unknown,
  actualV2Output?: unknown,
): Promise<void> {
  const diff = actualV2Output !== undefined
    ? JSON.stringify(computeDiff(expectedOutput, actualV2Output))
    : null

  await env.DB.prepare(
    `INSERT INTO shadow_audit_log (operation, input_payload, expected_output, actual_v2_output, diff, bridge_mode)
     VALUES (?1, ?2, ?3, ?4, ?5, 'shadow')`
  ).bind(
    operation,
    JSON.stringify(inputPayload),
    JSON.stringify(expectedOutput),
    actualV2Output !== undefined ? JSON.stringify(actualV2Output) : null,
    diff,
  ).run()
}

/**
 * Simple diff: compare two values and return a summary of differences.
 */
function computeDiff(expected: unknown, actual: unknown): { match: boolean; details?: string } {
  const expectedStr = JSON.stringify(expected)
  const actualStr = JSON.stringify(actual)

  if (expectedStr === actualStr) {
    return { match: true }
  }

  return {
    match: false,
    details: `expected=${expectedStr}, actual=${actualStr}`,
  }
}
