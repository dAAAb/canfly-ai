import { problemJson } from '../lib/agentic'
import { apiIndexResponse } from '../lib/api-index'

/** Catch-all for unknown /api/* routes — always JSON, never the SPA shell. */
export const onRequest: PagesFunction = async (context) => {
  const path = new URL(context.request.url).pathname.replace(/\/+$/, '') || '/'
  if (path === '/api' && (context.request.method === 'GET' || context.request.method === 'HEAD')) {
    return apiIndexResponse()
  }
  return problemJson(
    404,
    'not_found',
    `No API route for ${new URL(context.request.url).pathname}`,
    'GET /api or /api/openapi.json for the public surface. Versioned alias: /api/v1/*',
  )
}
