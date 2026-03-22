/**
 * Polyfill `process` for Cloudflare Workers.
 * Some npm packages (e.g., satori) reference `process.env` at the top level.
 */
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = { env: {} }
}

export {}
