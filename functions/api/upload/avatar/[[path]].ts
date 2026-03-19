/**
 * GET /api/upload/avatar/* — Serve avatar images from R2
 * Catch-all route for paths like /api/upload/avatar/agent/name/123.jpg
 */
import { type Env, CORS_HEADERS, handleOptions } from '../../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const pathParts = params.path as string[]
  const key = pathParts.join('/')

  if (!key) {
    return new Response('Avatar key required', { status: 400 })
  }

  const object = await env.AVATARS.get(key)
  if (!object) {
    return new Response('Not found', { status: 404 })
  }

  const headers = new Headers(CORS_HEADERS)
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { status: 200, headers })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
