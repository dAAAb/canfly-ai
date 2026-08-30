import { useEffect, useState } from 'react'
import {
  detectBraveBrowser,
  resolveAvatarMediaCapabilities,
  type AvatarMediaCapabilities,
} from '../utils/avatarMediaCapabilities'

function readCapabilities(brave = false): AvatarMediaCapabilities {
  const mediaDevices = navigator.mediaDevices
  const mobile =
    window.matchMedia?.('(pointer: coarse)').matches
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  return resolveAvatarMediaCapabilities({
    secureContext: window.isSecureContext,
    cameraApi: typeof mediaDevices?.getUserMedia === 'function',
    screenShareApi: typeof mediaDevices?.getDisplayMedia === 'function',
    mobile,
    brave,
  })
}

export function useAvatarMediaCapabilities() {
  const [capabilities, setCapabilities] = useState(readCapabilities)

  useEffect(() => {
    let active = true

    detectBraveBrowser(navigator).then((brave) => {
      if (active) setCapabilities(readCapabilities(brave))
    })

    return () => {
      active = false
    }
  }, [])

  return capabilities
}
