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
import {
  pinataRestartAgent,
  pinataSetDefaultModel,
  PinataApiError,
} from '../../../lib/pinata'

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

  try {
    // Restart is optional (skip if the lobster was just created — secret was
    // attached BEFORE creation so env var is already loaded). Skipping saves
    // ~6 seconds and avoids the R2 snapshot restore that re-triggers
    // openrouter/auto as default.
    if (!skipRestart) {
      console.log('[finalize] restart')
      await pinataRestartAgent(env, jwt, deployment.pinata_agent_id)
      await new Promise((r) => setTimeout(r, 5000))
    }
    console.log('[finalize] setDefaultModel', modelSlug)
    await pinataSetDefaultModel(env, jwt, deployment.pinata_agent_id, modelSlug)

    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('deployment', ?1, 'pinata_deploy_finalized', ?2)`
    ).bind(deployment.id, JSON.stringify({
      model: modelSlug,
      skippedRestart: skipRestart,
    })).run().catch(() => null)

    return json({
      ok: true,
      defaultModel: modelSlug,
      skippedRestart: skipRestart,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[finalize] failed:', msg)
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('deployment', ?1, 'pinata_deploy_finalize_failed', ?2)`
    ).bind(deployment.id, JSON.stringify({ error: msg })).run().catch(() => null)

    if (err instanceof PinataApiError) {
      return errorResponse(`Pinata: ${err.status} ${err.body?.slice(0, 200) || ''}`, 502)
    }
    return errorResponse(`Finalize failed: ${msg}`, 502)
  }
}
