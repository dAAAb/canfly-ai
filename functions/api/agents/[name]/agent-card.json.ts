/**
 * GET /api/agents/:name/agent-card.json — A2A standard Agent Card
 *
 * Auto-generates an A2A spec v1.0 compliant Agent Card JSON from
 * the agent's registered data in D1.
 *
 * Spec fields: name, description, url, version, provider, capabilities,
 * skills, authentication.
 * Extensions: walletAddress, birthday, heartbeat, erc8004.
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'

const SITE = 'https://canfly.ai'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const name = params.name as string

  const agent = await env.DB.prepare(
    `SELECT name, owner_username, wallet_address, basename, platform,
            avatar_url, bio, model, hosting, capabilities, erc8004_url,
            is_public, created_at, agentbook_registered,
            birthday, birthday_verified, last_heartbeat, heartbeat_status,
            agent_card_override, basemail_handle
     FROM agents WHERE name = ?1`
  )
    .bind(name)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }

  if (agent.is_public === 0) {
    return errorResponse('Agent profile is private', 403)
  }

  // Fetch skills (with pricing columns from migration 0007)
  const skillsResult = await env.DB.prepare(
    `SELECT id, name, slug, description, url, type, price, currency, payment_methods, sla
     FROM skills WHERE agent_name = ?1`
  )
    .bind(name)
    .all()

  // Fetch trust score (CAN-220) + buyer reputation (CAN-223)
  const trustRow = await env.DB.prepare(
    `SELECT trust_score, completion_rate, avg_rating, total_tasks, total_ratings,
            buyer_trust_score, buyer_total_purchases, buyer_reject_count, buyer_reject_rate, buyer_avg_pay_speed_hrs
     FROM trust_scores WHERE agent_name = ?1`
  ).bind(name).first()

  // Fetch milestones
  const milestonesResult = await env.DB.prepare(
    `SELECT date, title, description, trust_level, proof
     FROM milestones WHERE agent_name = ?1 ORDER BY date DESC`
  )
    .bind(name)
    .all()

  // Build agent URL — with owner subdomain or free pool
  const ownerUsername = agent.owner_username as string | null
  const agentUrl = ownerUsername
    ? `${SITE}/u/${ownerUsername}/agent/${encodeURIComponent(name as string)}`
    : `${SITE}/free/agent/${encodeURIComponent(name as string)}`

  // Parse stored capabilities JSON
  const storedCaps = JSON.parse((agent.capabilities as string) || '{}')

  // Build A2A skills array (with purchasable metadata from CAN-196)
  const a2aSkills = skillsResult.results.map((s) => {
    const skill: Record<string, unknown> = {
      id: s.slug || String(s.id),
      name: s.name,
      tags: [],
    }
    if (s.description) skill.description = s.description
    if (s.url) skill.url = s.url
    // Purchasable skill metadata (CAN-206: add endpoint + structured price)
    if (s.type === 'purchasable') {
      skill.type = 'purchasable'
      skill.endpoint = `${SITE}/api/agents/${encodeURIComponent(name as string)}/tasks`
      if (s.price != null) {
        skill.price = {
          amount: Number(s.price),
          currency: (s.currency as string) || 'USDC',
          chain: 'base',
        }
      }
      if (s.payment_methods) skill.paymentMethods = JSON.parse(s.payment_methods as string)
      if (s.sla) skill.sla = s.sla
      skill.flow = {
        order: `POST ${skill.endpoint}`,
        order_body: `{"skill":"${s.name}","params":{...},"buyer":"YourAgentName","buyer_email":"you@basemail.ai"}`,
        verify: `POST ${SITE}/api/agents/${encodeURIComponent(name as string)}/tasks/{task_id}/verify-payment`,
        verify_body: '{"tx_hash":"0x..."}',
        status: `GET ${SITE}/api/agents/${encodeURIComponent(name as string)}/tasks/{task_id}`,
      }
    } else {
      skill.type = 'free'
    }
    return skill
  })

  // Build A2A Agent Card
  const agentCard: Record<string, unknown> = {
    name: agent.name,
    description: agent.bio || '',
    url: agentUrl,
    version: '1.0.0',
    provider: {
      organization: 'CanFly',
      url: SITE,
    },
    capabilities: {
      streaming: storedCaps.streaming ?? false,
      pushNotifications: storedCaps.pushNotifications ?? false,
    },
    defaultInputModes: storedCaps.defaultInputModes || ['text/plain'],
    defaultOutputModes: storedCaps.defaultOutputModes || ['text/plain'],
    skills: a2aSkills,
    authentication: {
      schemes: storedCaps.auth_schemes || ['none'],
    },
    // CanFly extensions (prefixed with underscore per convention)
    _extensions: {
      platform: agent.platform,
      model: agent.model || undefined,
      hosting: agent.hosting || undefined,
      avatarUrl: agent.avatar_url || undefined,
      walletAddress: agent.wallet_address || undefined,
      basename: agent.basename || undefined,
      agentbookRegistered: agent.agentbook_registered === 1,
      erc8004Url: agent.erc8004_url || undefined,
      identity: (() => {
        const bmHandle = agent.basemail_handle as string | null
        if (!bmHandle && !agent.erc8004_url && !agent.wallet_address) return undefined
        const id: Record<string, unknown> = {}
        if (bmHandle) {
          id.basemail = bmHandle
          id.basemailEmail = `${bmHandle}@basemail.ai`
        }
        if (agent.erc8004_url) id.erc8004Url = agent.erc8004_url
        if (agent.wallet_address) id.wallet = agent.wallet_address
        if (agent.basename) id.basename = agent.basename
        return id
      })(),
      birthday: agent.birthday || agent.created_at,
      birthdayVerified: agent.birthday_verified === 1,
      canflyUrl: agentUrl,
      ...(ownerUsername ? { owner: ownerUsername } : {}),
      heartbeat: (() => {
        const lastSeen = agent.last_heartbeat as string | null
        if (!lastSeen) return { status: 'off', lastSeen: null }
        const diffMs = Date.now() - new Date(lastSeen).getTime()
        const diffMin = diffMs / 60000
        const status = diffMin <= 5 ? 'live' : diffMin <= 30 ? 'idle' : 'off'
        return { status, lastSeen }
      })(),
      milestones: milestonesResult.results.map((m) => ({
        date: m.date,
        title: m.title,
        description: m.description || undefined,
        trustLevel: m.trust_level,
        proof: m.proof || undefined,
      })),
      // Trust score (CAN-220)
      ...(trustRow ? {
        trustScore: Number(trustRow.trust_score),
        trustDetails: {
          completionRate: Number(trustRow.completion_rate),
          avgRating: Number(trustRow.avg_rating),
          totalTasks: Number(trustRow.total_tasks),
          totalRatings: Number(trustRow.total_ratings),
        },
      } : {}),
      // Buyer reputation (CAN-223)
      ...(trustRow && Number(trustRow.buyer_total_purchases) > 0 ? {
        buyerReputation: {
          trustScore: Number(trustRow.buyer_trust_score),
          totalPurchases: Number(trustRow.buyer_total_purchases),
          rejectCount: Number(trustRow.buyer_reject_count),
          rejectRate: Number(trustRow.buyer_reject_rate),
          avgPaySpeedHrs: Number(trustRow.buyer_avg_pay_speed_hrs),
        },
      } : {}),
    },
  }

  // Remove undefined values from _extensions
  const ext = agentCard._extensions as Record<string, unknown>
  for (const key of Object.keys(ext)) {
    if (ext[key] === undefined) delete ext[key]
  }
  // Clean milestone undefined fields
  const milestones = (ext.milestones as Record<string, unknown>[]) || []
  for (const m of milestones) {
    for (const key of Object.keys(m)) {
      if (m[key] === undefined) delete m[key]
    }
  }

  // ── Layer 3 override: if agent uploaded a full A2A card, merge it ──
  // Layer 3 fields take priority, but _extensions are always CanFly-managed
  if (agent.agent_card_override) {
    try {
      const override = JSON.parse(agent.agent_card_override as string) as Record<string, unknown>
      // Preserve CanFly-managed fields that should not be overridden
      const canflyExtensions = agentCard._extensions
      // Merge override into agentCard (Layer 3 wins for A2A standard fields)
      for (const key of Object.keys(override)) {
        if (key === '_extensions') continue // CanFly manages _extensions
        agentCard[key] = override[key]
      }
      // Merge any user _extensions with CanFly _extensions (CanFly wins on conflicts)
      if (override._extensions && typeof override._extensions === 'object') {
        const userExt = override._extensions as Record<string, unknown>
        const mergedExt = canflyExtensions as Record<string, unknown>
        for (const key of Object.keys(userExt)) {
          if (!(key in mergedExt)) {
            mergedExt[key] = userExt[key]
          }
        }
      }
      agentCard._extensions = canflyExtensions
    } catch {
      // Invalid JSON in override — fall back to auto-generated card
    }
  }

  return new Response(JSON.stringify(agentCard, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
