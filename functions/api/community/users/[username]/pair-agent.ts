/**
 * POST /api/community/users/:username/pair-agent — Bind agent via pairing code
 * Body: { pairingCode: string }  (format: CLAW-XXXX-XXXX)
 * Auth: X-Edit-Token header OR X-Wallet-Address header (matching user's wallet)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../_helpers'
import { authenticateRequest } from '../../../_auth'
import { emitFeedEvent } from '../../../_feed'

interface PairBody {
  pairingCode: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)
  if (auth.username !== username) return errorResponse('Unauthorized', 403)

  const body = await parseBody<PairBody>(request)
  if (!body || !body.pairingCode) {
    return errorResponse('pairingCode is required', 400)
  }

  const code = body.pairingCode.trim().toUpperCase()
  if (!/^CLAW-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return errorResponse('Invalid pairing code format. Expected CLAW-XXXX-XXXX.', 400)
  }

  // Find agent by pairing code
  const agent = await env.DB.prepare(
    `SELECT name, owner_username, pairing_code_expires FROM agents
     WHERE pairing_code = ?1`
  )
    .bind(code)
    .first()

  if (!agent) {
    return errorResponse('Pairing code not found or already used', 404)
  }

  if (agent.owner_username) {
    return errorResponse('This agent already has an owner', 409)
  }

  // Check expiry
  const expires = agent.pairing_code_expires as string | null
  if (expires && new Date(expires) < new Date()) {
    return errorResponse('Pairing code has expired', 410)
  }

  // Bind agent to user + clear pairing code
  await env.DB.prepare(
    `UPDATE agents SET owner_username = ?1, pairing_code = NULL, pairing_code_expires = NULL WHERE name = ?2`
  )
    .bind(username, agent.name as string)
    .run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'paired_via_code', ?2)`
  )
    .bind(agent.name as string, JSON.stringify({ owner: username }))
    .run()

  // Live feed event (CAN-300)
  emitFeedEvent(env.DB, {
    event_type: 'agent_paired',
    emoji: '🔗',
    actor: username,
    target: agent.name as string,
    link: `/community/agents/${agent.name}`,
    message_en: `${username} paired with agent ${agent.name}`,
    message_zh_tw: `${username} 與 ${agent.name} 配對成功`,
    message_zh_cn: `${username} 与 ${agent.name} 配对成功`,
  })

  return json({ paired: true, agentName: agent.name })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
