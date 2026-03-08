export interface Env {
  PROFILES: KVNamespace
}

interface UserProfile {
  username: string
  displayName: string
  avatar?: string
  bio?: string
  tools: string[]
  setupDescription?: string
  socialLinks: { platform: string; url: string }[]
  createdAt: string
}

const MAIN_DOMAIN = 'canfly.ai'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const host = url.hostname

    // Only handle subdomains, not the main domain
    if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) {
      return new Response(null, { status: 404 })
    }

    // Extract username from subdomain
    const username = host.replace(`.${MAIN_DOMAIN}`, '').toLowerCase()
    if (!username || username.includes('.')) {
      return new Response('Invalid subdomain', { status: 400 })
    }

    // API endpoints
    if (url.pathname === '/api/profile' && request.method === 'GET') {
      return getProfileJson(env, username)
    }

    if (url.pathname === '/api/profile' && request.method === 'PUT') {
      return updateProfile(request, env, username)
    }

    // Default: render profile HTML page
    return renderProfilePage(env, username)
  },
}

async function getProfileJson(env: Env, username: string): Promise<Response> {
  const data = await env.PROFILES.get(username, 'json') as UserProfile | null
  if (!data) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }
  return Response.json(data, {
    headers: { 'Access-Control-Allow-Origin': `https://${MAIN_DOMAIN}` },
  })
}

async function updateProfile(request: Request, env: Env, username: string): Promise<Response> {
  // TODO: Add authentication (JWT/API key validation)
  const apiKey = request.headers.get('X-API-Key')
  if (!apiKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as Partial<UserProfile>
  const existing = await env.PROFILES.get(username, 'json') as UserProfile | null

  const profile: UserProfile = {
    username,
    displayName: body.displayName || existing?.displayName || username,
    avatar: body.avatar || existing?.avatar,
    bio: body.bio || existing?.bio,
    tools: body.tools || existing?.tools || [],
    setupDescription: body.setupDescription || existing?.setupDescription,
    socialLinks: body.socialLinks || existing?.socialLinks || [],
    createdAt: existing?.createdAt || new Date().toISOString(),
  }

  await env.PROFILES.put(username, JSON.stringify(profile))
  return Response.json(profile)
}

async function renderProfilePage(env: Env, username: string): Promise<Response> {
  const profile = await env.PROFILES.get(username, 'json') as UserProfile | null

  if (!profile) {
    return new Response(renderNotFound(username), {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    })
  }

  const html = renderProfile(profile)
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  })
}

function renderProfile(p: UserProfile): string {
  const toolBadges = p.tools
    .map((t) => `<span class="tool-badge">${escHtml(t)}</span>`)
    .join('')

  const socialHtml = p.socialLinks
    .map((s) => `<a href="${escHtml(s.url)}" class="social-link" target="_blank" rel="noopener">${escHtml(s.platform)}</a>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(p.displayName)} — Canfly</title>
  <meta name="description" content="${escHtml(p.bio || `${p.displayName}'s AI Agent showcase on Canfly`)}" />
  <meta property="og:title" content="${escHtml(p.displayName)} — Canfly" />
  <meta property="og:description" content="${escHtml(p.bio || `${p.displayName}'s AI Agent showcase`)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="https://${escHtml(p.username)}.canfly.ai" />
  ${p.avatar ? `<meta property="og:image" content="${escHtml(p.avatar)}" />` : ''}
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.displayName,
    url: `https://${p.username}.canfly.ai`,
    image: p.avatar,
    description: p.bio,
    sameAs: p.socialLinks.map((s) => s.url),
  })}
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; color: #fff; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .profile { max-width: 600px; width: 100%; padding: 2rem; text-align: center; }
    .avatar { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #a78bfa; margin: 0 auto 1.5rem; object-fit: cover; }
    .avatar-placeholder { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #a78bfa; margin: 0 auto 1.5rem; background: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .username { color: #9ca3af; margin-bottom: 1rem; }
    .bio { color: #d1d5db; margin-bottom: 1.5rem; line-height: 1.6; }
    .tools { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-bottom: 1.5rem; }
    .tool-badge { background: #1e1b4b; color: #a78bfa; padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; border: 1px solid #312e81; }
    .setup { background: #111; border: 1px solid #222; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; text-align: left; color: #d1d5db; line-height: 1.6; }
    .social-links { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    .social-link { color: #818cf8; text-decoration: none; padding: 0.5rem 1rem; border: 1px solid #312e81; border-radius: 0.5rem; transition: background 0.2s; }
    .social-link:hover { background: #1e1b4b; }
    .canfly-link { margin-top: 2rem; color: #6b7280; font-size: 0.875rem; }
    .canfly-link a { color: #a78bfa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="profile">
    ${p.avatar
      ? `<img src="${escHtml(p.avatar)}" alt="${escHtml(p.displayName)}" class="avatar" />`
      : `<div class="avatar-placeholder">${escHtml(p.displayName.charAt(0).toUpperCase())}</div>`}
    <h1>${escHtml(p.displayName)}</h1>
    <p class="username">@${escHtml(p.username)}</p>
    ${p.bio ? `<p class="bio">${escHtml(p.bio)}</p>` : ''}
    ${p.tools.length > 0 ? `<div class="tools">${toolBadges}</div>` : ''}
    ${p.setupDescription ? `<div class="setup">${escHtml(p.setupDescription)}</div>` : ''}
    ${p.socialLinks.length > 0 ? `<div class="social-links">${socialHtml}</div>` : ''}
    <p class="canfly-link">Powered by <a href="https://canfly.ai">Canfly</a></p>
  </div>
</body>
</html>`
}

function renderNotFound(username: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Not Found — Canfly</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; color: #fff; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p { color: #9ca3af; margin-bottom: 1.5rem; }
    a { color: #a78bfa; text-decoration: none; }
  </style>
</head>
<body>
  <div>
    <h1>@${escHtml(username)}</h1>
    <p>This profile hasn't been claimed yet.</p>
    <a href="https://canfly.ai">Get started on Canfly &rarr;</a>
  </div>
</body>
</html>`
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
