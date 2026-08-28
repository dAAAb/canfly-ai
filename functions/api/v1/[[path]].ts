import { rewriteV1Path } from '../../lib/api-v1'

/** /api/v1/* is a stable alias for /api/* */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  url.pathname = rewriteV1Path(url.pathname)
  return fetch(new Request(url.toString(), context.request))
}
