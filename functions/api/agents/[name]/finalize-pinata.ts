/**
 * POST /api/agents/:name/finalize-pinata — Apply free-model default (CAN-302)
 *
 * The main /api/pinata/deploy endpoint creates the lobster + secret + DB rows
 * inside Cloudflare's 30s wall-clock budget but cannot also fit the slow
 * restart + `openclaw config set` pair. This endpoint runs that finalize
 * step in its own request budget so the wizard can chain it after deploy
 * returns 201, and the settings page can re-apply if Pinata's R2 snapshot
 * restore ever reverts the override (which it does after every restart).
 *
 * Idempotent: safe to call multiple times. Each call runs:
 *   1. (optional) Pinata restart → loads OPENROUTER_API_KEY into env vars
 *   2. ~5s wait for the gateway to come back
 *   3. `openclaw config set agents.defaults.model.primary openrouter/<id>:free`
 *
 * Auth: lobster owner (Privy JWT / X-Edit-Token).
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, decrypt } from '../../../lib/crypto'
import { pinataRestartAgent, pinataSetDefaultModel } from '../../../lib/pinata'

interface DeploymentRow {
  id: string
  owner_username: string
  pinata_agent_id: string | null
  free_model_id: string
  metadata: string
}

interface DeploymentMetadata {
  pinataJwt?: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string
  if (!agentName) return errorResponse('Agent name is required', 400)

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, pinata_agent_id, free_model_id, metadata
     FROM v3_pinata_deployments
     WHERE agent_name = ?1 AND status NOT IN ('stopped', 'failed')
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(agentName).first<DeploymentRow>()

  if (!deployment) return errorResponse('No active Pinata deployment found', 404)
  if (deployment.owner_username !== auth.username) {
    return errorResponse('Only the lobster owner can finalize this', 403)
  }
  if (!deployment.pinata_agent_id) return errorResponse('Deployment missing pinata_agent_id', 500)
  if (!env.ENCRYPTION_KEY) return errorResponse('Server is missing ENCRYPTION_KEY', 500)

  const cryptoKey = await importKey(env.ENCRYPTION_KEY)
  const meta: DeploymentMetadata = JSON.parse(deployment.metadata || '{}')
  if (!meta.pinataJwt) return errorResponse('Deployment metadata missing JWT', 500)
  const jwt = await decrypt(meta.pinataJwt, cryptoKey)

  const url = new URL(request.url)
  const skipRestart = url.searchParams.get('skipRestart') === '1'
  const modelSlug = `openrouter/${deployment.free_model_id}`

  // Restart and setDefaultModel are independent — even if our restart
  // request times out (Pinata can take >90s), the agent often DID actually
  // restart server-side, and setDefaultModel works regardless because it
  // just edits openclaw.json via console/exec. Run them in series but
  // don't let restart failure block setDefaultModel.
  let restartError: string | null = null
  let setModelError: string | null = null

  if (!skipRestart) {
    try {
      console.log('[finalize] restart')
      await pinataRestartAgent(env, jwt, deployment.pinata_agent_id)
      await new Promise((r) => setTimeout(r, 5000))
    } catch (err) {
      restartError = err instanceof Error ? err.message : String(err)
      console.error('[finalize] restart failed (continuing):', restartError)
    }
  }

  try {
    console.log('[finalize] setDefaultModel', modelSlug)
    await pinataSetDefaultModel(env, jwt, deployment.pinata_agent_id, modelSlug)
  } catch (err) {
    setModelError = err instanceof Error ? err.message : String(err)
    console.error('[finalize] setDefaultModel failed:', setModelError)
  }

  const ok = !setModelError
  const action = ok ? 'pinata_deploy_finalized' : 'pinata_deploy_finalize_failed'
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('deployment', ?1, ?2, ?3)`
  ).bind(deployment.id, action, JSON.stringify({
    model: modelSlug,
    skippedRestart: skipRestart,
    restartError,
    setModelError,
  })).run().catch(() => null)

  if (!ok) {
    return errorResponse(
      `Finalize partial: restart=${restartError ? 'fail' : 'ok'}, setModel=${setModelError}`,
      502,
    )
  }
  return json({
    ok: true,
    defaultModel: modelSlug,
    skippedRestart: skipRestart,
    restartError, // surface non-fatal restart timeout if present
  })
}
