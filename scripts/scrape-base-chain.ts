#!/usr/bin/env npx tsx
/**
 * 撈蝦引擎 v2 — Base Chain 來源
 *
 * Discovers users on Base chain by scanning:
 *   1. AgentBook contract interactions (registered agents on Base)
 *   2. .base.eth (Basename) domain holders via Basescan token transfers
 *
 * Dedup key: wallet_address (lowercase)
 *
 * Usage:
 *   npx tsx scripts/scrape-base-chain.ts [BASE_URL]
 *   Default BASE_URL: http://localhost:8788
 *
 * Environment:
 *   BASESCAN_API_KEY — required, get from https://basescan.org/apis
 *   BASE_RPC_URL     — optional, Base mainnet RPC (default: https://mainnet.base.org)
 *
 * Cron (recommended):
 *   30 3 * * * cd /path/to/canfly-ai && npx tsx scripts/scrape-base-chain.ts https://canfly.ai
 */

const CANFLY_URL = process.argv[2] || 'http://localhost:8788';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || '';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// AgentBook contract on Base mainnet
const AGENTBOOK_CONTRACT = '0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4';

// Base Registrar Controller — the contract that handles .base.eth registrations
// See: https://docs.base.org/docs/tools/basenames
const BASENAME_REGISTRAR = '0x4cCb0720c37C1658fa6e9588B1aC86baCDfab812';

// ── Types ───────────────────────────────────────────────────────────────

interface DiscoveredWallet {
  walletAddress: string; // checksummed or lowercase 0x...
  source: 'agentbook' | 'basename';
  basename?: string;     // e.g. "alice.base.eth"
  txHash?: string;       // discovery transaction
  scrapeRef: string;     // provenance
}

interface ScrapeResult {
  source: string;
  discovered: DiscoveredWallet[];
  errors: string[];
}

// ── Basescan API ────────────────────────────────────────────────────────

