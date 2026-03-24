/**
 * PUT /api/agents/:name/capabilities — Layer 2: Update A2A capabilities
 *
 * Agents use their apiKey to update capabilities fields that enrich
 * the auto-generated Agent Card (Layer 1).
 *
 * Accepts: auth_schemes, input_modes, output_modes, streaming, push_notifications
 * These are stored in the `capabilities` JSON column and merged with existing data.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'

interface CapabilitiesBody {
  auth_schemes?: string[]         // e.g. ["apiKey", "oauth2"]
  input_modes?: string[]          // e.g. ["text/plain", "application/json"]
  output_modes?: string[]         // e.g. ["text/plain", "application/json"]
  streaming?: boolean
  push_notifications?: boolean
}

const VALID_AUTH_SCHEMES = ['none', 'apiKey', 'oauth2', 'bearer', 'mtls', 'acp']
const VALID_MODES = [
  'text/plain', 'application/json', 'image/png', 'image/jpeg',
  'audio/wav', 'audio/mp3', 'video/mp4', 'application/pdf',
  'text/html', 'text/markdown',
]

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const name = params.name as string

  // Extract Bearer token
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Verify agent exists and API key matches
  const agent = await env.DB.prepare(
    'SELECT name, api_key, capabilities FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (!agent.api_key || agent.api_key !== apiKey) return errorResponse('Invalid API key', 403)

  const body = await parseBody<CapabilitiesBody>(request)
  if (!body) return errorResponse('Invalid request body', 400)

  // Validate auth_schemes
  if (body.auth_schemes) {
    if (!Array.isArray(body.auth_schemes) || body.auth_schemes.length === 0) {
      return errorResponse('auth_schemes must be a non-empty array', 400)
    }
    for (const scheme of body.auth_schemes) {
      if (!VALID_AUTH_SCHEMES.includes(scheme)) {
        return errorResponse(`Invalid auth scheme: "${scheme}". Valid: ${VALID_AUTH_SCHEMES.join(', ')}`, 400)
      }
    }
  }

  // Validate input/output modes
  for (const field of ['input_modes', 'output_modes'] as const) {
    if (body[field]) {
      if (!Array.isArray(body[field]) || body[field]!.length === 0) {
        return errorResponse(`${field} must be a non-empty array`, 400)
      }
      for (const mode of body[field]!) {
        if (!VALID_MODES.includes(mode)) {
          return errorResponse(`Invalid ${field} value: "${mode}". Valid: ${VALID_MODES.join(', ')}`, 400)
        }
      }
    }
  }

  // Merge with existing capabilities JSON
  const existing = JSON.parse((agent.capabilities as string) || '{}')

  if (body.auth_schemes !== undefined) existing.auth_schemes = body.auth_schemes
  if (body.input_modes !== undefined) existing.defaultInputModes = body.input_modes
  if (body.output_modes !== undefined) existing.defaultOutputModes = body.output_modes
  if (body.streaming !== undefined) existing.streaming = !!body.streaming
  if (body.push_notifications !== undefined) existing.pushNotifications = !!body.push_notifications

  await env.DB.prepare(
    `UPDATE agents SET capabilities = ?1, updated_at = datetime('now') WHERE name = ?2`
  )
    .bind(JSON.stringify(existing), name)
    .run()

  return json({
    name,
    capabilities: existing,
    updated: true,
    layer: 2,
    info: 'Capabilities updated. These enrich the auto-generated Agent Card (Layer 1).',
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
