/**
 * GET  /api/community/users — List users (paginated, filterable)
 * POST /api/community/users — Register a new user
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  generateEditToken,
  isValidUsername,
  isValidWalletAddress,
  parseBody,
  intParam,
} from '../_helpers'
import { emitFeedEvent } from '../../_feed'

// ── GET /api/community/users ────────────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  const skill = url.searchParams.get('skill') || ''
  const limit = Math.min(intParam(url, 'limit', 20), 100)
  const offset = intParam(url, 'offset', 0)

  let sql = `
    SELECT u.username, u.display_name, u.wallet_address, u.avatar_url,
           u.bio, u.links, u.is_public, u.external_ids, u.source, u.claimed,
           u.claimed_at, u.verification_level, u.created_at,
           (SELECT COUNT(*) FROM agents a WHERE a.owner_username = u.username AND a.is_public = 1) AS agent_count
    FROM users u
    WHERE u.is_public = 1
  `
  const params: unknown[] = []

  if (q) {
    sql += ` AND (u.username LIKE ?1 OR u.display_name LIKE ?1 OR u.bio LIKE ?1)`
    params.push(`%${q}%`)
  }

  if (skill) {
    sql += `
      AND u.username IN (
        SELECT a.owner_username FROM agents a
        JOIN skills s ON s.agent_name = a.name
        WHERE (s.name LIKE ?${params.length + 1} OR s.slug LIKE ?${params.length + 1})
        AND a.owner_username IS NOT NULL
      )
    `
    params.push(`%${skill}%`)
  }

  sql += ` ORDER BY u.created_at DESC LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`
  params.push(limit, offset)

  const result = await env.DB.prepare(sql)
    .bind(...params)
    .all()

  // Parse JSON fields
  const users = result.results.map((row: Record<string, unknown>) => ({
    ...row,
    links: JSON.parse((row.links as string) || '{}'),
    external_ids: JSON.parse((row.external_ids as string) || '{}'),
    isPublic: row.is_public === 1,
  }))

  return json({ users, limit, offset })
}

// ── POST /api/community/users ───────────────────────────────────────────
interface CreateUserBody {
  username: string
  displayName?: string
  walletAddress?: string
  avatarUrl?: string
  bio?: string
  links?: Record<string, string>
  // Privy user ID for cross-device profile resolution (email login)
  privyUserId?: string
  // Scraper fields (optional — used by scrape-community script)
  source?: 'seed' | 'scraped' | 'registered'
  claimed?: 0 | 1
  scrapeRef?: string
  externalIds?: Record<string, string>
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await parseBody<CreateUserBody>(request)
  if (!body) {
    return errorResponse('Invalid request body. Expected valid JSON.', 400)
  }
  if (!body.username) {
    return errorResponse('username is required', 400)
  }

  const { username, displayName, walletAddress, avatarUrl, bio, links,
          privyUserId, source, claimed, scrapeRef, externalIds } = body

  if (!isValidUsername(username)) {
    return errorResponse(
      'Invalid username. Must be 2-30 chars, alphanumeric/hyphens/underscores.',
      400
    )
  }

  // Input length validation
  if (displayName && displayName.length > 100) {
    return errorResponse('Display name must be 100 characters or less.', 400)
  }
  if (bio && bio.length > 280) {
    return errorResponse('Bio must be 280 characters or less.', 400)
  }
  if (avatarUrl && avatarUrl.length > 500) {
    return errorResponse('Avatar URL is too long.', 400)
  }
  if (walletAddress && !isValidWalletAddress(walletAddress)) {
    return errorResponse('Invalid wallet address: must be 0x + 40 hex characters', 400)
  }

  // Check if username already exists (case-insensitive to prevent dAAAb vs daaab conflicts)
  const existing = await env.DB.prepare('SELECT username FROM users WHERE username = ?1 COLLATE NOCASE')
    .bind(username)
    .first()
  if (existing) {
    return errorResponse('Username already taken', 409)
  }

  const editToken = generateEditToken()
  const now = new Date().toISOString()
  const isScraped = source === 'scraped'

  // Merge privyUserId into external_ids for cross-device profile resolution
  const mergedExternalIds = { ...(externalIds || {}) }
  if (privyUserId) mergedExternalIds.privy = privyUserId

  try {
    await env.DB.prepare(
      `INSERT INTO users (username, display_name, wallet_address, avatar_url, bio, links, edit_token,
                          source, claimed, scraped_at, scrape_ref, external_ids, privy_user_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
    )
      .bind(
        username,
        displayName || '',
        walletAddress || null,
        avatarUrl || null,
        bio || null,
        JSON.stringify(links || {}),
        editToken,
        source || 'registered',
        claimed ?? 1,
        isScraped ? now : null,
        scrapeRef || null,
        JSON.stringify(mergedExternalIds),
        privyUserId || null
      )
      .run()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      return errorResponse('Username already taken', 409)
    }
    return errorResponse('Registration failed. Please try again.', 500)
  }

  // Log activity (best-effort)
  const action = isScraped ? 'discovered' : 'joined'
  try {
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata) VALUES ('user', ?1, ?2, ?3)`
    )
      .bind(username, action, isScraped ? JSON.stringify({ source: scrapeRef }) : null)
      .run()
  } catch {
    // Activity logging is non-critical
  }

  // Live feed event (CAN-300) — only for real registrations, not scrapes
  if (!isScraped) {
    emitFeedEvent(env.DB, {
      event_type: 'user_registered',
      emoji: '🦞',
      actor: username,
      link: `/community/${username}`,
      message_en: `${displayName || username} joined the community`,
      message_zh_tw: `${displayName || username} 加入了社群`,
      message_zh_cn: `${displayName || username} 加入了社区`,
    })
  }

  return json({ username, editToken }, 201)
}

// ── OPTIONS (CORS preflight) ────────────────────────────────────────────
export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
