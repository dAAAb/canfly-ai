/**
 * TasksDashboardPage — Buyer + Seller tasks dashboard.
 *
 * Shows dual-view tabs: "My Orders" (buyer) and "Received Orders" (seller).
 * Route: /u/:username/tasks
 *
 * CAN-264: Tasks dashboard
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { getApiAuthHeaders } from '../utils/apiAuth'
import Navbar from '../components/Navbar'
import {
  ShoppingCart, Store, Loader2, Clock, AlertCircle, Package,
  CheckCircle, XCircle, ExternalLink, Filter,
} from 'lucide-react'

type EscrowStatus = 'none' | 'deposited' | 'completed' | 'released' | 'refunded' | 'rejected'

interface BuyerTask {
  id: string
  seller_agent: string
  skill_name: string
  status: string
  escrow_status: EscrowStatus
  amount: number | null
  currency: string | null
  created_at: string
  completed_at: string | null
  confirmed_at: string | null
  rejected_at: string | null
  reject_reason: string | null
  result_url: string | null
  sla_deadline: string | null
  role: 'buyer'
}

interface SellerTask {
  id: string
  buyer_agent: string | null
  buyer_email: string | null
  buyer_wallet: string | null
  seller_agent: string
  skill_name: string
  status: string
  escrow_status: EscrowStatus
  amount: number | null
  currency: string | null
  created_at: string
  completed_at: string | null
  confirmed_at: string | null
  rejected_at: string | null
  result_url: string | null
  sla_deadline: string | null
  role: 'seller'
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-blue-500/20 text-blue-400 border-blue-700/40',
  executing: 'bg-yellow-500/20 text-yellow-400 border-yellow-700/40',
  completed: 'bg-green-500/20 text-green-400 border-green-700/40',
  failed: 'bg-red-500/20 text-red-400 border-red-700/40',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-700/40',
}

const ESCROW_COLORS: Record<EscrowStatus, string> = {
  none: 'text-gray-500',
  deposited: 'text-blue-400',
  completed: 'text-yellow-400',
  released: 'text-green-400',
  refunded: 'text-orange-400',
  rejected: 'text-red-400',
}

const STATUS_OPTIONS = ['all', 'paid', 'executing', 'completed', 'failed', 'cancelled'] as const

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function truncateId(id: string): string {
  if (id.length <= 14) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[status] || 'text-gray-400 border-gray-700'}`}>
      {status}
    </span>
  )
}

function EscrowBadge({ status }: { status: EscrowStatus }) {
  if (status === 'none') return null
  return (
    <span className={`text-xs ${ESCROW_COLORS[status]}`}>
      escrow: {status}
    </span>
  )
}

function StatusIcon({ status, escrowStatus }: { status: string; escrowStatus: EscrowStatus }) {
  if (escrowStatus === 'released' || (status === 'completed' && escrowStatus === 'none')) {
    return <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
  }
  if (escrowStatus === 'rejected' || status === 'failed') {
    return <XCircle className="w-5 h-5 text-red-400 shrink-0" />
  }
  if (escrowStatus === 'refunded') {
    return <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
  }
  if (status === 'executing' || escrowStatus === 'completed') {
    return <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
  }
  return <Clock className="w-5 h-5 text-gray-500 shrink-0" />
}

interface Props {
  subdomainUsername?: string
}

export default function TasksDashboardPage({ subdomainUsername }: Props) {
  const params = useParams<{ username: string }>()
  const username = subdomainUsername || params.username || ''
  const { t } = useTranslation()
  const { isAuthenticated, login, walletAddress, getAccessToken } = useAuth()

  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [buyerTasks, setBuyerTasks] = useState<BuyerTask[]>([])
  const [sellerTasks, setSellerTasks] = useState<SellerTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!username) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ view: 'all' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/community/users/${encodeURIComponent(username)}/tasks?${params}`, {
        headers: await getApiAuthHeaders({ getAccessToken, walletAddress }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json() as {
        buyer_tasks: BuyerTask[]
        seller_tasks: SellerTask[]
      }
      setBuyerTasks(data.buyer_tasks || [])
      setSellerTasks(data.seller_tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [username, walletAddress, getAccessToken, statusFilter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const currentTasks = tab === 'buyer' ? buyerTasks : sellerTasks

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-2xl font-bold mb-2">{t('tasksDashboard.title', 'Tasks')}</h1>
        <p className="text-gray-400 text-sm mb-6">
          {t('tasksDashboard.subtitle', 'View your orders and received tasks.')}
        </p>

        {!isAuthenticated ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{t('tasksDashboard.loginRequired', 'Sign in to view your tasks.')}</p>
            <button onClick={login} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              {t('tasksDashboard.signIn', 'Sign In')}
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-900 rounded-lg p-1 w-fit">
              <button
                onClick={() => setTab('buyer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'buyer' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                {t('tasksDashboard.myOrders', 'My Orders')}
                {buyerTasks.length > 0 && (
                  <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{buyerTasks.length}</span>
                )}
              </button>
              <button
                onClick={() => setTab('seller')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'seller' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Store className="w-4 h-4" />
                {t('tasksDashboard.receivedOrders', 'Received Orders')}
                {sellerTasks.length > 0 && (
                  <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{sellerTasks.length}</span>
                )}
              </button>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-500" />
              <div className="flex gap-1 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      statusFilter === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {s === 'all' ? t('tasksDashboard.filterAll', 'All') : s}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">&times;</button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('tasksDashboard.loading', 'Loading tasks...')}
              </div>
            ) : currentTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>
                  {tab === 'buyer'
                    ? t('tasksDashboard.noBuyerTasks', 'No orders yet.')
                    : t('tasksDashboard.noSellerTasks', 'No received orders yet.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentTasks.map((task) => (
                  <TaskCard key={task.id} task={task} tab={tab} t={t} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, tab, t }: {
  task: BuyerTask | SellerTask
  tab: 'buyer' | 'seller'
  t: (key: string, fallback: string) => string
}) {
  const counterparty = tab === 'buyer'
    ? (task as BuyerTask).seller_agent
    : (task as SellerTask).buyer_agent || (task as SellerTask).buyer_email || t('tasksDashboard.anonymous', 'Anonymous')

  const counterpartyLabel = tab === 'buyer'
    ? t('tasksDashboard.seller', 'Seller')
    : t('tasksDashboard.buyer', 'Buyer')

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <StatusIcon status={task.status} escrowStatus={task.escrow_status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">{task.skill_name}</p>
            <StatusBadge status={task.status} />
            <EscrowBadge status={task.escrow_status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>{counterpartyLabel}: {counterparty}</span>
            {task.amount != null && (
              <span>{task.amount} {task.currency || 'USDC'}</span>
            )}
            <span>{formatDate(task.created_at)}</span>
            <span className="font-mono text-gray-600" title={task.id}>{truncateId(task.id)}</span>
          </div>
          {task.result_url && (
            <a
              href={task.result_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              {t('tasksDashboard.viewResult', 'View Result')}
            </a>
          )}
          {(task as BuyerTask).reject_reason && (
            <p className="text-xs text-red-400/70 mt-1 truncate" title={(task as BuyerTask).reject_reason!}>
              {t('tasksDashboard.rejected', 'Rejected')}: {(task as BuyerTask).reject_reason}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
