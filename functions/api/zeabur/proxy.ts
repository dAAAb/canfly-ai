/**
 * POST /api/zeabur/proxy — Proxy Zeabur GraphQL requests to avoid CORS
 *
 * Body: { zeaburApiKey: string, query: string, variables?: object }
 * Forwards to https://api.zeabur.com/graphql with the user's API key
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

interface ProxyBody {
  zeaburApiKey: string
  query: string
  variables?: Record<string, unknown>
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  const body = await parseBody<ProxyBody>(request)
  if (!body?.zeaburApiKey || !body?.query) {
    return errorResponse('zeaburApiKey and query are required', 400)
  }

  try {
    const res = await fetch('https://api.zeabur.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${body.zeaburApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: body.query,
        variables: body.variables || undefined,
      }),
    })

    const data = await res.json()
    return json(data)
  } catch (err) {
    return errorResponse(`Zeabur API error: ${err instanceof Error ? err.message : String(err)}`, 502)
  }
}
