/** /api/v1/* is a stable alias for /api/* */
export function rewriteV1Path(pathname: string): string {
  const next = pathname.replace(/^\/api\/v1\/?/, '/api/')
  return next === '/api/' ? '/api' : next
}
