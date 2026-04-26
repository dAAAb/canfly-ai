/**
 * /api/agents/:name/pinata-telegram — Bind / read / unbind a Telegram bot on a
 * Pinata-hosted lobster (CAN-302).
 *
 * GET    → current channel status (read from Pinata's stored channelsJson)
 * POST   → connect a new bot (passes the user's botToken to Pinata)
 * DELETE → unbind
 *
 * The user's Pinata JWT is decrypted from v3_pinata_deployments.metadata each
 * call (no caching). The bot token is forwarded once and never persisted on
 * CanFly's side — Pinata holds it.
 *
 * NOTE: Pinata's exact channel endpoint shape is pending Step 8 spike. The
 * helper functions in functions/lib/pinata.ts target /v0/agents/:id/channels/telegram
 * which matches the documented host topology but write payload may need adjustment.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, decrypt } from '../../../lib/crypto'
import {
  pinataConnectTelegram,
  pinataDisconnectTelegram,
  pinataGetAgent,
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

const TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]{35,}$/

async function loadDeployment(
  env: Env,
  agentName: string,
  username: string,
): Promise<{ deployment: DeploymentRow; jwt: string } | { error: string; status: number }> {
  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, pinata_agent_id, free_model_id, metadata
     FROM v3_pinata_deployments
     WHERE agent_name = ?1 AND status NOT IN ('stopped', 'failed')
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(agentName).first<DeploymentRow>()

  if (!deployment) return { error: 'No active Pinata deployment for this agent', status: 404 }
  if (deployment.owner_username !== username) {
    return { error: 'Only the lobster owner can manage its Telegram channel', status: 403 }
  }
  if (!deployment.pinata_agent_id) return { error: 'Deployment missing pinata_agent_id', status: 500 }

  if (!env.ENCRYPTION_KEY) return { error: 'Server is missing ENCRYPTION_KEY', status: 500 }
  const cryptoKey = await importKey(env.ENCRYPTION_KEY)
  const meta: DeploymentMetadata = JSON.parse(deployment.metadata || '{}')
  if (!meta.pinataJwt) return { error: 'Deployment metadata missing JWT', status: 500 }
  const jwt = await decrypt(meta.pinataJwt, cryptoKey)

  return { deployment, jwt }
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

// ── GET: read current channel status ──────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string
  if (!agentName) return errorResponse('Agent name is required', 400)

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const loaded = await loadDeployment(env, agentName, auth.username)
  if ('error' in loaded) return errorResponse(loaded.error, loaded.status)

  try {
    const agent = await pinataGetAgent(env, loaded.jwt, loaded.deployment.pinata_agent_id!)
    let channels: { telegram?: { connected?: boolean; botUsername?: string } } = {}
    try {
      channels = JSON.parse(agent.channelsJson || '{}')
    } catch { /* malformed channelsJson — treat as empty */ }
    const telegram = channels.telegram

    if (telegram?.botUsername && telegram.connected !== false) {
      return json({
        connected: true,
        status: 'active',
        botUsername: telegram.botUsername,
      })
    }
    return json({ connected: false, status: 'none' })
  } catch (err) {
    if (err instanceof PinataApiError) {
      return errorResponse(`Pinata: ${err.status}`, 502)
    }
    return errorResponse('Failed to read channel status', 502)
  }
}

// ── POST: bind a new bot ──────────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string
  if (!agentName) return errorResponse('Agent name is required', 400)

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const body = await parseBody<{ botToken?: string }>(request)
  if (!body?.botToken || !TOKEN_PATTERN.test(body.botToken)) {
    return errorResponse('Invalid Telegram bot token (expected `123456:ABC-...` shape from BotFather)', 400)
  }

  const loaded = await loadDeployment(env, agentName, auth.username)
  if ('error' in loaded) return errorResponse(loaded.error, loaded.status)

  try {
    const result = await pinataConnectTelegram(
      env,
      loaded.jwt,
      loaded.deployment.pinata_agent_id!,
      body.botToken,
    )

    // Channel changes need an agent restart to take effect
    // (per Pinata docs: "Changes to channels take effect after a gateway restart").
    // Restart also wipes openclaw.json back to baseline (R2 snapshot restore),
    // so we re-apply our free-model override afterwards.
    try {
      await pinataRestartAgent(env, loaded.jwt, loaded.deployment.pinata_agent_id!)
      await new Promise((r) => setTimeout(r, 5000))
      await pinataSetDefaultModel(
        env,
        loaded.jwt,
        loaded.deployment.pinata_agent_id!,
        `openrouter/${loaded.deployment.free_model_id}`,
      )
    } catch {
      // Don't fail the bind if restart hiccups; user can retry from settings
    }

    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'pinata_telegram_connected', ?2)`
    ).bind(agentName, JSON.stringify({
      owner: auth.username,
      botUsername: result.botUsername,
    })).run()

    return json({
      connected: result.status === 'active',
      status: result.status,
      botUsername: result.botUsername,
    })
  } catch (err) {
    if (err instanceof PinataApiError) {
      if (err.status === 401 || err.status === 403) {
        return errorResponse('Pinata rejected the JWT — the lobster may need to be redeployed', 502)
      }
      return errorResponse(`Pinata returned ${err.status}: ${err.body || 'unknown'}`, 502)
    }
    return errorResponse(err instanceof Error ? err.message : 'Failed to connect Telegram', 502)
  }
}

// ── DELETE: unbind ────────────────────────────────────────────────────
export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string
  if (!agentName) return errorResponse('Agent name is required', 400)

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const loaded = await loadDeployment(env, agentName, auth.username)
  if ('error' in loaded) return errorResponse(loaded.error, loaded.status)

  try {
    await pinataDisconnectTelegram(env, loaded.jwt, loaded.deployment.pinata_agent_id!)
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'pinata_telegram_disconnected', ?2)`
    ).bind(agentName, JSON.stringify({ owner: auth.username })).run()
    return json({ disconnected: true })
  } catch (err) {
    if (err instanceof PinataApiError) {
      return errorResponse(`Pinata returned ${err.status}`, 502)
    }
    return errorResponse('Failed to disconnect Telegram', 502)
  }
}
