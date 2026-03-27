/**
 * Shadow Audit API — CAN-259
 *
 * GET  /api/admin/shadow-audit?limit=50           — list recent shadow logs
 * GET  /api/admin/shadow-audit?diff=1&limit=50    — only entries with mismatches
 *
 * Requires CRON_SECRET Bearer auth (admin only).
 */
import { type Env, json, errorResponse, handleOptions, intParam } from '../community/_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  // Admin auth
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization required', 401)
  }
  if (!env.CRON_SECRET || authHeader.slice(7) !== env.CRON_SECRET) {
    return errorResponse('Forbidden', 403)
  }

  const url = new URL(request.url)
  const limit = intParam(url, 'limit', 50)
  const diffOnly = url.searchParams.has('diff')
  const operation = url.searchParams.get('operation')

  let query = 'SELECT * FROM shadow_audit_log'
  const conditions: string[] = []
  const binds: (string | number)[] = []
  let bindIdx = 1

  if (diffOnly) {
    conditions.push(`json_extract(diff, '$.match') = 0`)
  }

  if (operation) {
    conditions.push(`operation = ?${bindIdx}`)
    binds.push(operation)
    bindIdx++
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  query += ` ORDER BY created_at DESC LIMIT ?${bindIdx}`
  binds.push(limit)

  const stmt = env.DB.prepare(query)
  const rows = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all()

  return json({
    count: rows.results.length,
    entries: rows.results.map((row: Record<string, unknown>) => ({
      ...row,
      input_payload: tryParse(row.input_payload as string),
      expected_output: tryParse(row.expected_output as string),
      actual_v2_output: tryParse(row.actual_v2_output as string),
      diff: tryParse(row.diff as string),
    })),
  })
}

function tryParse(val: string | null): unknown {
  if (!val) return null
  try { return JSON.parse(val) } catch { return val }
}
