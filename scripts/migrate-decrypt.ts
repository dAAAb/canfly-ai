/**
 * Rollback migration: decrypt all encrypted fields back to plaintext.
 *
 * Usage:
 *   ENCRYPTION_KEY=<base64-key> npx tsx scripts/migrate-decrypt.ts
 *
 * Required env vars: same as migrate-encrypt.ts
 */

const PREFIX = 'enc:v1:'

async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function decrypt(value: string, key: CryptoKey): Promise<string> {
  if (!value || !value.startsWith(PREFIX)) return value
  const combined = Uint8Array.from(atob(value.slice(PREFIX.length)), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuf)
}

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_API_TOKEN = process.env.CF_API_TOKEN!
const D1_DATABASE_ID = process.env.D1_DATABASE_ID!
const D1_API = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`

async function d1Query(sql: string, params: string[] = []): Promise<{ results: Record<string, unknown>[] }> {
  const res = await fetch(D1_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  })
  const data = await res.json() as { result: Array<{ results: Record<string, unknown>[] }> }
  return { results: data.result?.[0]?.results || [] }
}

async function d1Execute(sql: string, params: string[] = []): Promise<void> {
  await fetch(D1_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  })
}

async function main() {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  if (!ENCRYPTION_KEY || !CF_ACCOUNT_ID || !CF_API_TOKEN || !D1_DATABASE_ID) {
    console.error('ERROR: ENCRYPTION_KEY, CF_ACCOUNT_ID, CF_API_TOKEN, D1_DATABASE_ID required')
    process.exit(1)
  }

  const key = await importKey(ENCRYPTION_KEY)
  let totalDecrypted = 0

  console.log('\n=== Rollback: decrypting v3_zeabur_deployments.metadata ===')
  const deployments = await d1Query('SELECT id, metadata FROM v3_zeabur_deployments WHERE metadata IS NOT NULL')
  for (const row of deployments.results) {
    const id = row.id as string
    const raw = row.metadata as string
    if (!raw || !raw.includes(PREFIX)) continue
    try {
      const meta = JSON.parse(raw)
      let changed = false
      if (meta.zeaburApiKey?.startsWith(PREFIX)) { meta.zeaburApiKey = await decrypt(meta.zeaburApiKey, key); changed = true }
      if (meta.aiHubKey?.startsWith(PREFIX)) { meta.aiHubKey = await decrypt(meta.aiHubKey, key); changed = true }
      if (changed) {
        await d1Execute('UPDATE v3_zeabur_deployments SET metadata = ?1 WHERE id = ?2', [JSON.stringify(meta), id])
        totalDecrypted++
        console.log(`  ✓ deployment ${id}`)
      }
    } catch (e) { console.error(`  ✗ deployment ${id}: ${e}`) }
  }

  console.log('\n=== Rollback: decrypting agents.agent_card_override ===')
  const agents = await d1Query("SELECT name, agent_card_override FROM agents WHERE agent_card_override IS NOT NULL")
  for (const row of agents.results) {
    const name = row.name as string
    const raw = row.agent_card_override as string
    if (!raw || !raw.includes(PREFIX)) continue
    try {
      const card = JSON.parse(raw)
      if (card.gateway_token?.startsWith(PREFIX)) {
        card.gateway_token = await decrypt(card.gateway_token, key)
        await d1Execute('UPDATE agents SET agent_card_override = ?1 WHERE name = ?2', [JSON.stringify(card), name])
        totalDecrypted++
        console.log(`  ✓ agent ${name}`)
      }
    } catch (e) { console.error(`  ✗ agent ${name}: ${e}`) }
  }

  console.log(`\n=== Rollback done. ${totalDecrypted} fields decrypted. ===`)
}

main().catch(e => { console.error('Rollback failed:', e); process.exit(1) })
