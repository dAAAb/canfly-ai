/**
 * POST /api/pinata/verify-jwt — CAN-302
 *
 * Wizard Step 1 helper: takes a Pinata JWT pasted by the user and confirms
 * (a) it's valid, (b) the account has Agents API access, and (c) returns
 * how many of the user's Pinata FREE/PICNIC slots are still free.
 *
 * Does NOT persist the JWT. The wizard re-sends it on POST /api/pinata/deploy
 * (which encrypts and stores it in v3_pinata_deployments.metadata).
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'
import { authenticateRequest } from '../_auth'
import { pinataListAgents, PinataApiError } from '../../lib/pinata'

interface VerifyBody {
  jwt: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Light auth — we only proxy a single read, but logged-in users only
  // (avoid being a free Pinata-JWT-scanner for anyone on the internet)
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }

  const body = await parseBody<VerifyBody>(request)
  if (!body?.jwt || typeof body.jwt !== 'string') {
    return errorResponse('jwt is required', 400)
  }
  // Defensive shape check — JWT is 3 base64url segments
  if (!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body.jwt)) {
    return errorResponse('Malformed JWT', 400)
  }

  try {
    const data = await pinataListAgents(body.jwt)
    return json({
      valid: true,
      agentLimit: data.agentLimit,
      timeCredits: data.timeCredits,
      currentAgentCount: data.agents?.length ?? 0,
    })
  } catch (err) {
    if (err instanceof PinataApiError) {
      // Map Pinata's status to a sensible client status
      // 401/403 → "your JWT is bad", everything else → 502 upstream
      if (err.status === 401 || err.status === 403) {
        return errorResponse(`Pinata rejected the JWT (${err.status})`, err.status)
      }
      return errorResponse(`Pinata upstream error: ${err.status}`, 502)
    }
    return errorResponse('Failed to reach Pinata', 502)
  }
}