async function basescanFetch(params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({
    ...params,
    apikey: BASESCAN_API_KEY,
  });
  const url = `https://api.basescan.org/api?${qs}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CanFly-ShrimpEngine/2.0' },
  });

  if (!res.ok) {
    throw new Error(`Basescan HTTP ${res.status}`);
  }

  const data = (await res.json()) as { status: string; message: string; result: unknown };

  // Basescan returns status "0" with "No transactions found" for empty results
  if (data.status === '0' && data.message === 'No transactions found') {
    return [];
  }
  if (data.status === '0' && typeof data.result === 'string') {
    throw new Error(`Basescan error: ${data.result}`);
  }

  return data.result;
}

// ── AgentBook Discovery ─────────────────────────────────────────────────

async function discoverFromAgentBook(): Promise<ScrapeResult> {
  const result: ScrapeResult = { source: 'agentbook', discovered: [], errors: [] };
  const seenWallets = new Set<string>();

  try {
    // Get all transactions TO the AgentBook contract (registrations)
    const txs = (await basescanFetch({
      module: 'account',
      action: 'txlist',
      address: AGENTBOOK_CONTRACT,
      startblock: '0',
      endblock: '99999999',
      sort: 'desc',
      page: '1',
      offset: '500', // last 500 txs
    })) as Array<{
      from: string;
      hash: string;
      isError: string;
      functionName: string;
    }>;

    if (!Array.isArray(txs)) {
      result.errors.push('AgentBook: unexpected response format');
      return result;
    }

    for (const tx of txs) {
      // Only successful transactions
      if (tx.isError === '1') continue;

      const wallet = tx.from.toLowerCase();
      if (seenWallets.has(wallet)) continue;
      seenWallets.add(wallet);

      result.discovered.push({
        walletAddress: wallet,
        source: 'agentbook',
        txHash: tx.hash,
        scrapeRef: `base:agentbook:${tx.hash}`,
      });
    }

    console.log(`  AgentBook: found ${result.discovered.length} unique wallets from contract interactions`);
  } catch (err) {
    result.errors.push(`AgentBook scan failed: ${(err as Error).message}`);
    console.error(`  AgentBook: error — ${(err as Error).message}`);
  }

  return result;
}

// ── Basename (.base.eth) Discovery ──────────────────────────────────────

async function discoverFromBasenames(): Promise<ScrapeResult> {
  const result: ScrapeResult = { source: 'basename', discovered: [], errors: [] };
  const seenWallets = new Set<string>();

  try {
    // Scan recent transactions to the Basename Registrar Controller
    const txs = (await basescanFetch({
      module: 'account',
      action: 'txlist',
      address: BASENAME_REGISTRAR,
      startblock: '0',
      endblock: '99999999',
      sort: 'desc',
      page: '1',
      offset: '500',
    })) as Array<{
      from: string;
      hash: string;
      isError: string;
      input: string;
      functionName: string;
    }>;

    if (!Array.isArray(txs)) {
      result.errors.push('Basename: unexpected response format');
      return result;
    }

    for (const tx of txs) {
      if (tx.isError === '1') continue;

      const wallet = tx.from.toLowerCase();
      if (seenWallets.has(wallet)) continue;
      seenWallets.add(wallet);

      // Try to extract the registered name from the function call
      const basename = extractBasenameFromInput(tx.functionName, tx.input);

      result.discovered.push({
        walletAddress: wallet,
        source: 'basename',
        basename: basename ? `${basename}.base.eth` : undefined,
        txHash: tx.hash,
        scrapeRef: `base:basename:${tx.hash}`,
      });
    }

    console.log(`  Basename: found ${result.discovered.length} unique wallets from registrar interactions`);
  } catch (err) {
    result.errors.push(`Basename scan failed: ${(err as Error).message}`);
    console.error(`  Basename: error — ${(err as Error).message}`);
  }

  return result;
}

/**
 * Best-effort extraction of the registered name from tx input data.
 * The register function typically has the name as a string parameter.
 * Returns null if extraction fails (that's fine — wallet is the dedup key).
 */
function extractBasenameFromInput(functionName: string, input: string): string | null {
  // Only try on register-like functions
  if (!functionName || !functionName.toLowerCase().includes('register')) {
    return null;
  }

  try {
    // ABI-encoded string parameters: skip selector (4 bytes = 8 hex chars + 0x prefix)
    // The name is usually the first string parameter
    const data = input.slice(10); // remove 0x + 4-byte selector

    // Find string data: look for offset pointer, then length + data
    // For simple cases, the name string offset is at position 0
    // This is a best-effort decoder — we don't need 100% accuracy
    if (data.length < 128) return null;

    // Read the offset to the string data (first 32 bytes)
    const offsetHex = data.slice(0, 64);
    const offset = parseInt(offsetHex, 16) * 2; // convert byte offset to hex char offset

    if (offset >= data.length) return null;

    // Read string length (32 bytes at offset)
    const lengthHex = data.slice(offset, offset + 64);
    const strLength = parseInt(lengthHex, 16);

    if (strLength === 0 || strLength > 100) return null;

    // Read string data
    const strHex = data.slice(offset + 64, offset + 64 + strLength * 2);
    const decoded = Buffer.from(strHex, 'hex').toString('utf8');

    // Validate: should be a reasonable domain name
    if (/^[a-z0-9][a-z0-9-]{0,62}$/i.test(decoded)) {
      return decoded.toLowerCase();
    }
  } catch {
    // extraction failed — that's fine
  }

  return null;
}

// ── Reverse Basename Resolution via RPC ─────────────────────────────────

async function resolveBasename(walletAddress: string): Promise<string | null> {
  try {
    // Use Base mainnet ENS reverse resolution
    // Base uses the standard ENS reverse resolution at addr.reverse
    const res = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            // ENS Universal Resolver on Base for reverse lookup
            to: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD', // Base ENS reverse registrar
            data: encodeReverseResolve(walletAddress),
          },
          'latest',
        ],
      }),
    });

    const data = (await res.json()) as { result?: string; error?: unknown };
    if (data.result && data.result !== '0x' && data.result.length > 66) {
      const name = decodeStringResult(data.result);
      if (name && name.endsWith('.base.eth')) {
        return name;
      }
    }
  } catch {
    // reverse resolution not available — fine
  }

  return null;
}

function encodeReverseResolve(address: string): string {
  // name(bytes32 node) — ENS reverse resolution
  // We encode the reverse node for the address
  // This is simplified; full implementation would use namehash
  // For now, skip RPC resolution and rely on tx input extraction
  return '0x';
}

function decodeStringResult(hex: string): string | null {
  try {
    const data = hex.slice(2);
    if (data.length < 128) return null;
    const offset = parseInt(data.slice(0, 64), 16) * 2;
    const length = parseInt(data.slice(offset, offset + 64), 16);
    if (length === 0 || length > 200) return null;
    const strHex = data.slice(offset + 64, offset + 64 + length * 2);
    return Buffer.from(strHex, 'hex').toString('utf8');
  } catch {
    return null;
  }
}

// ── CanFly API ──────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown) {
  const url = `${CANFLY_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getExistingWallets(): Promise<Set<string>> {
  const wallets = new Set<string>();
  try {
    const res = await api('GET', '/api/community/users?limit=500');
    if (res.status === 200 && res.data.users) {
      for (const user of res.data.users as Array<Record<string, unknown>>) {
        if (user.wallet_address && typeof user.wallet_address === 'string') {
          wallets.add(user.wallet_address.toLowerCase());
        }
      }
    }
  } catch (err) {
    console.error('  Warning: could not fetch existing wallets for dedup:', (err as Error).message);
  }
  return wallets;
}

async function insertWalletUser(wallet: DiscoveredWallet): Promise<{ ok: boolean; reason?: string }> {
  // Generate a username from the wallet address (first 6 + last 4)
  const addr = wallet.walletAddress.toLowerCase();
  const username = `base-${addr.slice(2, 8)}-${addr.slice(-4)}`;

  const links: Record<string, string> = {
    basescan: `https://basescan.org/address/${addr}`,
  };
  if (wallet.basename) {
    links.basename = wallet.basename;
  }

  const res = await api('POST', '/api/community/users', {
    username,
    displayName: wallet.basename || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    avatarUrl: null,
    bio: wallet.source === 'agentbook'
      ? `On-chain agent registered on Base AgentBook`
      : wallet.basename
        ? `Basename holder: ${wallet.basename}`
        : `Active on Base chain`,
    walletAddress: addr,
    links,
    source: 'scraped',
    claimed: 0,
    scrapeRef: wallet.scrapeRef,
    externalIds: { base_wallet: addr },
  });

  if (res.status === 201) return { ok: true };
  if (res.status === 409) return { ok: false, reason: 'already exists' };
  return { ok: false, reason: `HTTP ${res.status}: ${JSON.stringify(res.data)}` };
}

// ── Utilities ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🦐 撈蝦引擎 v2 — Base Chain 來源`);
  console.log(`   Target: ${CANFLY_URL}`);
  console.log(`   Basescan API Key: ${BASESCAN_API_KEY ? '✅ set' : '❌ not set (required)'}`);
  console.log(`   Base RPC: ${BASE_RPC_URL}`);
  console.log(`   AgentBook: ${AGENTBOOK_CONTRACT}`);
  console.log(`   Basename Registrar: ${BASENAME_REGISTRAR}\n`);

  if (!BASESCAN_API_KEY) {
    console.error('❌ BASESCAN_API_KEY is required. Get one at https://basescan.org/apis');
    process.exit(1);
  }

  // Step 1: Discover wallets from Base chain sources
  console.log('── Step 1: Scanning Base chain ────────────────────────\n');

  const agentbookResult = await discoverFromAgentBook();

  // Basescan rate limit: 5 calls/sec on free tier — wait between sources
  await sleep(1000);

  const basenameResult = await discoverFromBasenames();

  // Merge all discovered wallets (AgentBook first — higher signal)
  const allDiscovered: DiscoveredWallet[] = [
    ...agentbookResult.discovered,
    ...basenameResult.discovered,
  ];

  // Cross-source dedup by wallet_address
  const uniqueWallets: DiscoveredWallet[] = [];
  const seenWallets = new Set<string>();

  for (const w of allDiscovered) {
    const key = w.walletAddress.toLowerCase();
    if (seenWallets.has(key)) continue;
    seenWallets.add(key);
    uniqueWallets.push(w);
  }

  console.log(`\n  Total discovered: ${allDiscovered.length} (${uniqueWallets.length} unique after cross-source dedup)\n`);

  if (uniqueWallets.length === 0) {
    console.log('  No wallets discovered. Exiting.\n');
    printErrors([...agentbookResult.errors, ...basenameResult.errors]);
    return;
  }

  // Step 2: Dedup against existing CanFly users
  console.log('── Step 2: Deduplicating against existing users ──────\n');

  const existingWallets = await getExistingWallets();
  const newWallets = uniqueWallets.filter(
    (w) => !existingWallets.has(w.walletAddress.toLowerCase())
  );

  console.log(`  Existing wallets in DB: ${existingWallets.size}`);
  console.log(`  New wallets to insert: ${newWallets.length} (skipped ${uniqueWallets.length - newWallets.length} duplicates)\n`);

  if (newWallets.length === 0) {
    console.log('  All discovered wallets already exist. Nothing to insert.\n');
    printErrors([...agentbookResult.errors, ...basenameResult.errors]);
    return;
  }

  // Step 3: Insert new users via CanFly API
  console.log('── Step 3: Inserting new users ────────────────────────\n');

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const wallet of newWallets) {
    const result = await insertWalletUser(wallet);
    if (result.ok) {
      const label = wallet.basename || wallet.walletAddress.slice(0, 10) + '...';
      console.log(`  ✅ ${label} (${wallet.source})`);
      inserted++;
    } else if (result.reason === 'already exists') {
      console.log(`  ⚠️  ${wallet.walletAddress.slice(0, 10)}... — already exists`);
      skipped++;
    } else {
      console.log(`  ❌ ${wallet.walletAddress.slice(0, 10)}... — ${result.reason}`);
      failed++;
    }

    // Small delay to avoid overwhelming the API
    await sleep(200);
  }

  // Step 4: Summary
  console.log(`\n── Summary ───────────────────────────────────────────\n`);
  console.log(`  Sources:    AgentBook (${agentbookResult.discovered.length}) + Basename (${basenameResult.discovered.length})`);
  console.log(`  Discovered: ${uniqueWallets.length} unique wallets`);
  console.log(`  Inserted:   ${inserted}`);
  console.log(`  Skipped:    ${skipped} (already exist)`);
  console.log(`  Failed:     ${failed}`);

  printErrors([...agentbookResult.errors, ...basenameResult.errors]);

  console.log('');
  if (failed > 0) process.exit(1);
}

function printErrors(errors: string[]) {
  if (errors.length > 0) {
    console.log(`\n  ⚠️  Errors/Warnings:`);
    for (const err of errors) {
      console.log(`     - ${err}`);
    }
  }
}

main().catch((err) => {
  console.error('Scraper failed:', err.message);
  process.exit(1);
});
