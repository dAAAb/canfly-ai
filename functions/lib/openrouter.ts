/**
 * OpenRouter management API helper — CAN-302
 *
 * Wraps https://openrouter.ai/api/v1/keys for provisioning per-lobster child
 * API keys. We always set `limit: 0`, which (verified 2026-04-25) allows free
 * model calls but blocks any call that costs USD with `403 Key limit exceeded`.
 *
 * The full child-key string is only returned ONCE at creation. Encrypt and
 * persist immediately, then discard the plaintext from memory.
 *
 * The management key itself is sensitive and lives in `env.OPENROUTER_MANAGEMENT_KEY`
 * (Cloudflare secret). It is account-scoped to the CanFly OpenRouter workspace.
 *
 * Child keys cannot self-escalate: every /v1/keys/* endpoint requires the
 * management key (verified — child keys get 401 "Invalid management key").
 *
 * See OPENROUTER-MANAGEMENT-API.md for the full research notes.
 */

const OR_BASE = 'https://openrouter.ai/api/v1'

export interface ManagedKeyMetadata {
  hash: string
  label: string
  disabled: boolean
  limit: number | null
  limit_remaining: number | null
  limit_reset: 'daily' | 'weekly' | 'monthly' | null
  include_byok_in_limit: boolean
  usage: number
  usage_daily: number
  usage_weekly: number
  usage_monthly: number
  byok_usage: number
  byok_usage_daily: number
  byok_usage_weekly: number
  byok_usage_monthly: number
  created_at: string
  updated_at: string | null
  expires_at: string | null
  creator_user_id: string | null
  workspace_id: string | null
}

export interface ManagedKeyResult {
  /** Hash used by all subsequent management ops (PATCH/GET/DELETE). */
  hash: string
  /** Masked label safe to log / show in UI (e.g. "sk-or-v1-a42...787"). */
  label: string
  /** Full key string. ONLY available at creation — encrypt and discard immediately. */
  key: string
}

interface OpenRouterModel {
  id: string
  pricing: { prompt: string; completion: string; [k: string]: string }
  expiration_date?: string | null
  context_length?: number
  name?: string
}

async function orFetch(
  managementKey: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${OR_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${managementKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

/**
 * Provision a new child API key.
 *
 * @param managementKey  CanFly's management key (env.OPENROUTER_MANAGEMENT_KEY)
 * @param name           Free-form name (e.g. `canfly-${username}-${slug}`) — visible in CanFly's OR dashboard
 * @param opts.limit     USD spending cap. Defaults to 0 = "free models only".
 * @param opts.includeByokInLimit  Defaults to false (we don't expose BYOK to provisioned keys)
 */
export async function createManagedKey(
  managementKey: string,
  name: string,
  opts?: { limit?: number; includeByokInLimit?: boolean }
): Promise<ManagedKeyResult> {
  const res = await orFetch(managementKey, '/keys', {
    method: 'POST',
    body: JSON.stringify({
      name,
      limit: opts?.limit ?? 0,
      include_byok_in_limit: opts?.includeByokInLimit ?? false,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter createKey failed: ${res.status} ${text}`)
  }
  const body = (await res.json()) as { data: ManagedKeyMetadata; key: string }
  return { hash: body.data.hash, label: body.data.label, key: body.key }
}

/** Permanently delete a child key. Idempotent — 404 is treated as already gone. */
export async function revokeManagedKey(managementKey: string, hash: string): Promise<void> {
  const res = await orFetch(managementKey, `/keys/${hash}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new Error(`OpenRouter revokeKey failed: ${res.status}`)
  }
}

/** Update key — typical use: raise limit on upgrade, or disable on suspend. */
export async function patchManagedKey(
  managementKey: string,
  hash: string,
  patch: { name?: string; limit?: number | null; disabled?: boolean }
): Promise<void> {
  const res = await orFetch(managementKey, `/keys/${hash}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    throw new Error(`OpenRouter patchKey failed: ${res.status}`)
  }
}

/** Fetch usage / limit metadata for a child key. */
export async function getKeyUsage(
  managementKey: string,
  hash: string
): Promise<ManagedKeyMetadata> {
  const res = await orFetch(managementKey, `/keys/${hash}`)
  if (!res.ok) {
    throw new Error(`OpenRouter getKey failed: ${res.status}`)
  }
  const body = (await res.json()) as { data: ManagedKeyMetadata }
  return body.data
}

/**
 * Validate that a model id is currently free *and* not flagged with an
 * `expiration_date`. This is the gate that prevents users from picking a model
 * that's days away from disappearing.
 *
 * Public endpoint — no auth required. Cached upstream by Cloudflare for ~1m.
 */
export async function isModelFreeAndStable(modelId: string): Promise<boolean> {
  const res = await fetch(`${OR_BASE}/models`)
  if (!res.ok) return false
  const body = (await res.json()) as { data: OpenRouterModel[] }
  const m = body.data.find((x) => x.id === modelId)
  if (!m) return false
  if (m.expiration_date) return false
  return m.pricing?.prompt === '0'
}

/**
 * Bulk fetch all current free, non-expiring OpenRouter models.
 * Used by the daily cron to disable any featured row that drifts away.
 */
export async function listStableFreeModelIds(): Promise<Set<string>> {
  const res = await fetch(`${OR_BASE}/models`)
  if (!res.ok) throw new Error(`OpenRouter listModels failed: ${res.status}`)
  const body = (await res.json()) as { data: OpenRouterModel[] }
  const ids = new Set<string>()
  for (const m of body.data) {
    if (m.pricing?.prompt === '0' && !m.expiration_date) ids.add(m.id)
  }
  return ids
}
