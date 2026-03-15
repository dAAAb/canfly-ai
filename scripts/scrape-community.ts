#!/usr/bin/env npx tsx
/**
 * 撈蝦引擎 v1 — ClawHub + GitHub User Discovery
 *
 * Discovers OpenClaw/ClawHub users from external sources and creates
 * unclaimed profiles on CanFly.ai for them to claim later.
 *
 * Sources (priority order):
 *   1. GitHub — search repos/topics for "openclaw" / "clawd" keywords
 *   2. ClawHub API — direct OpenClaw skill marketplace users (when available)
 *
 * Usage:
 *   npx tsx scripts/scrape-community.ts [BASE_URL]
 *   Default BASE_URL: http://localhost:8788
 *
 * Environment:
 *   GITHUB_TOKEN  — optional, raises rate limit from 10 → 30 req/min
 *   CLAWHUB_API   — optional, ClawHub API base URL (default: https://clawhub.ai/api)
 *
 * Cron (recommended):
 *   0 3 * * * cd /path/to/canfly-ai && npx tsx scripts/scrape-community.ts https://canfly.ai
 */

const BASE_URL = process.argv[2] || 'http://localhost:8788';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const CLAWHUB_API = process.env.CLAWHUB_API || 'https://clawhub.ai/api';

// ── Types ───────────────────────────────────────────────────────────────

interface DiscoveredUser {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  links: Record<string, string>;
  externalIds: Record<string, string>;
  scrapeRef: string; // e.g. 'github' or 'clawhub'
}

interface ScrapeResult {
  source: string;
  discovered: DiscoveredUser[];
  errors: string[];
}

// ── GitHub Discovery ────────────────────────────────────────────────────

const GITHUB_SEARCH_QUERIES = [
  'openclaw in:name,description,readme',
  'clawd in:name,description,readme',
  'topic:openclaw',
  'topic:clawd',
  'topic:agent-skills',
];

async function githubFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CanFly-ShrimpEngine/1.0',
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  return fetch(url, { headers });
}

async function discoverFromGitHub(): Promise<ScrapeResult> {
  const result: ScrapeResult = { source: 'github', discovered: [], errors: [] };
  const seenLogins = new Set<string>();

  for (const query of GITHUB_SEARCH_QUERIES) {
    try {
      const encoded = encodeURIComponent(query);
      const res = await githubFetch(
        `https://api.github.com/search/repositories?q=${encoded}&sort=updated&per_page=50`
      );

      if (res.status === 403) {
        result.errors.push(`GitHub rate limited on query: ${query}`);
        break; // stop all queries if rate-limited
      }

      if (!res.ok) {
        result.errors.push(`GitHub search failed (${res.status}) for: ${query}`);
        continue;
      }

      const data = (await res.json()) as {
        items: Array<{
          owner: {
            login: string;
            avatar_url: string;
            type: string;
            html_url: string;
          };
          full_name: string;
          html_url: string;
          description: string | null;
        }>;
      };

      for (const repo of data.items || []) {
        const login = repo.owner.login;

        // Skip orgs and already-seen users
        if (repo.owner.type !== 'User') continue;
        if (seenLogins.has(login.toLowerCase())) continue;
        seenLogins.add(login.toLowerCase());

        result.discovered.push({
          username: login,
          displayName: login,
          avatarUrl: repo.owner.avatar_url,
          bio: repo.description
            ? `Discovered via GitHub repo: ${repo.full_name}`
            : `GitHub user with OpenClaw/ClawHub activity`,
          links: {
            github: `https://github.com/${login}`,
          },
          externalIds: { github: login },
          scrapeRef: `github:${repo.html_url}`,
        });
      }

      // Respect rate limiting — wait 2s between queries
      await sleep(2000);
    } catch (err) {
      result.errors.push(`GitHub query error: ${(err as Error).message}`);
    }
  }

  console.log(`  GitHub: found ${result.discovered.length} unique users from ${GITHUB_SEARCH_QUERIES.length} queries`);
  return result;
}

// ── ClawHub Discovery ───────────────────────────────────────────────────

async function discoverFromClawHub(): Promise<ScrapeResult> {
  const result: ScrapeResult = { source: 'clawhub', discovered: [], errors: [] };

  // ClawHub API endpoints to try (best-effort — API may not be available yet)
  const endpoints = [
    '/users',
    '/skills/publishers',
    '/agents',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${CLAWHUB_API}${endpoint}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CanFly-ShrimpEngine/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        result.errors.push(`ClawHub ${endpoint}: ${res.status}`);
        continue;
      }

      const data = await res.json() as Record<string, unknown>;

      // Try to extract users from various possible response shapes
      const items = (
        Array.isArray(data) ? data :
        Array.isArray((data as Record<string, unknown>).users) ? (data as { users: unknown[] }).users :
        Array.isArray((data as Record<string, unknown>).publishers) ? (data as { publishers: unknown[] }).publishers :
        Array.isArray((data as Record<string, unknown>).items) ? (data as { items: unknown[] }).items :
        []
      ) as Array<Record<string, unknown>>;

      for (const item of items) {
        const username = (item.username || item.name || item.login || '') as string;
        if (!username || typeof username !== 'string') continue;

        result.discovered.push({
          username,
          displayName: (item.displayName || item.display_name || username) as string,
          avatarUrl: (item.avatarUrl || item.avatar_url || null) as string | null,
          bio: (item.bio || `Discovered on ClawHub`) as string,
          links: {
            clawhub: `${CLAWHUB_API.replace('/api', '')}/@${username}`,
          },
          externalIds: { clawhub: username },
          scrapeRef: `clawhub:${endpoint}`,
        });
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('abort') || msg.includes('timeout')) {
        result.errors.push(`ClawHub ${endpoint}: timeout (API may not be available yet)`);
      } else {
        result.errors.push(`ClawHub ${endpoint}: ${msg}`);
      }
    }
  }

  console.log(`  ClawHub: found ${result.discovered.length} users (errors: ${result.errors.length})`);
  return result;
}

