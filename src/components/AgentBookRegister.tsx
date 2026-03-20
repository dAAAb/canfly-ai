import { useState, useEffect, useCallback } from 'react'
import { IDKitRequestWidget, orbLegacy } from '@worldcoin/idkit'
import type { IDKitResult, RpContext } from '@worldcoin/idkit'
import { Loader2, ExternalLink } from 'lucide-react'

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

function buildAuthHeaders(
  editToken: string | null,
  walletAddress: string | null,
): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (editToken) h['X-Edit-Token'] = editToken
  else if (walletAddress) h['X-Wallet-Address'] = walletAddress
  return h
}

export default function AgentBookRegister({
  agentName,
  agentWalletAddress,
  ownerUsername,
  editToken,
  ownerWalletAddress,
  onRegistered,
}: Props) {
  const [status, setStatus] = useState<
    'loading' | 'no_wallet' | 'already_registered' | 'ready' | 'verifying' | 'submitting' | 'done' | 'error'
  >('loading')
  const [nonce, setNonce] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)

  // Check registration status on mount
  useEffect(() => {
    if (!agentWalletAddress) {
      setStatus('no_wallet')
      return
    }

    fetch(`/api/agents/agentbook-nonce?address=${agentWalletAddress}`)
      .then((r) => r.json())
      .then((data: { nonce?: string; isRegistered?: boolean }) => {
        if (data.isRegistered) {
          setStatus('already_registered')
        } else {
          setNonce(data.nonce || '0')
          setStatus('ready')
        }
      })
      .catch(() => {
        setNonce('0')
        setStatus('ready')
      })
  }, [agentWalletAddress])

  // Open IDKit for AgentBook registration (no RP signature needed - uses AgentBook's own World ID app)
  const handleStartRegistration = useCallback(() => {
    setError('')
    setStatus('verifying')
    setWidgetOpen(true)
  }, [])

  // IDKit proof received — submit to our backend relay
  const handleVerify = useCallback(
    async (idkitResult: IDKitResult) => {
      setStatus('submitting')
      try {
        const firstResponse = idkitResult.responses?.[0] as Record<string, unknown> | undefined
        if (!firstResponse) throw new Error('No proof in IDKit result')

        const root = (firstResponse.merkle_root as string) || ''
        const nullifierHash = (firstResponse.nullifier as string) || (firstResponse.nullifier_hash as string) || ''
        const proof = (firstResponse.proof as string[]) || []

        const res = await fetch('/api/agents/agentbook-register', {
          method: 'POST',
          headers: buildAuthHeaders(editToken, ownerWalletAddress),
          body: JSON.stringify({
            agentName,
            agentAddress: agentWalletAddress,
            root,
            nonce: nonce || '0',
            nullifierHash,
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Registration failed')
        setStatus('error')
        throw e
      }
    },
    [agentName, agentWalletAddress, nonce, editToken, ownerWalletAddress, onRegistered],
  )

  const handleSuccess = useCallback(() => {
    setWidgetOpen(false)
    if (status !== 'done') setStatus('done')
  }, [status])

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
          📖 AgentBook Verified
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

  // AgentBook registration currently requires CLI (World App QR bridge, not web widget)
  const cliCommand = `npx @worldcoin/agentkit-cli register ${agentWalletAddress} --network base`

  return (
    <div>
      <div className="space-y-2">
        <p className="text-gray-400 text-xs">
          Register this agent on-chain via AgentBook CLI:
        </p>
        <div className="relative">
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
            <code>{cliCommand}</code>
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(cliCommand)
              setError('Copied!')
              setTimeout(() => setError(''), 2000)
            }}
            className="absolute top-2 right-2 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 text-xs"
          >
            📋
          </button>
        </div>
        <p className="text-gray-500 text-xs">
          Requires <a href="https://worldcoin.org/download" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">World App</a> installed.
          After registration, refresh this page to see the badge.
        </p>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
