import { SITE } from './agentic'

export function apiIndexDocument() {
  return {
    name: 'CanFly.ai API',
    version: '1',
    openapi: `${SITE}/api/openapi.json`,
    mcp: `${SITE}/mcp`,
    llms: `${SITE}/llms.txt`,
    docs: `${SITE}/developers`,
    health: `${SITE}/api/community/health`,
    deprecation_policy:
      'Unversioned /api is v1. Breaking changes ship under /api/v2 with Deprecation and Sunset headers. v1 remains at least 180 days after Sunset.',
  }
}

export function apiIndexResponse(): Response {
  return Response.json(apiIndexDocument(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
      'API-Version': '1',
    },
  })
}
