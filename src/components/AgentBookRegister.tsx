/**
 * AgentBookRegister — Uses IDKitRequestWidget (same as Real Human verify)
 * with AgentBook's World ID app but CanFly's RP signature.
 */
import { useState, useEffect, useCallback } from 'react'
import { IDKitRequestWidget, orbLegacy } from '@worldcoin/idkit'
import type { IDKitResult, RpContext } from '@worldcoin/idkit'
import { decodeAbiParameters, encodeAbiParameters, keccak256 } from 'viem'
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react'
import {
  AGENTBOOK_WORLD_ID_APP_ID,
  AGENTBOOK_ACTION,
  AGENTBOOK_CONTRACT,
  AGENTBOOK_NETWORK,
} from '../config/agentbook'

interface Props {
  agentName: string
  agentWalletAddress: string | null
  ownerUsername: string
  editToken: string | null
  ownerWalletAddress: string | null
  onRegistered?: () => void
}

function buildAuthHeaders(editToken: string | null, walletAddress: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (editToken) h['X-Edit-Token'] = editToken
  else if (walletAddress) h['X-Wallet-Address'] = walletAddress
  return h
}

function normalizeProof(rawProof: string): string[] | null {
  if (rawProof.startsWith('[')) {
    try { const p = JSON.parse(rawProof); if (Array.isArray(p)) return p } catch {}
  }
  if (rawProof.startsWith('0x') && rawProof.length > 66) {
    try {
      const decoded = decodeAbiParameters([{ type: 'uint256[8]' }], rawProof as `0x${string}`)[0]
      return decoded.map((v: bigint) => `0x${v.toString(16).padStart(64, '0')}`)
    } catch {}
  }
  if (rawProof.startsWith('0x')) return [rawProof]
  return null
}

type Status = 'loading' | 'no_wallet' | 'already_registered' | 'ready' |
  'preparing' | 'verifying' | 'submitting' | 'done' | 'error'

export default function AgentBookRegister({
  agentName, agentWalletAddress, ownerUsername, editToken, ownerWalletAddress, onRegistered,
}: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [nonce, setNonce] = useState('0')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)

  // Check status on mount
  useEffect(() => {
    if (!agentWalletAddress) { setStatus('no_wallet'); return }
    fetch(`/api/agents/${encodeURIComponent(agentName)}/agentbook-status`)
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        if (d.registered) { setStatus('already_registered'); setTxHash((d.txHash as string) || null) }
        else { setNonce((d.nonce as string) || '0'); setStatus('ready') }
      })
      .catch(() => setStatus('ready'))
  }, [agentName, agentWalletAddress])

  // Get RP signature then open widget
  const handleStartRegistration = useCallback(async () => {
    setError('')
    setStatus('preparing')
    try {
      // Get RP signature from our backend (same endpoint as Real Human verify)
      const res = await fetch('/api/world-id/rp-signature', {
        method: 'POST',
        headers: buildAuthHeaders(editToken, ownerWalletAddress),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || 'Failed to get RP signature')
      }
      const rpSig = (await res.json()) as { sig: string; nonce: string; created_at: number; expires_at: number }
      setRpContext({
        rp_id: 'rp_2eeecd2f22517885', // CanFly's RP ID
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      })
      setWidgetOpen(true)
      setStatus('verifying')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to prepare')
      setStatus('error')
    }
  }, [editToken, ownerWalletAddress])

  // Handle IDKit proof → submit to relay
  const handleVerify = useCallback(async (idkitResult: IDKitResult) => {
    setStatus('submitting')
    try {
      const firstResponse = idkitResult.responses?.[0] as Record<string, unknown> | undefined
      if (!firstResponse) throw new Error('No proof in IDKit result')

      const root = (firstResponse.merkle_root as string) || ''
      const nullifierHash = (firstResponse.nullifier as string) || (firstResponse.nullifier_hash as string) || ''
      const rawProof = (firstResponse.proof as string) || ''
      const proof = normalizeProof(rawProof) || [rawProof]

      const res = await fetch('/api/agents/agentbook-register', {
        method: 'POST',
        headers: buildAuthHeaders(editToken, ownerWalletAddress),
        body: JSON.stringify({
          agentName, agentAddress: agentWalletAddress,
          root, nonce, nullifierHash, proof,
          contract: AGENTBOOK_CONTRACT, network: AGENTBOOK_NETWORK,
        }),
      })

      const data = (await res.json()) as { ok?: boolean; txHash?: string; error?: string }
      if (!res.ok) throw new Error(data.error || `Registration failed (${res.status})`)

      setTxHash(data.txHash || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
      throw e // Let IDKit show error
    }
  }, [agentName, agentWalletAddress, nonce, editToken, ownerWalletAddress])

  const handleSuccess = useCallback(() => {
    setStatus('done')
    setWidgetOpen(false)
    onRegistered?.()
  }, [onRegistered])

  // Generate signal for IDKit
  const signal = agentWalletAddress
    ? keccak256(encodeAbiParameters(
        [{ type: 'address' }, { type: 'uint256' }],
        [agentWalletAddress as `0x${string}`, BigInt(nonce)]
      ))
    : agentName

  // ── Render ──

  if (status === 'loading') return <div className="text-gray-500 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</div>
  if (status === 'no_wallet') return <div className="text-gray-500 text-xs">Agent needs a wallet address for AgentBook.</div>

  if (status === 'already_registered' || status === 'done') return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/20 text-emerald-400 text-xs border border-emerald-600/40 font-medium">
        <CheckCircle className="w-3 h-3" /> AgentBook Verified
      </span>
      {txHash && <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> tx</a>}
    </div>
  )

  return (
    <div>
      <button onClick={handleStartRegistration}
        disabled={status === 'preparing' || status === 'submitting'}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
        {status === 'preparing' ? <><Loader2 className="w-3 h-3 animate-spin" /> Preparing...</>
          : status === 'submitting' ? <><Loader2 className="w-3 h-3 animate-spin" /> Registering...</>
          : <>📖 Register to AgentBook</>}
      </button>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {status === 'error' && <button onClick={() => setStatus('ready')} className="text-gray-500 text-xs mt-1 hover:text-gray-400">Try again</button>}

      {rpContext && (
        <IDKitRequestWidget
          app_id={AGENTBOOK_WORLD_ID_APP_ID as `app_${string}`}
          action={AGENTBOOK_ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={orbLegacy({ signal })}
          open={widgetOpen}
          onOpenChange={setWidgetOpen}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
          onError={(err) => {
            setError(`Verification error: ${err}`)
            setWidgetOpen(false)
            setStatus('ready')
          }}
        />
      )}
    </div>
  )
}
