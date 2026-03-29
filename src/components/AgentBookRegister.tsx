/**
 * AgentBookRegister — World ID verification for AgentBook on-chain registration.
 *
 * Uses the bridge.worldcoin.org protocol (no WASM needed).
 * Key fix: uses visibilitychange to resume polling after mobile app switch.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { decodeAbiParameters, keccak256, encodePacked } from 'viem'
import QRCode from 'react-qr-code'
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react'
import { getApiAuthHeaders } from '../utils/apiAuth'
import {
  createBridgeSession,
  pollBridgeResult,
  pollBridgeOnce,
  saveBridgeSession,
  loadBridgeSession,
  clearBridgeSession,
  type BridgeSession,
  type BridgeResult,
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
  getAccessToken: () => Promise<string | null>
  onRegistered?: () => void
}

/** @deprecated — kept as type reference only; callers now use getApiAuthHeaders */

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
  agentName, agentWalletAddress, ownerUsername, editToken, ownerWalletAddress, getAccessToken, onRegistered,
}: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [nonce, setNonce] = useState('0')
  const [connectorURI, setConnectorURI] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState('')
  const cancelledRef = useRef(false)
  const sessionRef = useRef<BridgeSession | null>(null)
  const pollingRef = useRef(false)
  const submittingRef = useRef(false)

  // Submit proof to backend relay
  const submitProof = useCallback(async (result: BridgeResult) => {
    if (!agentWalletAddress || submittingRef.current) return
    submittingRef.current = true
    setStatus('submitting')

    const proof = normalizeProof(result.proof)
    if (!proof) {
      submittingRef.current = false
      throw new Error('Invalid proof format')
    }

    const res = await fetch('/api/agents/agentbook-register', {
      method: 'POST',
      headers: await getApiAuthHeaders({ getAccessToken, walletAddress: ownerWalletAddress, editToken }),
      body: JSON.stringify({
        agentName, agentAddress: agentWalletAddress,
        root: result.merkle_root, nonce,
        nullifierHash: result.nullifier_hash, proof,
        contract: AGENTBOOK_CONTRACT, network: AGENTBOOK_NETWORK,
      }),
    })

    // Safely parse response — Cloudflare may return HTML error pages for 502/503
    let data: { ok?: boolean; txHash?: string; error?: string }
    const responseText = await res.text()
    try {
      data = JSON.parse(responseText)
    } catch {
      submittingRef.current = false
      console.error('[AgentBook] Non-JSON response from register API:', responseText.substring(0, 200))
      throw new Error(`Registration failed (${res.status}): server returned non-JSON response`)
    }

    if (!res.ok) {
      submittingRef.current = false
      throw new Error(data.error || `Registration failed (${res.status})`)
    }

    clearBridgeSession()
    sessionRef.current = null
    pollingRef.current = false
    setTxHash(data.txHash || null)
    setStatus('done')
    onRegistered?.()
  }, [agentWalletAddress, agentName, nonce, editToken, ownerWalletAddress, getAccessToken, onRegistered])

  const failWithError = useCallback((message: string) => {
    setError(message)
    setStatus('error')
  }, [])

  // Start polling for bridge response (can be called multiple times safely)
  const startPolling = useCallback(async (session: BridgeSession) => {
    if (pollingRef.current || cancelledRef.current) return
    pollingRef.current = true

    try {
      console.log('[AgentBook] Starting/resuming poll for request:', session.requestId)
      const result = await pollBridgeResult(session, 300000, 2000)
      if (cancelledRef.current) return

      clearBridgeSession()
      await submitProof(result)
    } catch (e) {
      if (!cancelledRef.current) failWithError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      pollingRef.current = false
    }
  }, [submitProof, failWithError])

  // Immediate one-shot check, then restart full poll if needed
  const resumePolling = useCallback(async () => {
    const session = sessionRef.current
    if (!session || cancelledRef.current || submittingRef.current) return

    try {
      const result = await pollBridgeOnce(session)
      if (result) {
        await submitProof(result)
        return
      }
    } catch (e) {
      if (!cancelledRef.current) failWithError(e instanceof Error ? e.message : 'Registration failed')
      return
    }

    if (!pollingRef.current) startPolling(session)
  }, [startPolling, submitProof, failWithError])

  // Handle visibilitychange — resume polling when user comes back from World App
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[AgentBook] Page became visible, resuming poll')
        void resumePolling()
      }
    }

    // Also handle bfcache (iOS Safari)
    const pageshowHandler = (e: PageTransitionEvent) => {
      if (e.persisted) {
        console.log('[AgentBook] Page restored from bfcache, resuming poll')
        void resumePolling()
      }
    }

    document.addEventListener('visibilitychange', handler)
    window.addEventListener('pageshow', pageshowHandler)
    window.addEventListener('focus', handler)

    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('pageshow', pageshowHandler)
      window.removeEventListener('focus', handler)
    }
  }, [resumePolling])

  useEffect(() => {
    if (status === 'waiting') void resumePolling()
  }, [status, resumePolling])

  // Check status on mount + try to resume a saved session
  useEffect(() => {
    if (!agentWalletAddress) { setStatus('no_wallet'); return }

    const init = async () => {
      // Check if already registered
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/agentbook-status`)
        const d = (await res.json()) as Record<string, unknown>
        if (d.registered) {
          setStatus('already_registered')
          setTxHash((d.txHash as string) || null)
          return
        }
        setNonce((d.nonce as string) || '0')
      } catch {
        // continue
      }

      // Try to resume a saved bridge session (e.g. user just came back from World App)
      const saved = await loadBridgeSession(agentName)
      if (saved) {
        console.log('[AgentBook] Found saved bridge session, resuming...')
        sessionRef.current = saved
        setConnectorURI(saved.connectorURI)
        setStatus('waiting')
        startPolling(saved)
        return
      }

      setStatus('ready')
    }

    init()
  }, [agentName, agentWalletAddress, startPolling])

  // Register flow: create bridge → show QR → poll
  const handleRegister = useCallback(async () => {
    if (!agentWalletAddress) return
    setError('')
    setStatus('creating')
    cancelledRef.current = false

    try {
      // Compute signal hash matching the contract's abi.encodePacked(agent, nonce).hashToField()
      // The contract does: keccak256(abi.encodePacked(address, uint256)) >> 8
      const packedSignal = encodePacked(
        ['address', 'uint256'],
        [agentWalletAddress as `0x${string}`, BigInt(nonce)]
      )
      const signalKeccak = keccak256(packedSignal)
      const signalHash = `0x${(BigInt(signalKeccak) >> 8n).toString(16).padStart(64, '0')}`
      console.log(`[AgentBook] signal: agent=${agentWalletAddress} nonce=${nonce} hash=${signalHash}`)

      const session = await createBridgeSession(
        AGENTBOOK_WORLD_ID_APP_ID,
        AGENTBOOK_ACTION,
        agentWalletAddress,
        window.location.href,
        signalHash,  // pre-computed signal hash matching contract
      )

      // Persist session so it survives app switching
      saveBridgeSession(session, agentName)
      sessionRef.current = session

      setConnectorURI(session.connectorURI)
      setStatus('waiting')

      // Start polling
      startPolling(session)
    } catch (e) {
      if (!cancelledRef.current) failWithError(e instanceof Error ? e.message : 'Registration failed')
    }
  }, [agentWalletAddress, agentName, startPolling, failWithError])

  const handleCancel = useCallback(() => {
    cancelledRef.current = true
    sessionRef.current = null
    clearBridgeSession()
    setStatus('ready')
    setConnectorURI(null)
    submittingRef.current = false
  }, [])

  useEffect(() => () => { cancelledRef.current = true }, [])

  // ── Render ──

  if (status === 'loading') return <div className="text-gray-500 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</div>
  if (status === 'no_wallet') return <div className="text-gray-500 text-xs">Agent needs a wallet address for AgentBook.</div>

  if (status === 'already_registered' || status === 'done') return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/20 text-emerald-400 text-xs border border-emerald-600/40 font-medium">
        <CheckCircle className="w-3 h-3" /> AgentBook Verified
      </span>
      {txHash && <a href={`https://worldscan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> tx</a>}
    </div>
  )

  // QR code + link
  if (status === 'waiting' && connectorURI) return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 max-w-sm">
      <h4 className="text-white text-sm font-semibold mb-3">📱 Verify with World App</h4>
      <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-3">
        <QRCode value={connectorURI} size={200} />
      </div>
      <p className="text-gray-400 text-xs text-center mb-2">
        Scan QR code with World App, or tap below on mobile:
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
        After verifying in World App, come back to this page.
        <br />It will automatically detect your verification.
      </p>
      <button onClick={handleCancel}
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
