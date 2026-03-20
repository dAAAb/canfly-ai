/**
 * AgentBookRegister — Web-based AgentBook registration using World ID bridge protocol
 *
 * Flow:
 * 1. Get nonce from AgentBook contract (via our API)
 * 2. Create World ID bridge session (same as CLI does)
 * 3. Show QR code for World App scanning
 * 4. Poll for completion
 * 5. Submit proof to relay → on-chain registration
 * 6. Record in our DB
 */
import { useState, useEffect, useCallback, useRef } from 'react'
// Use idkit-core v2 for bridge protocol (v4 removed createWorldBridgeStore)
// @ts-expect-error - aliased package
import { createWorldBridgeStore } from '@worldcoin/idkit-core-v2'
import { decodeAbiParameters, encodeAbiParameters, keccak256 } from 'viem'
import QRCode from 'react-qr-code'
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react'
import {
  AGENTBOOK_WORLD_ID_APP_ID,
  AGENTBOOK_ACTION,
  AGENTBOOK_CONTRACT,
  AGENTBOOK_NETWORK,
  AGENTBOOK_RELAY_URL,
} from '../config/agentbook'

interface Props {
  agentName: string
  agentWalletAddress: string | null
  ownerUsername: string
  editToken: string | null
  ownerWalletAddress: string | null
  onRegistered?: () => void
}

function buildAuthHeaders(
  editToken: string | null,
  walletAddress: string | null,
): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (editToken) h['X-Edit-Token'] = editToken
  else if (walletAddress) h['X-Wallet-Address'] = walletAddress
  return h
}

function normalizeProof(result: { proof: string }): string[] | null {
  const rawProof = result.proof
  if (rawProof.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawProof)
      if (Array.isArray(parsed)) return parsed
    } catch { /* fall through */ }
  }
  try {
    const decoded = decodeAbiParameters([{ type: 'uint256[8]' }], rawProof as `0x${string}`)[0]
    return decoded.map((v: bigint) => `0x${v.toString(16).padStart(64, '0')}`)
  } catch {
    return null
  }
}

type Status = 'loading' | 'no_wallet' | 'already_registered' | 'ready' |
  'creating_bridge' | 'waiting_scan' | 'submitting' | 'done' | 'error'

export default function AgentBookRegister({
  agentName,
  agentWalletAddress,
  ownerUsername,
  editToken,
  ownerWalletAddress,
  onRegistered,
}: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [nonce, setNonce] = useState<string>('0')
  const [connectorURI, setConnectorURI] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState('')
  const bridgeRef = useRef<ReturnType<typeof createWorldBridgeStore> | null>(null)
  const pollingRef = useRef(false)

  // Check registration status + get nonce on mount
  useEffect(() => {
    if (!agentWalletAddress) {
      setStatus('no_wallet')
      return
    }
    fetch(`/api/agents/${agentName}/agentbook-status`)
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (data.registered) {
          setStatus('already_registered')
          setTxHash((data.txHash as string) || null)
        } else {
          setNonce((data.nonce as string) || '0')
          setStatus('ready')
        }
      })
      .catch(() => {
        setNonce('0')
        setStatus('ready')
      })
  }, [agentName, agentWalletAddress])

  // Start bridge flow
  const handleRegister = useCallback(async () => {
    if (!agentWalletAddress) return
    setError('')
    setStatus('creating_bridge')

    try {
      // 1. Create signal hash (same as CLI: keccak256(abi.encode(address, uint256)))
      const encoded = encodeAbiParameters(
        [{ type: 'address' }, { type: 'uint256' }],
        [agentWalletAddress as `0x${string}`, BigInt(nonce)]
      )
      const signal = keccak256(encoded)

      // 2. Create World ID bridge
      const worldID = createWorldBridgeStore()
      bridgeRef.current = worldID

      await worldID.getState().createClient({
        app_id: AGENTBOOK_WORLD_ID_APP_ID,
        action: AGENTBOOK_ACTION,
        signal,
      })

      // 3. Get connector URI (deep link to World App)
      const uri = worldID.getState().connectorURI
      if (!uri) throw new Error('Failed to create bridge session')
      setConnectorURI(uri)
      setStatus('waiting_scan')

      // Auto-redirect on mobile (deep link opens World App directly)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile) {
        window.location.href = uri
      }

      // 4. Poll for completion (5 min timeout)
      pollingRef.current = true
      const deadline = Date.now() + 300_000
      while (Date.now() < deadline && pollingRef.current) {
        await worldID.getState().pollForUpdates()
        const { result, errorCode } = worldID.getState()

        if (result) {
          // Success! Submit to relay
          pollingRef.current = false
          setStatus('submitting')

          const proof = normalizeProof(result as { proof: string })
          if (!proof) throw new Error('Invalid proof format')

          const proofResult = result as { merkle_root: string; nullifier_hash: string }

          // Submit to our backend → relay → on-chain
          const res = await fetch('/api/agents/agentbook-register', {
            method: 'POST',
            headers: buildAuthHeaders(editToken, ownerWalletAddress),
            body: JSON.stringify({
              agentName,
              agentAddress: agentWalletAddress,
              root: proofResult.merkle_root,
              nonce,
              nullifierHash: proofResult.nullifier_hash,
              proof,
              contract: AGENTBOOK_CONTRACT,
              network: AGENTBOOK_NETWORK,
            }),
          })

          const data = (await res.json()) as { ok?: boolean; txHash?: string; error?: string }
          if (!res.ok) throw new Error(data.error || 'Registration failed')

          setTxHash(data.txHash || null)
          setStatus('done')
          onRegistered?.()
          return
        }

        if (errorCode) {
          pollingRef.current = false
          throw new Error(`World ID error: ${errorCode}`)
        }

        await new Promise((r) => setTimeout(r, 1500))
      }

      if (pollingRef.current) {
        pollingRef.current = false
        throw new Error('Verification timed out (5 min)')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
      setStatus('error')
    }
  }, [agentWalletAddress, agentName, nonce, editToken, ownerWalletAddress, onRegistered])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { pollingRef.current = false }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking AgentBook...
      </div>
    )
  }

  if (status === 'no_wallet') {
    return (
      <div className="text-gray-500 text-xs">
        Agent needs a wallet address for AgentBook registration.
      </div>
    )
  }

  if (status === 'already_registered' || status === 'done') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/20 text-emerald-400 text-xs border border-emerald-600/40 font-medium">
          <CheckCircle className="w-3 h-3" /> AgentBook Verified
        </span>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> tx
          </a>
        )}
      </div>
    )
  }

  // QR code scanning state
  if (status === 'waiting_scan' && connectorURI) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 max-w-sm">
        <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
          📱 Scan with World App
        </h4>
        <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-3">
          <QRCode value={connectorURI} size={200} />
        </div>
        <p className="text-gray-400 text-xs text-center mb-2">
          Scan with World App, or tap below on mobile:
        </p>
        <a
          href={connectorURI}
          className="block text-center text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg py-2 px-4 mb-3 transition-colors"
        >
          Open in World App →
        </a>
        <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" /> Waiting for verification...
        </div>
        <button
          onClick={() => { pollingRef.current = false; setStatus('ready'); setConnectorURI(null) }}
          className="mt-3 text-gray-500 text-xs hover:text-gray-400 w-full text-center"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleRegister}
        disabled={status === 'creating_bridge' || status === 'submitting'}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {status === 'creating_bridge' ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Preparing...</>
        ) : status === 'submitting' ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Registering on-chain...</>
        ) : (
          <>📖 Register to AgentBook</>
        )}
      </button>

      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
    </div>
  )
}
