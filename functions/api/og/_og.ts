/**
 * Shared helpers for OG image generation.
 * Uses satori (JSX → SVG) + @resvg/resvg-wasm (SVG → PNG).
 */
import '../../_process-shim'
import satori from 'satori'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
// @ts-expect-error — WASM module import for Cloudflare Workers
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'

const WIDTH = 1200
const HEIGHT = 630

let wasmReady = false

async function ensureWasm() {
  if (wasmReady) return
  await initWasm(resvgWasm)
  wasmReady = true
}

// Google Fonts Inter (latin, weight 600)
const FONT_URL =
  'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.woff2'

let fontCache: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache
  const res = await fetch(FONT_URL)
  fontCache = await res.arrayBuffer()
  return fontCache
}

/** Truncate text to maxLen characters with ellipsis */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

/** Convert satori SVG → PNG ArrayBuffer */
export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm()
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  })
  const rendered = resvg.render()
  return rendered.asPng()
}

/** Build the User Showcase OG card */
export function userCard(opts: {
  displayName: string
  username: string
  bio: string | null
  avatarUrl: string | null
  verificationLevel: string
  agentCount: number
}): Record<string, unknown> {
  const verBadge =
    opts.verificationLevel === 'worldid'
      ? '🌐 World ID Verified'
      : opts.verificationLevel === 'wallet'
        ? '🔗 Wallet Verified'
        : null

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        padding: '60px',
        fontFamily: 'Inter',
        color: '#ffffff',
      },
      children: [
        // Top row: avatar + name
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '32px' },
            children: [
              // Avatar
              opts.avatarUrl
                ? {
                    type: 'img',
                    props: {
                      src: opts.avatarUrl,
                      width: 120,
                      height: 120,
                      style: { borderRadius: '60px', objectFit: 'cover' },
                    },
                  }
                : {
                    type: 'div',
                    props: {
                      style: {
                        width: '120px',
                        height: '120px',
                        borderRadius: '60px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        fontWeight: 700,
                      },
                      children: opts.displayName.charAt(0).toUpperCase(),
                    },
                  },
              // Name + username
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: '8px' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: '48px', fontWeight: 700, color: '#ffffff' },
                        children: truncate(opts.displayName, 30),
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: '24px', color: '#94a3b8' },
                        children: `@${opts.username}`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Bio
        opts.bio
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '24px',
                  color: '#cbd5e1',
                  marginTop: '32px',
                  lineHeight: 1.5,
                },
                children: truncate(opts.bio, 120),
              },
            }
          : null,
        // Spacer
        { type: 'div', props: { style: { flex: '1' }, children: [] } },
        // Bottom row: stats + badge + branding
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', gap: '24px', alignItems: 'center' },
                  children: [
                    // Agent count
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '20px',
                          color: '#94a3b8',
                          background: 'rgba(99, 102, 241, 0.15)',
                          padding: '8px 16px',
                          borderRadius: '8px',
                        },
                        children: `🤖 ${opts.agentCount} Agent${opts.agentCount !== 1 ? 's' : ''}`,
                      },
                    },
                    // Verification badge
                    verBadge
                      ? {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '20px',
                              color: '#22c55e',
                              background: 'rgba(34, 197, 94, 0.15)',
                              padding: '8px 16px',
                              borderRadius: '8px',
                            },
                            children: verBadge,
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },
              // Branding
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#6366f1',
                  },
                  children: 'CanFly.ai',
                },
              },
            ],
          },
        },
      ].filter(Boolean),
    },
  }
}

/** Build the Agent Card OG image */
export function agentCard(opts: {
  name: string
  ownerUsername: string | null
  bio: string | null
  avatarUrl: string | null
  model: string | null
  platform: string
  skills: string[]
}): Record<string, unknown> {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1e1a2e 50%, #1a1632 100%)',
        padding: '60px',
        fontFamily: 'Inter',
        color: '#ffffff',
      },
      children: [
        // Top row: avatar + name
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '32px' },
            children: [
              // Avatar
              opts.avatarUrl
                ? {
                    type: 'img',
                    props: {
                      src: opts.avatarUrl,
                      width: 120,
                      height: 120,
                      style: { borderRadius: '16px', objectFit: 'cover' },
                    },
                  }
                : {
                    type: 'div',
                    props: {
                      style: {
                        width: '120px',
                        height: '120px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        fontWeight: 700,
                      },
                      children: '🤖',
                    },
                  },
              // Name + owner
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: '8px' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: '48px', fontWeight: 700, color: '#ffffff' },
                        children: truncate(opts.name, 30),
                      },
                    },
                    opts.ownerUsername
                      ? {
                          type: 'div',
                          props: {
                            style: { fontSize: '24px', color: '#94a3b8' },
                            children: `by @${opts.ownerUsername}`,
                          },
                        }
                      : {
                          type: 'div',
                          props: {
                            style: { fontSize: '24px', color: '#f59e0b' },
                            children: 'Free Agent',
                          },
                        },
                  ],
                },
              },
            ],
          },
        },
        // Bio
        opts.bio
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '24px',
                  color: '#cbd5e1',
                  marginTop: '32px',
                  lineHeight: 1.5,
                },
                children: truncate(opts.bio, 120),
              },
            }
          : null,
        // Spacer
        { type: 'div', props: { style: { flex: '1' }, children: [] } },
        // Bottom row: skills + model + branding
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
                  children: [
                    // Model tag
                    opts.model
                      ? {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '18px',
                              color: '#a78bfa',
                              background: 'rgba(139, 92, 246, 0.15)',
                              padding: '6px 14px',
                              borderRadius: '8px',
                            },
                            children: `⚡ ${opts.model}`,
                          },
                        }
                      : null,
                    // Skills (max 3)
                    ...opts.skills.slice(0, 3).map((skill) => ({
                      type: 'div' as const,
                      props: {
                        style: {
                          fontSize: '18px',
                          color: '#94a3b8',
                          background: 'rgba(148, 163, 184, 0.12)',
                          padding: '6px 14px',
                          borderRadius: '8px',
                        },
                        children: skill,
                      },
                    })),
                    // +N more
                    opts.skills.length > 3
                      ? {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '18px',
                              color: '#64748b',
                              padding: '6px 14px',
                            },
                            children: `+${opts.skills.length - 3} more`,
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },
              // Branding
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#8b5cf6',
                  },
                  children: 'CanFly.ai',
                },
              },
            ],
          },
        },
      ].filter(Boolean),
    },
  }
}

/** Render a satori node to PNG bytes */
export async function renderOgImage(node: Record<string, unknown>): Promise<Uint8Array> {
  const fontData = await loadFont()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await satori(node as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 600,
        style: 'normal',
      },
    ],
  })
  return svgToPng(svg)
}

/** Return a PNG response with caching headers */
export function pngResponse(png: Uint8Array): Response {
  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
