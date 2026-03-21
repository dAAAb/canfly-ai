/**
 * GET /api/og/user/:username — Generate dynamic OG image for User Showcase
 */
import { type Env, errorResponse } from '../../community/_helpers'
import { userCard, renderOgImage, pngResponse } from '../_og'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const username = params.username as string

  const user = await env.DB.prepare(
    `SELECT username, display_name, avatar_url, bio, verification_level
     FROM users WHERE username = ?1 COLLATE NOCASE AND is_public = 1`
  )
    .bind(username)
    .first()

  if (!user) {
    return errorResponse('User not found', 404)
  }

  const agentCount = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM agents
     WHERE owner_username = ?1 COLLATE NOCASE AND is_public = 1`
  )
    .bind(user.username as string)
    .first<{ count: number }>()

  const node = userCard({
    displayName: (user.display_name as string) || (user.username as string),
    username: user.username as string,
    bio: user.bio as string | null,
    avatarUrl: user.avatar_url as string | null,
    verificationLevel: (user.verification_level as string) || 'none',
    agentCount: agentCount?.count ?? 0,
  })

  const png = await renderOgImage(node)
  return pngResponse(png)
}
