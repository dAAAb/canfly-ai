/**
 * GET /api/community/lookup-wallet?address=0x...
 * GET /api/community/lookup-wallet?privyId=did:privy:...
 * Also resolves basenames: checks users.links JSON for matching basename.
 * Returns { username, walletAddress } if found, 404 otherwise.
 *
 * NOTE: editToken is NOT returned here (security). The frontend should
 * check localStorage for the edit token after redirect.
 */
import { type Env, json, errorResponse, handleOptions } from './_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  const privyId = url.searchParams.get('privyId')

  // Privy ID lookup: check indexed privy_user_id column first, then external_ids.privy
  if (privyId) {
    // Fast path: indexed column lookup
    const userByColumn = await env.DB.prepare(
      `SELECT username, wallet_address FROM users WHERE privy_user_id = ?1`
    ).bind(privyId).first()

    if (userByColumn) {
      return json({
        username: userByColumn.username,
        walletAddress: userByColumn.wallet_address,
      })
    }

    // Fallback: check external_ids.privy for legacy entries
    const rows = await env.DB.prepare(
      `SELECT username, wallet_address, external_ids FROM users WHERE external_ids IS NOT NULL`
    ).all()

    for (const row of rows.results) {
      try {
        const ids = JSON.parse(row.external_ids as string)
        if (ids.privy === privyId) {
          return json({
            username: row.username,
            walletAddress: row.wallet_address,
          })
        }
      } catch { /* skip */ }
    }

    // Fall through to wallet lookup if address also provided, otherwise 404
    if (!address) {
      return errorResponse('No user found for this Privy ID', 404)
    }
  }

  if (!address) {
    return errorResponse('address or privyId query parameter is required', 400)
  }

  const normalizedAddress = address.trim()

  // 1. Direct wallet_address match (case-insensitive for hex addresses)
  let user = await env.DB.prepare(
    `SELECT username, wallet_address, links FROM users
     WHERE LOWER(wallet_address) = LOWER(?1) LIMIT 1`
  )
    .bind(normalizedAddress)
    .first()

  if (user) {
    return json({
      username: user.username,
      walletAddress: user.wallet_address,
    })
  }

  // 2. Check if address matches a basename in links JSON
  //    We search all users' links for a basename, then resolve it
  //    For now, do a LIKE search on the links column for the address
  //    (This is a fallback — primary match should be wallet_address)

  // 3. If the input looks like a basename (contains .base.eth or .eth),
  //    search links JSON for it
  if (normalizedAddress.includes('.eth') || normalizedAddress.includes('.base.eth')) {
    const allUsers = await env.DB.prepare(
      `SELECT username, wallet_address, links FROM users WHERE links IS NOT NULL`
    ).all()

    for (const u of allUsers.results) {
      try {
        const links = JSON.parse(u.links as string)
        if (
          links.basename &&
          links.basename.toLowerCase() === normalizedAddress.toLowerCase()
        ) {
          return json({
            username: u.username,
            walletAddress: u.wallet_address,
          })
        }
      } catch {
        // skip malformed JSON
      }
    }
  }

  return errorResponse('No user found for this wallet address', 404)
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
