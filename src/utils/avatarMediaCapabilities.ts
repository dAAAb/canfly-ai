export interface AvatarMediaCapabilityInput {
  secureContext: boolean
  cameraApi: boolean
  screenShareApi: boolean
  mobile: boolean
  brave: boolean
}

export interface AvatarMediaCapabilities {
  camera: boolean
  screenShare: boolean
  braveMobile: boolean
  secureContext: boolean
}

export function resolveAvatarMediaCapabilities({
  secureContext,
  cameraApi,
  screenShareApi,
  mobile,
  brave,
}: AvatarMediaCapabilityInput): AvatarMediaCapabilities {
  return {
    camera: secureContext && cameraApi,
    screenShare: secureContext && screenShareApi,
    braveMobile: brave && mobile,
    secureContext,
  }
}

export async function detectBraveBrowser(candidate: unknown) {
  if (typeof candidate !== 'object' || candidate === null) return false

  const brave = Reflect.get(candidate, 'brave')
  if (typeof brave !== 'object' || brave === null) return false

  const isBrave = Reflect.get(brave, 'isBrave')
  if (typeof isBrave !== 'function') return false

  try {
    return (await Reflect.apply(isBrave, brave, [])) === true
  } catch {
    return false
  }
}
