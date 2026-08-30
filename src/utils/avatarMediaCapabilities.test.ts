import { describe, expect, it, vi } from 'vitest'
import {
  detectBraveBrowser,
  resolveAvatarMediaCapabilities,
} from './avatarMediaCapabilities'

describe('resolveAvatarMediaCapabilities', () => {
  it('requires a secure context for camera and screen sharing', () => {
    expect(
      resolveAvatarMediaCapabilities({
        secureContext: false,
        cameraApi: true,
        screenShareApi: true,
        mobile: false,
        brave: false,
      }),
    ).toEqual({
      camera: false,
      screenShare: false,
      braveMobile: false,
      secureContext: false,
    })
  })

  it('separates camera support from mobile screen sharing', () => {
    expect(
      resolveAvatarMediaCapabilities({
        secureContext: true,
        cameraApi: true,
        screenShareApi: false,
        mobile: true,
        brave: true,
      }),
    ).toEqual({
      camera: true,
      screenShare: false,
      braveMobile: true,
      secureContext: true,
    })
  })
})

describe('detectBraveBrowser', () => {
  it('uses the Brave capability without relying on the user agent', async () => {
    const isBrave = vi.fn().mockResolvedValue(true)

    await expect(detectBraveBrowser({ brave: { isBrave } })).resolves.toBe(true)
    expect(isBrave).toHaveBeenCalledOnce()
  })

  it('fails closed when the capability is missing or throws', async () => {
    await expect(detectBraveBrowser({})).resolves.toBe(false)
    await expect(
      detectBraveBrowser({
        brave: {
          isBrave: () => Promise.reject(new Error('blocked')),
        },
      }),
    ).resolves.toBe(false)
  })
})
