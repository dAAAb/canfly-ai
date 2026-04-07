/**
 * CAN-234: One-click Pay & Order via TaskEscrow contract.
 *
 * Flow: generate-id → approve USDC → deposit() → POST /tasks
 * User perceives one button click.
 */
import { useState, useCallback } from 'react'
import { useWallets } from '@privy-io/react-auth'
import {
  createWalletClient, custom, parseUnits, encodeFunctionData,
  type Hash,
} from 'viem'
import { base } from 'viem/chains'

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
const USDC_DECIMALS = 6
const DEFAULT_ESCROW_CONTRACT = import.meta.env.VITE_ESCROW_CONTRACT || ''

// ERC-20 approve ABI fragment
const APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const

// TaskEscrow deposit ABI fragment
const DEPOSIT_ABI = [{
  name: 'deposit',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'taskId', type: 'bytes32' },
    { name: 'seller', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'slaDeadline', type: 'uint256' },
  ],
  outputs: [],
}] as const

export type PaymentStep = 'idle' | 'generating' | 'approving' | 'depositing' | 'confirming' | 'done' | 'error'

interface PaymentResult {
  taskId: string
  txHash: string
  status: string
}

export function useEscrowPayment() {
  const { wallets } = useWallets()
  const [step, setStep] = useState<PaymentStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PaymentResult | null>(null)

  const pay = useCallback(async (opts: {
    agentName: string
    sellerWallet: string
    skillName: string
    price: number
    currency?: string
    slaSeconds?: number
    params?: Record<string, unknown>
    buyer?: string
    buyerEmail?: string
    escrowContract?: string
  }) => {
    setStep('idle')
    setError(null)
    setResult(null)

    const wallet = wallets[0]
    if (!wallet) {
      setError('No wallet connected. Please connect your wallet first.')
      setStep('error')
      return null
    }

    try {
      // Ensure wallet is on Base chain before any transactions
      try {
        await wallet.switchChain(base.id)
      } catch (switchErr) {
        // If switchChain fails, the wallet may not support it or user rejected
        console.warn('switchChain failed, attempting anyway:', switchErr)
      }

      // Get an EIP-1193 provider and create a viem wallet client
      const provider = await wallet.getEthereumProvider()
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider),
      })
      const [account] = await walletClient.getAddresses()
      if (!account) throw new Error('No wallet address found')

      const amountRaw = parseUnits(String(opts.price), USDC_DECIMALS)
      const escrowContractAddr = opts.escrowContract || DEFAULT_ESCROW_CONTRACT
      if (!escrowContractAddr) throw new Error('Escrow contract address not configured')
      const escrowAddr = escrowContractAddr as `0x${string}`
      const sellerAddr = opts.sellerWallet as `0x${string}`

      // Step 1: Generate task ID
      setStep('generating')
      const idRes = await fetch(`/api/agents/${opts.agentName}/tasks/generate-id`)
      if (!idRes.ok) throw new Error('Failed to generate task ID')
      const { task_id: taskId } = await idRes.json() as { task_id: string }

      // Step 2: Approve USDC spend
      setStep('approving')
      const approveData = encodeFunctionData({
        abi: APPROVE_ABI,
        functionName: 'approve',
        args: [escrowAddr, amountRaw],
      })
      await walletClient.sendTransaction({
        account,
        to: USDC_CONTRACT,
        data: approveData,
        chain: base,
      })

      // Step 3: Deposit into escrow
      setStep('depositing')
      const slaDeadline = BigInt(Math.floor(Date.now() / 1000) + (opts.slaSeconds || 3600))
      const depositData = encodeFunctionData({
        abi: DEPOSIT_ABI,
        functionName: 'deposit',
        args: [taskId as `0x${string}`, sellerAddr, amountRaw, slaDeadline],
      })
      const depositTxHash: Hash = await walletClient.sendTransaction({
        account,
        to: escrowAddr,
        data: depositData,
        chain: base,
      })

      // Step 4: POST /tasks with tx_hash (atomic creation)
      setStep('confirming')
      const taskRes = await fetch(`/api/agents/${opts.agentName}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: opts.skillName,
          tx_hash: depositTxHash,
          task_id: taskId,
          payment_method: 'escrow',
          buyer: opts.buyer || undefined,
          buyer_email: opts.buyerEmail || undefined,
          params: opts.params || undefined,
        }),
      })

      if (!taskRes.ok) {
        const err = await taskRes.json() as { error?: string }
        throw new Error(err.error || `Task creation failed (${taskRes.status})`)
      }

      const taskData = await taskRes.json() as { task_id: string; status: string }

      const paymentResult: PaymentResult = {
        taskId: taskData.task_id,
        txHash: depositTxHash,
        status: taskData.status,
      }
      setResult(paymentResult)
      setStep('done')
      return paymentResult
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed'
      setError(msg)
      setStep('error')
      return null
    }
  }, [wallets])

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setResult(null)
  }, [])

  return { pay, step, error, result, reset, hasWallet: wallets.length > 0 }
}
