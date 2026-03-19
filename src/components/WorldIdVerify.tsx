import { useState, useEffect, useCallback } from 'react'
import { IDKitRequestWidget, orbLegacy } from '@worldcoin/idkit'
import type { IDKitResult, RpContext } from '@worldcoin/idkit'
import { Loader2 } from 'lucide-react'

const WORLD_ID_APP_ID = 'app_ee5d4fa1aa655b4a3ba0641bb070ad67'
const WORLD_ID_ACTION = 'real-human-canfly'
const WORLD_ID_RP_ID = 'rp_2eeecd2f22517885'

interface Props {
  username: string
  editToken: string
  walletAddress: string | null
}

export default function WorldIdVerify({ username, editToken, walletAddress }: Props) {
  const [status, setStatus] = useState<'loading' | 'unverified' | 'verified' | 'verifying' | 'error'>('loading')
  const [verificationLevel, setVerificationLevel] = useState<string | null>(null)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)

  // Check current status on mount
  useEffect(() => {
    fetch(`/api/world-id/status/${username}`)
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (data.is_human) {
          setStatus('verified')
          setVerificationLevel(data.verification_level as string)
          setVerifiedAt(data.verified_at as string)
        } else {
          setStatus('unverified')
        }
      })
      .catch(() => setStatus('unverified'))
  }, [username])

  // Fetch RP signature before opening widget
  const handleOpenWidget = useCallback(async () => {
    setError('')
    setStatus('verifying')
    try {
      const res = await fetch('/api/world-id/rp-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Edit-Token': editToken,
        },
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error || 'Failed to get RP signature')
        setStatus('unverified')
        return
      }
      const rpSig = (await res.json()) as { sig: string; nonce: string; created_at: number; expires_at: number }
      setRpContext({
        rp_id: WORLD_ID_RP_ID,
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      })
      setWidgetOpen(true)
    } catch {
      setError('Network error')
      setStatus('unverified')
    }
  }, [editToken])

  // handleVerify: store IDKit proof in backend
  const handleVerify = useCallback(
    async (idkitResult: IDKitResult) => {
      try {
        const res = await fetch('/api/world-id/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Edit-Token': editToken,
          },
          body: JSON.stringify({
            username,
            idkit_result: idkitResult,
          }),
        })

        const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string }
        if (!res.ok) {
          const msg = data.detail || data.error || `Backend error ${res.status}`
          setError(msg)
          throw new Error(msg)
        }
      } catch (e) {
        if (!error) setError(e instanceof Error ? e.message : 'Verification failed')
        throw e
      }
    },
    [username, editToken, error],
  )

  const handleSuccess = useCallback(() => {
    setStatus('verified')
    setVerificationLevel('orb')
    setVerifiedAt(new Date().toISOString())
    setWidgetOpen(false)
  }, [])

  if (status === 'loading') {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span className="text-lg">🌍</span> World ID Verification
        </h3>
        <p className="text-gray-500 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <span className="text-lg">🌍</span> World ID Verification
      </h3>

      {status === 'verified' ? (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div>
              <p className="text-green-400 font-bold text-sm">Verified Human</p>
              <p className="text-gray-400 text-xs">
                Level: {verificationLevel === 'orb' ? 'Orb (biometric)' : 'Device'}
                {verifiedAt && ` · ${new Date(verifiedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            Your account is verified as a unique human via World ID. This badge is visible on your
            public profile and boosts your trust ranking.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Prove you're a unique human using World ID. Verified accounts get a trust badge and
            higher ranking in the community.
          </p>

          <button
            onClick={handleOpenWidget}
            disabled={status === 'verifying'}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:from-purple-500 hover:to-blue-500 transition disabled:opacity-50 flex items-center gap-2"
          >
            {status === 'verifying' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Preparing...
              </>
            ) : (
              <>🌍 Verify with World ID</>
            )}
          </button>

          {rpContext && (
            <IDKitRequestWidget
              app_id={WORLD_ID_APP_ID as `app_${string}`}
              action={WORLD_ID_ACTION}
              rp_context={rpContext}
              allow_legacy_proofs={true}
              preset={orbLegacy({ signal: walletAddress || username })}
              open={widgetOpen}
              onOpenChange={setWidgetOpen}
              handleVerify={handleVerify}
              onSuccess={handleSuccess}
              onError={(err) => {
                setError(`Verification error: ${err}`)
                setWidgetOpen(false)
                setStatus('unverified')
              }}
            />
          )}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      )}
    </div>
  )
}
