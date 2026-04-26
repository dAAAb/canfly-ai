# Pinata Relay (CAN-302)

A 70-line Deno Deploy edge function that proxies CanFly Worker → Pinata Agents API.

## Why this exists

Pinata's `agents.pinata.cloud` is on Cloudflare with a Bot Management rule that **rejects any incoming request carrying a `CF-Connecting-IP` header** (verified 2026-04-26 via header bisection — GET without it returns 200, GET with any value of CF-Connecting-IP returns `403 error 1000`).

Cloudflare's Workers runtime auto-injects `CF-Connecting-IP` on every outbound subrequest, and there's no way to suppress it from the Worker side. So **CanFly's Cloudflare Pages Functions cannot call agents.pinata.cloud directly** — every call gets blocked.

This relay runs on Deno Deploy (not Cloudflare). It strips all `cf-*` and `x-forwarded-*` headers and forwards the request to Pinata. Pinata's rule no longer matches, request goes through.

## Deploy

1. Open <https://dash.deno.com>, sign in with GitHub (free).
2. **New Project → Playground**, name it `canfly-pinata-relay` (or similar).
3. Paste the contents of `pinata-relay.ts` into the editor.
4. **Save & Deploy**. Copy the deployed URL (e.g. `https://canfly-pinata-relay-abc123.deno.dev`).

   Quick smoke test from your terminal:
   ```bash
   curl https://canfly-pinata-relay-abc123.deno.dev/v0/agents \
     -H "Authorization: Bearer <your Pinata JWT>"
   # expect: {"agents":[...],"agentLimit":...}
   ```

5. Tell CanFly's Worker to use the relay:
   ```bash
   npx wrangler pages secret put PINATA_RELAY_URL --project-name=canfly-ai
   # paste the deno.dev URL — NO trailing slash
   ```

6. Optional but recommended — gate the relay to only accept calls from your CanFly origin:
   - In the Deno Deploy project → Settings → Environment Variables
   - Add `CANFLY_ORIGIN=https://canfly.ai`

That's it. Next CanFly Pages deploy will pick up `PINATA_RELAY_URL` and route through it.

## Trust model

The relay sees every request body in plaintext, including:
- Pinata JWTs (your account credential)
- OPENROUTER_API_KEY values being pushed into Pinata Secrets Vault (which embed real OpenRouter keys)
- Bot tokens during Telegram channel binding

**Deploy this on your own Deno Deploy account.** Don't share the URL or use someone else's deployment — operating the relay = seeing everything.

## Why Deno Deploy

- Free tier is generous (1M requests/month)
- Edge runtime, no cold starts
- Globally distributed
- **Not** Cloudflare-based, so no `CF-Connecting-IP` injection
- Single-file deployment, no build step

Other equivalent hosts that would work: Vercel Edge Functions, Render, Fly.io, AWS Lambda. Avoid hosts that re-route through Cloudflare.
