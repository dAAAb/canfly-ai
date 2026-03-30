/**
 * One-time migration: encrypt sensitive fields in D1.
 *
 * Usage:
 *   ENCRYPTION_KEY=<base64-key> npx tsx scripts/migrate-encrypt.ts
 *
 * Or run via wrangler:
 *   wrangler d1 execute canfly-community --local --file=<generated-sql>
 *
 * This script connects to D1 via the Cloudflare REST API.
 * Required env vars:
 *   ENCRYPTION_KEY    — base64-encoded 256-bit AES key
 *   CF_ACCOUNT_ID     — Cloudflare account ID
 *   CF_API_TOKEN      — Cloudflare API token with D1 write access
 *   D1_DATABASE_ID    — D1 database UUID
 *
 * Idempotent: skips values already prefixed with "enc:v1:".
 */

const PREFIX = 'enc:v1:'

async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(cipherBuf), iv.length)
  return PREFIX + btoa(String.fromCharCode(...combined))
}

function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

// ── Cloudflare D1 REST API helpers ──

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_API_TOKEN = process.env.CF_API_TOKEN!
const D1_DATABASE_ID = process.env.D1_DATABASE_ID!
const D1_API = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`

async function d1Query(sql: string, params: string[] = []): Promise<{ results: Record<string, unknown>[] }> {
  const res = await fetch(D1_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  })
  const data = await res.json() as { result: Array<{ results: Record<string, unknown>[] }> }
  return { results: data.result?.[0]?.results || [] }
}

async function d1Execute(sql: string, params: string[] = []): Promise<void> {
  await fetch(D1_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  })
}

async function main() {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) {
    console.error('ERROR: ENCRYPTION_KEY env var is required')
    process.exit(1)
  }
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !D1_DATABASE_ID) {
    console.error('ERROR: CF_ACCOUNT_ID, CF_API_TOKEN, and D1_DATABASE_ID env vars are required')
    process.exit(1)
  }

  const key = await importKey(ENCRYPTION_KEY)
  let totalEncrypted = 0

  // ── 1. Encrypt zeaburApiKey + aiHubKey in v3_zeabur_deployments.metadata ──
  console.log('\n=== Migrating v3_zeabur_deployments.metadata ===')
  const deployments = await d1Query('SELECT id, metadata FROM v3_zeabur_deployments WHERE metadata IS NOT NULL')

  for (const row of deployments.results) {
    const id = row.id as string
    const raw = row.metadata as string
    if (!raw || raw === '{}') continue

    try {
      const meta = JSON.parse(raw)
      let changed = false

      if (meta.zeaburApiKey && !isEncrypted(meta.zeaburApiKey)) {
        meta.zeaburApiKey = await encrypt(meta.zeaburApiKey, key)
        changed = true
      }
      if (meta.aiProviderKey && !isEncrypted(meta.aiProviderKey)) {
        meta.aiProviderKey = await encrypt(meta.aiProviderKey, key)
        changed = true
      }
      if (meta.aiHubKey && !isEncrypted(meta.aiHubKey)) {
        meta.aiHubKey = await encrypt(meta.aiHubKey, key)
        changed = true
      }

      if (changed) {
        await d1Execute(
          'UPDATE v3_zeabur_deployments SET metadata = ?1 WHERE id = ?2',
          [JSON.stringify(meta), id]
        )
        totalEncrypted++
        console.log(`  ✓ deployment ${id}`)
      } else {
        console.log(`  — deployment ${id} (already encrypted or no sensitive fields)`)
      }
    } catch (e) {
      console.error(`  ✗ deployment ${id}: ${e}`)
    }
  }

  // ── 2. Encrypt gateway_token in agents.agent_card_override ──
  console.log('\n=== Migrating agents.agent_card_override ===')
  const agents = await d1Query(
    "SELECT name, agent_card_override FROM agents WHERE agent_card_override IS NOT NULL AND agent_card_override != '{}'"
  )

  for (const row of agents.results) {
    const name = row.name as string
    const raw = row.agent_card_override as string
    if (!raw) continue

    try {
      const card = JSON.parse(raw)

      if (card.gateway_token && !isEncrypted(card.gateway_token)) {
        card.gateway_token = await encrypt(card.gateway_token, key)
        await d1Execute(
          'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2',
          [JSON.stringify(card), name]
        )
        totalEncrypted++
        console.log(`  ✓ agent ${name}`)
      } else {
        console.log(`  — agent ${name} (already encrypted or no gateway_token)`)
      }
    } catch (e) {
      console.error(`  ✗ agent ${name}: ${e}`)
    }
  }

  console.log(`\n=== Done. ${totalEncrypted} fields encrypted. ===`)
}

main().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
