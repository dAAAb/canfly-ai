#!/usr/bin/env npx tsx
/**
 * 撈蝦引擎 v2 — Discord 來源
 *
 * Discovers potential users by scanning OpenClaw Discord server members.
 * Uses the Discord Bot API to list guild members with their roles and join dates.
 *
 * Dedup key: discord_id (stored in external_ids)
 *
 * Usage:
 *   npx tsx scripts/scrape-discord.ts [BASE_URL]
 *   Default BASE_URL: http://localhost:8788
 *
 * Environment:
 *   DISCORD_BOT_TOKEN — required, Discord bot token with Server Members Intent
 *   DISCORD_GUILD_ID  — required, the Discord server (guild) ID to scan
 *
 * Cron (recommended):
 *   0 4 * * * cd /path/to/canfly-ai && npx tsx scripts/scrape-discord.ts https://canfly.ai
 */

const CANFLY_URL = process.argv[2] || 'http://localhost:8788';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '';

const DISCORD_API = 'https://discord.com/api/v10';

// ── Types ───────────────────────────────────────────────────────────────

interface DiscordMember {
  user?: {
    id: string;
    username: string;
    discriminator: string;
    global_name?: string | null;
    avatar?: string | null;
    bot?: boolean;
  };
  nick?: string | null;
  roles: string[];
  joined_at: string;
}

interface DiscordRole {
  id: string;
  name: string;
  position: number;
  color: number;
}

interface DiscoveredDiscordUser {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  joinedAt: string;
  scrapeRef: string;
}

interface ScrapeResult {
  source: string;
  discovered: DiscoveredDiscordUser[];
  errors: string[];
}

// ── Discord API ─────────────────────────────────────────────────────────

async function discordFetch(path: string): Promise<Response> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'User-Agent': 'CanFly-ShrimpEngine/2.0',
    },
  });
  return res;
}

async function fetchGuildRoles(): Promise<Map<string, string>> {
  const roleMap = new Map<string, string>();
  try {
    const res = await discordFetch(`/guilds/${DISCORD_GUILD_ID}/roles`);
    if (!res.ok) {
      console.error(`  Warning: could not fetch roles (HTTP ${res.status})`);
      return roleMap;
    }
    const roles = (await res.json()) as DiscordRole[];
    for (const role of roles) {
      roleMap.set(role.id, role.name);
    }
  } catch (err) {
    console.error(`  Warning: role fetch failed — ${(err as Error).message}`);
  }
  return roleMap;
}