// ── Dedup + Insert ──────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getExistingExternalIds(): Promise<Map<string, Set<string>>> {
  // Fetch all existing users and build a dedup map
  // Map<externalIdKey, Set<externalIdValue>>  e.g. Map<"github", Set<"octocat", "user2">>
  const map = new Map<string, Set<string>>();

  try {
    const res = await api('GET', '/api/community/users?limit=100');
    if (res.status === 200 && res.data.users) {
      for (const user of res.data.users as Array<Record<string, unknown>>) {
        // Parse external_ids from the DB
        const extIds = typeof user.external_ids === 'string'
          ? JSON.parse(user.external_ids as string)
          : (user.external_ids || {});

        for (const [key, value] of Object.entries(extIds)) {
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add((value as string).toLowerCase());
        }

        // Also dedup by username
        if (!map.has('_username')) map.set('_username', new Set());
        map.get('_username')!.add((user.username as string).toLowerCase());
      }
    }
  } catch (err) {
    console.error('  Warning: could not fetch existing users for dedup:', (err as Error).message);
  }

  return map;
}

function isDuplicate(user: DiscoveredUser, existingIds: Map<string, Set<string>>): boolean {
  // Check by username
  if (existingIds.get('_username')?.has(user.username.toLowerCase())) {
    return true;
  }

  // Check by external IDs
  for (const [key, value] of Object.entries(user.externalIds)) {
    if (existingIds.get(key)?.has(value.toLowerCase())) {
      return true;
    }
  }

  return false;
}

async function insertUser(user: DiscoveredUser): Promise<{ ok: boolean; reason?: string }> {
  const res = await api('POST', '/api/community/users', {
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    links: user.links,
    source: 'scraped',
    claimed: 0,
    scrapeRef: user.scrapeRef,
    externalIds: user.externalIds,
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
  console.log(`\n🦐 撈蝦引擎 v1 — CanFly Community Discovery`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   GitHub Token: ${GITHUB_TOKEN ? '✅ set' : '❌ not set (lower rate limit)'}`);
  console.log(`   ClawHub API: ${CLAWHUB_API}\n`);

  // Step 1: Discover users from all sources
  console.log('── Step 1: Discovering users ──────────────────────────\n');

  const [githubResult, clawhubResult] = await Promise.all([
    discoverFromGitHub(),
    discoverFromClawHub(),
  ]);

  // Merge all discovered users (GitHub first since higher confidence)
  const allDiscovered: DiscoveredUser[] = [
    ...githubResult.discovered,
    ...clawhubResult.discovered,
  ];

  // Cross-source dedup (same user found on both GitHub and ClawHub)
  const uniqueUsers: DiscoveredUser[] = [];
  const seenKeys = new Set<string>();
  for (const user of allDiscovered) {
    const key = user.username.toLowerCase();
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    uniqueUsers.push(user);
  }

  console.log(`\n  Total discovered: ${allDiscovered.length} (${uniqueUsers.length} unique after cross-source dedup)\n`);

  if (uniqueUsers.length === 0) {
    console.log('  No new users discovered. Exiting.\n');
    printErrors([...githubResult.errors, ...clawhubResult.errors]);
    return;
  }

  // Step 2: Dedup against existing CanFly users
  console.log('── Step 2: Deduplicating against existing users ──────\n');

  const existingIds = await getExistingExternalIds();
  const newUsers = uniqueUsers.filter((u) => !isDuplicate(u, existingIds));

  console.log(`  Existing users checked: ${existingIds.get('_username')?.size ?? 0}`);
  console.log(`  New users to insert: ${newUsers.length} (skipped ${uniqueUsers.length - newUsers.length} duplicates)\n`);

  if (newUsers.length === 0) {
    console.log('  All discovered users already exist. Nothing to insert.\n');
    printErrors([...githubResult.errors, ...clawhubResult.errors]);
    return;
  }

  // Step 3: Insert new users via API
  console.log('── Step 3: Inserting new users ────────────────────────\n');

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of newUsers) {
    const result = await insertUser(user);
    if (result.ok) {
      console.log(`  ✅ ${user.username} (${user.scrapeRef})`);
      inserted++;
    } else if (result.reason === 'already exists') {
      console.log(`  ⚠️  ${user.username} — already exists`);
      skipped++;
    } else {
      console.log(`  ❌ ${user.username} — ${result.reason}`);
      failed++;
    }

    // Small delay to avoid overwhelming the API
    await sleep(200);
  }

  // Step 4: Summary
  console.log(`\n── Summary ───────────────────────────────────────────\n`);
  console.log(`  Sources:    GitHub (${githubResult.discovered.length}) + ClawHub (${clawhubResult.discovered.length})`);
  console.log(`  Discovered: ${uniqueUsers.length} unique users`);
  console.log(`  Inserted:   ${inserted}`);
  console.log(`  Skipped:    ${skipped} (already exist)`);
  console.log(`  Failed:     ${failed}`);

  printErrors([...githubResult.errors, ...clawhubResult.errors]);

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
