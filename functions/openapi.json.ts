/** GET /openapi.json — redirect to dynamic API version */
export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url)
  const apiUrl = new URL('/api/openapi.json', url.origin)
  return fetch(new Request(apiUrl.toString(), { headers: request.headers }))
}
