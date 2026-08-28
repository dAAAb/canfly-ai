/**
 * GET /api/openapi.json — Dynamic OpenAPI 3.1 spec with live purchasable skills
 *
 * Each agent's each skill gets its own path entry so MPPScan lists them
 * individually — like an app store for AI agent skills.
 */
import { type Env, handleOptions } from './community/_helpers'
import { slugify } from '../lib/slugify'
import { buildOpenApiSpec, type SkillRow } from '../lib/openapi-spec'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT s.name AS skill_name, s.slug, s.description, s.price, s.currency, s.sla,
            a.name AS agent_name, a.wallet_address
     FROM skills s
     JOIN agents a ON s.agent_name = a.name
     WHERE s.type = 'purchasable' AND a.is_public = 1 AND s.price > 0
     ORDER BY a.name, s.name`
  ).all()

  const skills: SkillRow[] = results.map((r) => ({
    skill_name: r.skill_name as string,
    slug: (r.slug as string) || slugify(r.skill_name as string),
    description: (r.description as string) || (r.skill_name as string),
    price: r.price as number,
    sla: (r.sla as string | null) ?? null,
    agent_name: r.agent_name as string,
  }))

  const spec = buildOpenApiSpec(skills)

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'API-Version': '1',
    },
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
