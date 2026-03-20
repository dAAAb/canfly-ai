/**
 * AgentBookRegister — Pure browser World ID bridge + relay
 * No WASM, no IDKit widget dependency, no page redirect.
 * Shows QR + "Open in World App" link. Browser tab stays alive for polling.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { decodeAbiParameters } from 'viem'
import QRCode from 'react-qr-code'
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react'
import {
  createBridgeSession,
  pollBridgeResult,
  clearBridgeSession,
} from '../utils/worldIdBridge'
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
  'creating' | 'waiting' | 'submitting' | 'done' | 'error'

export default function AgentBookRegister({
  agentName, agentWalletAddress, ownerUsername, editToken, ownerWalletAddress, onRegistered,
}: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [nonce, setNonce] = useState('0')
  const [connectorURI, setConnectorURI] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState('')
  const cancelledRef = useRef(false)

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

  // Register flow: create bridge → show QR → poll → relay
  const handleRegister = useCallback(async () => {
    if (!agentWalletAddress) return
    setError('')
    setStatus('creating')
    cancelledRef.current = false

    try {
      // Create bridge session (pure Web Crypto, no WASM)
      const session = await createBridgeSession(
        AGENTBOOK_WORLD_ID_APP_ID,
        AGENTBOOK_ACTION,
        agentWalletAddress,  // signal = agent wallet address
      )
      setConnectorURI(session.connectorURI)
      setStatus('waiting')

      // DO NOT redirect — keep this tab alive for polling
      // User taps "Open in World App" link manually

      // Poll for result (tab stays in background while World App is open)
      const result = await pollBridgeResult(session)
      if (cancelledRef.current) return

      clearBridgeSession()
      setStatus('submitting')

      const proof = normalizeProof(result.proof)
      if (!proof) throw new Error(`Invalid proof format`)

      // Submit to our backend → relay → on-chain
      const res = await fetch('/api/agents/agentbook-register', {
        method: 'POST',
        headers: buildAuthHeaders(editToken, ownerWalletAddress),
        body: JSON.stringify({
          agentName, agentAddress: agentWalletAddress,
          root: result.merkle_root, nonce,
          nullifierHash: result.nullifier_hash, proof,
          contract: AGENTBOOK_CONTRACT, network: AGENTBOOK_NETWORK,
        }),
      })

      const data = (await res.json()) as { ok?: boolean; txHash?: string; error?: string }
      if (!res.ok) throw new Error(data.error || `Registration failed (${res.status})`)

      setTxHash(data.txHash || null)
      setStatus('done')
      onRegistered?.()
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : 'Registration failed')
        setStatus('error')
      }
    }
  }, [agentWalletAddress, agentName, nonce, editToken, ownerWalletAddress, onRegistered])

  useEffect(() => () => { cancelledRef.current = true }, [])

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

  // QR code + link (NO auto-redirect — tab stays alive for polling)
  if (status === 'waiting' && connectorURI) return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 max-w-sm">
      <h4 className="text-white text-sm font-semibold mb-3">📱 Verify with World App</h4>
      <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-3">
        <QRCode value={connectorURI} size={200} />
      </div>
      <p className="text-gray-400 text-xs text-center mb-2">
        Scan QR code, or tap below on mobile:
      </p>
      <a
        href={connectorURI}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg py-2 px-4 mb-3 transition-colors"
      >
        Open in World App →
      </a>
      <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs">
        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for verification...
      </div>
      <p className="text-gray-600 text-xs text-center mt-2">
        Keep this page open while verifying
      </p>
      <button onClick={() => { cancelledRef.current = true; setStatus('ready'); setConnectorURI(null) }}
        className="mt-3 text-gray-500 text-xs hover:text-gray-400 w-full text-center">Cancel</button>
    </div>
  )

  if (status === 'submitting') return (
    <div className="flex items-center gap-2 text-cyan-400 text-xs">
      <Loader2 className="w-3 h-3 animate-spin" /> Registering on-chain...
    </div>
  )

  return (
    <div>
      <button onClick={handleRegister} disabled={status === 'creating'}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
        {status === 'creating' ? <><Loader2 className="w-3 h-3 animate-spin" /> Preparing...</>
          : <>📖 Register to AgentBook</>}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {status === 'error' && <button onClick={() => { setError(''); setStatus('ready') }} className="text-gray-500 text-xs mt-1 hover:text-gray-400">Try again</button>}
    </div>
  )
}
