/**
 * Paperclip Bridge v1 — CAN-253
 *
 * Maps CanFly tasks to Paperclip issues. In shadow mode, records
 * what WOULD happen without dispatching to Paperclip.
 */

import type { Env } from '../api/community/_helpers'
import { getBridgeMode, logShadowOp } from './shadowLogger'

// ── Types ──────────────────────────────────────────────────────────

export type MappingRule = 'job_to_epic' | 'step_to_subtask' | 'manual'
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'skipped'

export interface BridgeMappingInput {
  canflyTaskId: number
  canflyTaskType?: 'task' | 'epic' | 'subtask'
  mappingRule: MappingRule
  /** CanFly task data snapshot */
  canflyPayload: Record<string, unknown>
  /** Optional Paperclip parent for subtask mapping */
  paperclipParentId?: string
}

export interface BridgeMapping {
  id: number
  canfly_task_id: number
  canfly_task_type: string
  paperclip_issue_id: string | null
  paperclip_identifier: string | null
  paperclip_parent_id: string | null
  mapping_rule: string
  bridge_mode: string
  sync_status: string
  sync_error: string | null
  canfly_payload: string | null
  paperclip_payload: string | null
  created_at: string
  updated_at: string
  synced_at: string | null
}

// ── Mapping Rules ──────────────────────────────────────────────────

/**
 * Build the Paperclip issue payload that would be created for a CanFly task.
 * This is the "expected output" logged in shadow mode.
 */
export function buildPaperclipPayload(
  input: BridgeMappingInput,
): Record<string, unknown> {
  const { canflyPayload, mappingRule, paperclipParentId } = input
  const title = (canflyPayload.title as string) || 'Untitled'
  const description = (canflyPayload.description as string) || ''

  const base: Record<string, unknown> = {
    title: `[CanFly] ${title}`,
    description: `${description}\n\n---\n_Bridged from CanFly task #${input.canflyTaskId}_`,
    status: 'todo',
    priority: mapPriority(canflyPayload.priority as string),
  }

  switch (mappingRule) {
    case 'job_to_epic':
      // Jobs map to top-level epics in Paperclip
      base.labels = ['canfly-job']
      break

    case 'step_to_subtask':
      // Steps within a job map to subtasks under the parent epic
      if (paperclipParentId) {
        base.parentId = paperclipParentId
      }
      base.labels = ['canfly-step']
      break

    case 'manual':
      base.labels = ['canfly-manual']
      break
  }

  return base
}

/**
 * Map CanFly priority to Paperclip priority values.
 */
function mapPriority(priority?: string): string {
  switch (priority) {
    case 'urgent':
    case 'critical':
      return 'critical'
    case 'high':
      return 'high'
    case 'low':
      return 'low'
    default:
      return 'medium'
  }
}

// ── Core Bridge Operations ─────────────────────────────────────────

/**
 * Create a bridge mapping for a CanFly task.
 * In shadow mode: logs the mapping and payload but does not call Paperclip.
 * In active mode: would create the Paperclip issue (placeholder for v2).
 */
export async function createMapping(
  env: Env & { BRIDGE_MODE?: string },
  input: BridgeMappingInput,
): Promise<{ mapping: BridgeMapping; mode: string }> {
  const mode = await getBridgeMode(env)

  if (mode === 'off') {
    throw new Error('Bridge is disabled (mode=off). Enable shadow or active mode first.')
  }

  const paperclipPayload = buildPaperclipPayload(input)
  let syncStatus: SyncStatus = 'pending'
  let paperclipIssueId: string | null = null
  let paperclipIdentifier: string | null = null
  let syncError: string | null = null

  if (mode === 'shadow') {
    // Shadow mode: record what WOULD happen, don't dispatch
    syncStatus = 'skipped'
    await logShadowOp(
      env,
      `bridge.create.${input.mappingRule}`,
      { canflyTaskId: input.canflyTaskId, ...input.canflyPayload },
      paperclipPayload,
    )
  } else if (mode === 'active') {
    // Active mode: would call Paperclip API here
    // TODO: Implement actual Paperclip dispatch in v2
    syncStatus = 'pending'
    syncError = 'Active mode dispatch not yet implemented'
  }

  const now = new Date().toISOString()
  const result = await env.DB.prepare(
    `INSERT INTO paperclip_bridge_mappings
       (canfly_task_id, canfly_task_type, paperclip_issue_id, paperclip_identifier,
        paperclip_parent_id, mapping_rule, bridge_mode, sync_status, sync_error,
        canfly_payload, paperclip_payload, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
     RETURNING *`
  ).bind(
    input.canflyTaskId,
    input.canflyTaskType || 'task',
    paperclipIssueId,
    paperclipIdentifier,
    input.paperclipParentId || null,
    input.mappingRule,
    mode,
    syncStatus,
    syncError,
    JSON.stringify(input.canflyPayload),
    JSON.stringify(paperclipPayload),
    now,
    now,
  ).first<BridgeMapping>()

  return { mapping: result!, mode }
}

/**
 * Get a bridge mapping by CanFly task ID.
 */
export async function getMappingByTaskId(
  env: Env,
  canflyTaskId: number,
): Promise<BridgeMapping | null> {
  return env.DB.prepare(
    'SELECT * FROM paperclip_bridge_mappings WHERE canfly_task_id = ?1 ORDER BY created_at DESC LIMIT 1'
  ).bind(canflyTaskId).first<BridgeMapping>()
}

/**
 * Get a bridge mapping by its ID.
 */
export async function getMappingById(
  env: Env,
  id: number,
): Promise<BridgeMapping | null> {
  return env.DB.prepare(
    'SELECT * FROM paperclip_bridge_mappings WHERE id = ?1'
  ).bind(id).first<BridgeMapping>()
}

/**
 * List bridge mappings with optional filters.
 */
export async function listMappings(
  env: Env,
  opts: {
    bridgeMode?: string
    syncStatus?: string
    limit?: number
    offset?: number
  } = {},
): Promise<{ mappings: BridgeMapping[]; total: number }> {
  const conditions: string[] = []
  const binds: (string | number)[] = []
  let bindIdx = 1

  if (opts.bridgeMode) {
    conditions.push(`bridge_mode = ?${bindIdx}`)
    binds.push(opts.bridgeMode)
    bindIdx++
  }
  if (opts.syncStatus) {
    conditions.push(`sync_status = ?${bindIdx}`)
    binds.push(opts.syncStatus)
    bindIdx++
  }

  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
  const limit = opts.limit || 50
  const offset = opts.offset || 0

  // Count
  const countStmt = env.DB.prepare(`SELECT COUNT(*) as total FROM paperclip_bridge_mappings${where}`)
  const countRow = binds.length > 0
    ? await countStmt.bind(...binds).first<{ total: number }>()
    : await countStmt.first<{ total: number }>()
  const total = countRow?.total || 0

  // Query
  const query = `SELECT * FROM paperclip_bridge_mappings${where} ORDER BY created_at DESC LIMIT ?${bindIdx} OFFSET ?${bindIdx + 1}`
  const queryBinds = [...binds, limit, offset]
  const rows = await env.DB.prepare(query).bind(...queryBinds).all<BridgeMapping>()

  return { mappings: rows.results, total }
}
