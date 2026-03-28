/**
 * Shared helpers for Team API v1 (CAN-252)
 */
import { type Env, errorResponse } from '../community/_helpers'

export const VALID_TEAM_ROLES = ['pm', 'worker', 'viewer'] as const
export type TeamRole = (typeof VALID_TEAM_ROLES)[number]

/** Check v3_agent_registry feature flag is enabled */
export async function requireV3Flag(env: Env): Promise<Response | null> {
  const flag = await env.DB.prepare(
    "SELECT enabled FROM feature_flags WHERE flag_name = 'v3_agent_registry' AND scope = 'global'"
  ).first<{ enabled: number }>()

  if (!flag?.enabled) {
    return errorResponse('v3 features not enabled', 503)
  }
  return null
}

/** Authenticate agent via Bearer API key, returns agent name or error response */
export async function authenticateAgent(
  request: Request,
  env: Env
): Promise<{ agentName: string } | { error: Response }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: errorResponse('Authorization required (Bearer API key)', 401) }
  }

  const apiKey = authHeader.slice(7)
  const agent = await env.DB.prepare(
    'SELECT name, owner_username FROM agents WHERE api_key = ?1'
  ).bind(apiKey).first<{ name: string; owner_username: string | null }>()

  if (!agent) {
    return { error: errorResponse('Invalid API key', 403) }
  }

  return { agentName: agent.name }
}

/** Validate slug format: lowercase alphanumeric + hyphens, 2-50 chars */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(slug) || /^[a-z0-9]{2}$/.test(slug)
}

/** Check if agent has PM or owner role in a team */
export async function isTeamPM(
  env: Env,
  teamId: string,
  agentName: string
): Promise<boolean> {
  // Check if agent is team owner (via v3_teams.owner_username matching agent's owner)
  // or has 'pm' role in team membership
  const membership = await env.DB.prepare(
    "SELECT role FROM v3_team_memberships WHERE team_id = ?1 AND agent_name = ?2 AND role = 'pm'"
  ).bind(teamId, agentName).first()

  return !!membership
}

/** Check if agent is a member of a team (any role) */
export async function isTeamMember(
  env: Env,
  teamId: string,
  agentName: string
): Promise<boolean> {
  const membership = await env.DB.prepare(
    'SELECT id FROM v3_team_memberships WHERE team_id = ?1 AND agent_name = ?2'
  ).bind(teamId, agentName).first()

  return !!membership
}
