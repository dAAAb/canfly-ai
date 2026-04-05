/** Redirect /openapi.json → /api/openapi.json for MPP discovery */
export const onRequestGet: PagesFunction = async () => {
  return new Response(null, {
    status: 301,
    headers: { Location: '/api/openapi.json' },
  })
}
