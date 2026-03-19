/**
 * GET /api/community/lookup-wallet?address=0x...
 * Also resolves basenames: checks users.links JSON for matching basename.
 * Returns { username, editToken? } if found, 404 otherwise.
 *
 * NOTE: editToken is NOT returned here (security). The frontend should
 * check localStorage for the edit token after redirect.
 */
import { type Env, json, errorResponse, handleOptions } from './_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')

  if (!address) {
    return errorResponse('address query parameter is required', 400)
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
