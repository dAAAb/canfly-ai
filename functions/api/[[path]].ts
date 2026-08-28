import { problemJson } from '../lib/agentic'

/** Catch-all for unknown /api/* routes — always JSON, never the SPA shell. */
export const onRequest: PagesFunction = async (context) => {
  const path = new URL(context.request.url).pathname
  return problemJson(
    404,
    'not_found',
    `No API route for ${path}`,
    'GET /api or /api/openapi.json for the public surface. Versioned alias: /api/v1/*',
  )
}
