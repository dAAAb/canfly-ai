export type TrustLevel =
  | 'orb'
  | 'world'
  | 'wallet'
  | 'unverified'
  | 'openclaw-agent'
  | 'agent'
  | 'agentbook'

interface TrustCheckable {
  wallet_address?: string | null
  links?: {
    basename?: string | null
    ens?: string | null
  } | null
  verification_level?: string | null
}

/**
 * Determine trust level from user data.
 * Priority: orb > world > wallet > unverified
 */
export function getTrustLevel(user: TrustCheckable): TrustLevel {
  const vl = user.verification_level?.toLowerCase()

  if (vl === 'orb') return 'orb'
  if (vl === 'world' || vl === 'device' || vl === 'worldid') return 'world'
  if (user.wallet_address) return 'wallet'
  return 'unverified'
}
