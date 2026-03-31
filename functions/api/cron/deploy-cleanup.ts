/**
 * POST /api/cron/deploy-cleanup — Auto-fail stale deployments & clones
 *
 * Finds deployments stuck in setup phases (setting_up_*, cloning, deploying)
 * and marks them as failed. Optionally suspends orphaned Zeabur services
 * to stop billing.
 *
 * Protected by CRON_SECRET env var.
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { importKey, decrypt } from '../../lib/crypto'
import { zeaburGQL } from '../../lib/openclaw-config'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Auth: require CRON_SECRET
  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('Authorization')
    const cronHeader = request.headers.get('X-Cron-Secret')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cronHeader
    if (token !== cronSecret) {
      return errorResponse('Unauthorized', 401)
    }
  }

  // Find stale deployments:
  // - setting_up_* phases with phase_started_at > 15 min ago
  // - cloning/deploying with updated_at > 1 hour ago
  const stale = await env.DB.prepare(
    `SELECT id, zeabur_project_id, zeabur_service_id, status, metadata, phase_started_at, updated_at
     FROM v3_zeabur_deployments
     WHERE (
       status IN ('setting_up_init', 'setting_up_wait', 'setting_up_config')
       AND phase_started_at < datetime('now', '-15 minutes')
     ) OR (
       status IN ('cloning', 'deploying', 'setting_up')
       AND updated_at < datetime('now', '-1 hour')
     )
     LIMIT 50`
  ).all<{
    id: string
    zeabur_project_id: string
    zeabur_service_id: string | null
    status: string
    metadata: string
    phase_started_at: string | null
    updated_at: string | null
  }>()

  if (!stale.results.length) {
    return json({ cleaned: 0, message: 'No stale deployments found.' })
  }

  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  let cleaned = 0
  let suspended = 0
  const errors: string[] = []

  for (const dep of stale.results) {
    try {
      // Mark as failed
      await env.DB.prepare(
        `UPDATE v3_zeabur_deployments
         SET status = 'failed', error_message = ?1, updated_at = datetime('now')
         WHERE id = ?2 AND status = ?3`
      ).bind(
        `Setup timed out (was ${dep.status} since ${dep.phase_started_at || dep.updated_at})`,
        dep.id,
        dep.status,
      ).run()

      cleaned++

      // Try to suspend the Zeabur service to stop billing
      if (dep.zeabur_service_id) {
        try {
          const meta = JSON.parse(dep.metadata || '{}')
          const apiKey = cryptoKey && meta.zeaburApiKey
            ? await decrypt(meta.zeaburApiKey, cryptoKey)
            : meta.zeaburApiKey

          if (apiKey) {
            // Get environment ID
            const envResult = await zeaburGQL(apiKey, `
              query { project(_id: "${dep.zeabur_project_id}") { environments { _id name } } }
            `)
            const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
            const prodEnv = envs.find(e => e.name === 'production') || envs[0]

            if (prodEnv) {
              await zeaburGQL(apiKey,
                `mutation{suspendService(serviceID:"${dep.zeabur_service_id}",environmentID:"${prodEnv._id}")}`,
              )
              suspended++
            }
          }
        } catch (e) {
          errors.push(`suspend ${dep.id}: ${e}`)
        }
      }

      // Log
      await env.DB.prepare(
        `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
         VALUES ('deployment', ?1, 'orphan_cleanup', ?2)`
      ).bind(dep.id, JSON.stringify({ previousStatus: dep.status, suspended: suspended > 0 })).run()
    } catch (e) {
      errors.push(`cleanup ${dep.id}: ${e}`)
    }
  }

  return json({
    cleaned,
    suspended,
    errors: errors.length ? errors : undefined,
    message: `Cleaned ${cleaned} stale deployments, suspended ${suspended} services.`,
  })
}
