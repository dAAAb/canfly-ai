/**
 * POST /api/pinata/deploy — Create a Pinata-hosted lobster (CAN-302)
 *
 * Synchronous orchestration (no webhook — Pinata's POST /v0/agents returns
 * immediately with the new agent id). On failure we roll back any external
 * resource we created, in reverse order: Pinata agent → Pinata secret →
 * OpenRouter child key → D1 rows.
 *
 * The user supplies a Pinata JWT (their account, their billing). CanFly
 * provides the OpenRouter child key out-of-band by calling the management
 * API with `limit: 0` so it can only run free models.
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
  isValidAgentName,
  toAgentSlug,
  generateApiKey,
  generatePairingCode,
  pairingCodeExpires,
} from '../community/_helpers'
import { authenticateRequest } from '../_auth'
import { importKey, encrypt } from '../../lib/crypto'
import {
  createManagedKey,
  revokeManagedKey,
  isModelFreeAndStable,
} from '../../lib/openrouter'
import {
  pinataListAgents,
  pinataCreateSecret,
  pinataCreateAgent,
  pinataDeleteAgent,
  pinataDeleteSecret,
  pinataAttachSecrets,
  PinataApiError,
} from '../../lib/pinata'

interface DeployBody {
  pinataJwt: string
  agentName: string                 // user-typed display name; we slug it
  agentDisplayName?: string
  agentBio?: string
  agentVibe?: string
  emoji?: string
  freeModelId: string               // must be in featured_free_models (active=1)
  templateId?: string | null        // Pinata Marketplace template; null = from scratch
  initialTask?: string
}

const MAX_CONCURRENT_DEPLOYMENTS = 3

function generateUUID(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function isFeatureEnabled(db: D1Database, flagName: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT enabled FROM feature_flags WHERE flag_name = ?1 AND scope = ?2 AND scope_id IS NULL`
  ).bind(flagName, 'global').first<{ enabled: number }>()
  return row?.enabled === 1
}

async function isFreeModelInWhitelist(db: D1Database, modelId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT id FROM featured_free_models WHERE id = ?1 AND active = 1`
  ).bind(modelId).first()
  return !!row
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    return await deployHandler(ctx)
  } catch (outerErr) {
    // Last-resort safety net so we always return JSON and never let the runtime
    // serve a generic HTML 502 — that crash mode left orphaned Pinata agents
    // and OR keys because our inner rollback never ran (verified 2026-04-26).
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr)
    const stack = outerErr instanceof Error ? outerErr.stack : ''
    console.error('[pinata/deploy] uncaught at top level:', msg, stack?.slice(0, 500))
    return errorResponse(`Deploy crashed: ${msg}`, 500)
  }
}

const deployHandler: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  // Guard 1: feature flag
  if (!(await isFeatureEnabled(env.DB, 'v3_pinata_deploy'))) {
    return errorResponse('Pinata deploy is currently disabled', 503)
  }

  // Guard 2: secrets present
  if (!env.OPENROUTER_MANAGEMENT_KEY) {
    return errorResponse('Server is missing OPENROUTER_MANAGEMENT_KEY', 500)
  }
  if (!env.ENCRYPTION_KEY) {
    return errorResponse('Server is missing ENCRYPTION_KEY', 500)
  }

  // Guard 3: auth
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)
  const username = auth.username

  // Parse + validate body
  const body = await parseBody<DeployBody>(request)
  if (!body) return errorResponse('Invalid JSON body', 400)
  if (!body.pinataJwt || !body.agentName || !body.freeModelId) {
    return errorResponse('pinataJwt, agentName, and freeModelId are required', 400)
  }
  if (!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body.pinataJwt)) {
    return errorResponse('Malformed pinataJwt', 400)
  }

  // Slugify name
  const agentDisplayName = body.agentDisplayName?.trim() || body.agentName.trim()
  const slug = toAgentSlug(body.agentName)
  if (!isValidAgentName(slug)) {
    return errorResponse('Invalid agent name. Slug must be 2-40 chars, lowercase letters, numbers, hyphens.', 400)
  }

  // Guard 4: name unique
  const existingAgent = await env.DB.prepare(
    `SELECT name FROM agents WHERE name = ?1`
  ).bind(slug).first()
  if (existingAgent) {
    return errorResponse('Agent name already taken', 409)
  }

  // Guard 5: concurrent deploy limit
  const active = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM v3_pinata_deployments
     WHERE owner_username = ?1 AND status IN ('pending', 'creating')`
  ).bind(username).first<{ cnt: number }>()
  if (active && active.cnt >= MAX_CONCURRENT_DEPLOYMENTS) {
    return errorResponse(`Maximum ${MAX_CONCURRENT_DEPLOYMENTS} concurrent deployments allowed`, 429)
  }

  // Guard 6: free model whitelist + freshness
  if (!(await isFreeModelInWhitelist(env.DB, body.freeModelId))) {
    return errorResponse('Selected model is not in the featured free list', 400)
  }
  if (!(await isModelFreeAndStable(body.freeModelId))) {
    return errorResponse('Selected model has been deprecated upstream — please pick another', 400)
  }

  const cryptoKey = await importKey(env.ENCRYPTION_KEY)

  // Track what we created so we can roll back on failure
  let openrouterKeyHash: string | null = null
  let pinataSecretId: string | null = null
  let pinataAgentId: string | null = null
  let agentRowInserted = false
  let deploymentId: string | null = null

  try {
    // Step A: validate Pinata JWT and fetch capacity
    console.log('[deploy] step A: pinataListAgents')
    const pinataAccount = await pinataListAgents(env, body.pinataJwt)
    if (pinataAccount.agentLimit > 0 && (pinataAccount.agents?.length ?? 0) >= pinataAccount.agentLimit) {
      return errorResponse(
        `Your Pinata account is at its agent limit (${pinataAccount.agentLimit}). Upgrade to PICNIC or use CanFly Zeabur.`,
        409,
      )
    }

    // Step B: provision OpenRouter child key (limit=0 → free-only)
    console.log('[deploy] step B: createManagedKey')
    const orKey = await createManagedKey(
      env.OPENROUTER_MANAGEMENT_KEY,
      `canfly-${username}-${slug}`,
      { limit: 0 },
    )
    openrouterKeyHash = orKey.hash

    // Step C: push the OR key into the Pinata Secrets Vault on the user's account.
    // Pinata stores secrets as plain env-var-style key→value pairs (no provider
    // enum). We use OPENROUTER_API_KEY because that's what OpenClaw reads at
    // runtime (matches aiProviderEnvVar('openrouter') in zeabur/deploy.ts).
    console.log('[deploy] step C: pinataCreateSecret')
    const secret = await pinataCreateSecret(env, body.pinataJwt, {
      name: 'OPENROUTER_API_KEY',
      value: orKey.key,
    })
    pinataSecretId = secret.id

    // Step D: create the Pinata agent itself. Pinata's POST /v0/agents only
    // accepts { name, description, vibe, emoji } — model/template/secrets are
    // configured separately (model via env var on the secret, template not
    // exposed via API yet, secrets via attach call below).
    console.log('[deploy] step D: pinataCreateAgent')
    const created = await pinataCreateAgent(env, body.pinataJwt, {
      name: agentDisplayName,
      description: body.agentBio,
      emoji: body.emoji,
      vibe: body.agentVibe,
    })
    pinataAgentId = created.agentId

    // Step E: attach the secret to the agent so OpenClaw runtime sees it as
    // OPENROUTER_API_KEY. POST /v0/agents/{id}/secrets body { secretIds: [...] }.
    console.log(`[deploy] step E: pinataAttachSecrets agent=${created.agentId}`)
    await pinataAttachSecrets(env, body.pinataJwt, created.agentId, [secret.id])

    // Step F: persist deployment row (encrypt sensitive fields)
    // ⚠️ Must run BEFORE the slow restart+setDefaultModel so we always have a
    // DB row even if Cloudflare cuts us off at the 30s wall-clock. The slow
    // steps run via waitUntil() AFTER we return success to the user.
    deploymentId = generateUUID()
    const encryptedJwt = await encrypt(body.pinataJwt, cryptoKey)
    const encryptedKey = await encrypt(orKey.key, cryptoKey)

    await env.DB.prepare(
      `INSERT INTO v3_pinata_deployments
        (id, owner_username, pinata_agent_id, pinata_workspace, status,
         deploy_url, free_model_id, openrouter_key_hash, metadata)
       VALUES (?1, ?2, ?3, ?4, 'running', ?5, ?6, ?7, ?8)`
    ).bind(
      deploymentId,
      username,
      created.agentId,
      null, // workspace id not exposed by JWT response shape — leave null until spike confirms
      `https://app.pinata.cloud/agents/${created.agentId}`,
      body.freeModelId,
      orKey.hash,
      JSON.stringify({
        pinataJwt: encryptedJwt,
        pinataSecretId: secret.id,
        openrouterKey: encryptedKey,
        openrouterKeyLabel: orKey.label,
        agentLimit: pinataAccount.agentLimit,
        timeCreditsAtCreate: pinataAccount.timeCredits,
        pinataPlan: pinataAccount.agentLimit === 1 ? 'FREE' : 'PAID',
        agentDisplayName,
        emoji: body.emoji ?? null,
        vibe: body.agentVibe ?? null,
        templateId: body.templateId ?? null,
      }),
    ).run()

    // Step G: register the agent in CanFly's `agents` table
    const apiKey = generateApiKey()
    const pairingCode = generatePairingCode()
    const expires = pairingCodeExpires()

    await env.DB.prepare(
      `INSERT INTO agents (name, display_name, owner_username, platform, avatar_url, bio, model,
                           hosting, capabilities, is_public, edit_token, source,
                           api_key, pairing_code, pairing_code_expires, registration_source)
       VALUES (?1, ?2, ?3, 'openclaw', NULL, ?4, ?5,
               'pinata', ?6, 1, ?7, 'registered',
               ?8, ?9, ?10, 'pinata_deploy')`
    ).bind(
      slug,
      agentDisplayName,
      username,
      body.agentBio || `Hosted on Pinata Agents (${body.templateId || 'from scratch'})`,
      body.freeModelId,
      JSON.stringify({
        pinataAgentId: created.agentId,
        deployUrl: `https://app.pinata.cloud/agents/${created.agentId}`,
      }),
      apiKey,
      apiKey,
      pairingCode,
      expires,
    ).run()
    agentRowInserted = true

    // Link deployment row to agent
    await env.DB.prepare(
      `UPDATE v3_pinata_deployments SET agent_name = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(slug, deploymentId).run()

    // Activity log
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('deployment', ?1, 'pinata_deploy_completed', ?2)`
    ).bind(deploymentId, JSON.stringify({
      owner: username,
      agentName: slug,
      pinataAgentId: created.agentId,
      freeModelId: body.freeModelId,
    })).run()

    // Step H is now a SEPARATE endpoint: POST /api/agents/:name/finalize-pinata
    //
    // Tried using ctx.waitUntil() here originally, but CF Pages Functions
    // appear to apply a single 30s wall-clock budget across the entire
    // request lifecycle including waitUntil work. With the relay round-trips
    // for restart + 5s sleep + `openclaw config set` exec, the background
    // finalize never completed (verified: activity_log only got
    // `pinata_deploy_completed`, never `pinata_deploy_finalized`).
    //
    // The wizard frontend calls /finalize-pinata immediately after this
    // endpoint returns 201 (in a fresh request, fresh budget). Settings page
    // and Telegram bind also re-apply the same finalize.
    return json({
      deploymentId,
      agentName: slug,
      agentDisplayName,
      pinataAgentId: created.agentId,
      pairingCode,
      apiKey,
      status: 'running',
      message: 'Pinata lobster ready. Default model is being applied in the background; visit settings to bind Telegram.',
    }, 201)
  } catch (err) {
    // ── Return JSON immediately, run rollback in the background ─────
    // Each Pinata rollback call can take up to 8s if upstream hangs. Doing
    // them inline burns the same wall-clock that already failed once, so CF
    // serves a generic HTML 502 and the user gets no actionable error. We
    // ship the JSON error first, then let waitUntil() finish the cleanup.
    const errMsg = err instanceof Error ? err.message : 'unknown error'
    console.error('[pinata/deploy] failed:', errMsg)

    waitUntil((async () => {
      const rollbackErrors: string[] = []
      if (agentRowInserted) {
        try { await env.DB.prepare(`DELETE FROM agents WHERE name = ?1`).bind(slug).run() }
        catch (e) { rollbackErrors.push(`agents row: ${e instanceof Error ? e.message : 'fail'}`) }
      }
      if (pinataAgentId) {
        try { await pinataDeleteAgent(env, body.pinataJwt, pinataAgentId) }
        catch (e) { rollbackErrors.push(`pinata agent ${pinataAgentId}: ${e instanceof Error ? e.message : 'fail'}`) }
      }
      if (pinataSecretId) {
        try { await pinataDeleteSecret(env, body.pinataJwt, pinataSecretId) }
        catch (e) { rollbackErrors.push(`pinata secret ${pinataSecretId}: ${e instanceof Error ? e.message : 'fail'}`) }
      }
      if (openrouterKeyHash) {
        try { await revokeManagedKey(env.OPENROUTER_MANAGEMENT_KEY, openrouterKeyHash) }
        catch (e) { rollbackErrors.push(`openrouter key ${openrouterKeyHash}: ${e instanceof Error ? e.message : 'fail'}`) }
      }
      if (deploymentId) {
        try {
          await env.DB.prepare(
            `UPDATE v3_pinata_deployments
             SET status='failed', error_message=?1, updated_at=datetime('now')
             WHERE id=?2`
          ).bind(`${errMsg}${rollbackErrors.length ? ` | rollback issues: ${rollbackErrors.join('; ')}` : ''}`, deploymentId).run()
        } catch { /* ignore */ }
      }
      try {
        await env.DB.prepare(
          `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
           VALUES ('deployment', ?1, 'pinata_deploy_failed', ?2)`
        ).bind(deploymentId || slug, JSON.stringify({
          owner: username, agentName: slug, error: errMsg, rollbackErrors,
        })).run()
      } catch { /* ignore */ }
    })())

    // Map upstream errors to client-facing status
    if (err instanceof PinataApiError) {
      if (err.status === 401 || err.status === 403) {
        return errorResponse(`Pinata rejected the JWT (${err.status}). Re-paste a fresh admin-scope key.`, err.status)
      }
      return errorResponse(`Pinata upstream error: ${errMsg}`, 502)
    }
    return errorResponse(`Deploy failed: ${errMsg}`, 502)
  }
}