async function discoverFromDiscord(): Promise<ScrapeResult> {
  const result: ScrapeResult = { source: 'discord', discovered: [], errors: [] };

  // Fetch roles first so we can resolve role IDs to names
  const roleMap = await fetchGuildRoles();
  console.log(`  Roles loaded: ${roleMap.size}`);

  // Discord List Guild Members requires the Server Members Intent
  // Paginate with ?limit=1000&after=<last_user_id>
  let after = '0';
  const PAGE_SIZE = 1000;
  let totalFetched = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await discordFetch(
      `/guilds/${DISCORD_GUILD_ID}/members?limit=${PAGE_SIZE}&after=${after}`
    );

    if (res.status === 429) {
      // Rate limited — respect Retry-After
      const retryAfter = Number(res.headers.get('Retry-After') || '5');
      console.log(`  Rate limited — waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!res.ok) {
      result.errors.push(`Discord members API: HTTP ${res.status}`);
      break;
    }

    const members = (await res.json()) as DiscordMember[];

    if (!Array.isArray(members) || members.length === 0) {
      break;
    }

    for (const member of members) {
      // Skip bots and members without user data
      if (!member.user || member.user.bot) continue;

      const user = member.user;
      const resolvedRoles = member.roles
        .map((rid) => roleMap.get(rid) || rid)
        .filter((name) => name !== '@everyone');

      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
        : null;

      result.discovered.push({
        discordId: user.id,
        username: user.username,
        displayName: member.nick || user.global_name || user.username,
        avatarUrl,
        roles: resolvedRoles,
        joinedAt: member.joined_at,
        scrapeRef: `discord:${DISCORD_GUILD_ID}:${user.id}`,
      });
    }

    totalFetched += members.length;
    console.log(`  Fetched ${totalFetched} members so far...`);

    // Set pagination cursor to last user ID
    const lastMember = members[members.length - 1];
    if (!lastMember.user) break;
    after = lastMember.user.id;

    // If we got fewer than PAGE_SIZE, we've reached the end
    if (members.length < PAGE_SIZE) break;

    // Small delay to respect Discord rate limits
    await sleep(1000);
  }

  console.log(`  Discord: found ${result.discovered.length} non-bot members`);
  return result;
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

async function getExistingDiscordIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const res = await api('GET', '/api/community/users?limit=500');
    if (res.status === 200 && res.data.users) {
      for (const user of res.data.users as Array<Record<string, unknown>>) {
        const extIds =
          typeof user.external_ids === 'string'
            ? JSON.parse(user.external_ids as string)
            : (user.external_ids || {});
        if (extIds.discord && typeof extIds.discord === 'string') {
          ids.add(extIds.discord);
        }
      }
    }
  } catch (err) {
    console.error('  Warning: could not fetch existing users for dedup:', (err as Error).message);
  }
  return ids;
}

async function insertDiscordUser(
  member: DiscoveredDiscordUser
): Promise<{ ok: boolean; reason?: string }> {
  // Generate a CanFly username from the Discord username
  // Sanitize: only allow alphanumeric, hyphens, underscores; 2-30 chars
  const sanitized = member.username
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 26);

  // Add discord prefix to avoid collisions with GitHub-sourced usernames
  const username = sanitized.length >= 2 ? `dc-${sanitized}` : `dc-${member.discordId.slice(-8)}`;

  const roleStr =
    member.roles.length > 0 ? ` | Roles: ${member.roles.join(', ')}` : '';

  const res = await api('POST', '/api/community/users', {
    username,
    displayName: member.displayName,
    avatarUrl: member.avatarUrl,
    bio: `Discord community member${roleStr}`,
    links: {},
    source: 'scraped',
    claimed: 0,
    scrapeRef: member.scrapeRef,
    externalIds: { discord: member.discordId },
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
  console.log(`\n🦐 撈蝦引擎 v2 — Discord 來源`);
  console.log(`   Target: ${CANFLY_URL}`);
  console.log(`   Discord Bot Token: ${DISCORD_BOT_TOKEN ? '✅ set' : '❌ not set (required)'}`);
  console.log(`   Discord Guild ID: ${DISCORD_GUILD_ID || '❌ not set (required)'}\n`);

  if (!DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN is required. Create a bot at https://discord.com/developers/applications');
    process.exit(1);
  }
  if (!DISCORD_GUILD_ID) {
    console.error('❌ DISCORD_GUILD_ID is required. Right-click the server → Copy Server ID (enable Developer Mode in settings).');
    process.exit(1);
  }

  // Step 1: Discover members from Discord
  console.log('── Step 1: Scanning Discord server ────────────────────\n');

  const discordResult = await discoverFromDiscord();

  if (discordResult.discovered.length === 0) {
    console.log('  No members discovered. Exiting.\n');
    printErrors(discordResult.errors);
    return;
  }

  // Step 2: Dedup against existing CanFly users
  console.log('\n── Step 2: Deduplicating against existing users ──────\n');

  const existingIds = await getExistingDiscordIds();
  const newMembers = discordResult.discovered.filter(
    (m) => !existingIds.has(m.discordId)
  );

  console.log(`  Existing Discord IDs in DB: ${existingIds.size}`);
  console.log(`  New members to insert: ${newMembers.length} (skipped ${discordResult.discovered.length - newMembers.length} duplicates)\n`);

  if (newMembers.length === 0) {
    console.log('  All discovered members already exist. Nothing to insert.\n');
    printErrors(discordResult.errors);
    return;
  }

  // Step 3: Insert new users via CanFly API
  console.log('── Step 3: Inserting new users ────────────────────────\n');

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const member of newMembers) {
    const result = await insertDiscordUser(member);
    if (result.ok) {
      const roleTag = member.roles.length > 0 ? ` [${member.roles[0]}]` : '';
      console.log(`  ✅ ${member.displayName} (@${member.username})${roleTag}`);
      inserted++;
    } else if (result.reason === 'already exists') {
      console.log(`  ⚠️  ${member.username} — already exists`);
      skipped++;
    } else {
      console.log(`  ❌ ${member.username} — ${result.reason}`);
      failed++;
    }

    // Small delay to avoid overwhelming the API
    await sleep(200);
  }

  // Step 4: Summary
  console.log(`\n── Summary ───────────────────────────────────────────\n`);
  console.log(`  Source:     Discord Guild ${DISCORD_GUILD_ID}`);
  console.log(`  Discovered: ${discordResult.discovered.length} non-bot members`);
  console.log(`  Inserted:   ${inserted}`);
  console.log(`  Skipped:    ${skipped} (already exist)`);
  console.log(`  Failed:     ${failed}`);

  printErrors(discordResult.errors);

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
