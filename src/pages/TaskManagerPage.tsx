/**
 * TaskManagerPage — Buyer's escrow task management.
 *
 * Shows tasks purchased by the logged-in user with confirm/reject actions.
 * CAN-265: Escrow confirm frontend
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import { CheckCircle, XCircle, Loader2, Clock, AlertCircle, Package, Star } from 'lucide-react'

type EscrowStatus = 'none' | 'deposited' | 'completed' | 'released' | 'refunded' | 'rejected'

interface Task {
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
  result_data: string | null
  sla_deadline: string | null
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-blue-500/20 text-blue-400 border-blue-700/40',
  executing: 'bg-yellow-500/20 text-yellow-400 border-yellow-700/40',
  completed: 'bg-green-500/20 text-green-400 border-green-700/40',
  failed: 'bg-red-500/20 text-red-400 border-red-700/40',
  timeout: 'bg-gray-500/20 text-gray-400 border-gray-700/40',
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function TaskManagerPage() {
  const { t } = useTranslation()
  const { isAuthenticated, login, walletAddress } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [showReject, setShowReject] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!walletAddress) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks?buyer_wallet=${walletAddress}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json() as { tasks: Task[] }
      setTasks(data.tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  useEffect(() => { if (walletAddress) fetchTasks() }, [walletAddress, fetchTasks])

  const confirmTask = async (task: Task) => {
    setActionLoading(task.id)
    try {
      const res = await fetch(`/api/agents/${task.seller_agent}/tasks/${task.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || `Error ${res.status}`)
      }
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed')
    } finally {
      setActionLoading(null)
    }
  }

  const rejectTask = async (task: Task) => {
    const reason = rejectReason[task.id]?.trim()
    if (!reason) return
    setActionLoading(task.id)
    try {
      const res = await fetch(`/api/agents/${task.seller_agent}/tasks/${task.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || `Error ${res.status}`)
      }
      setShowReject(null)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setActionLoading(null)
    }
  }

  // Separate tasks by actionable vs historical
  const actionable = tasks.filter((t) => t.escrow_status === 'completed')
  const historical = tasks.filter((t) => t.escrow_status !== 'completed')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{t('taskManager.title', 'My Orders')}</h1>
        <p className="text-gray-400 text-sm mb-6">{t('taskManager.subtitle', 'Review completed tasks and release escrow payments.')}</p>

        {!isAuthenticated ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{t('taskManager.loginRequired', 'Sign in to view your orders.')}</p>
            <button onClick={login} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              {t('taskManager.signIn', 'Sign In')}
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('taskManager.loading', 'Loading orders...')}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">&times;</button>
              </div>
            )}

            {/* Actionable: awaiting buyer confirmation */}
            {actionable.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  {t('taskManager.awaitingConfirmation', 'Awaiting Your Confirmation')}
                  <span className="text-sm font-normal text-gray-500">({actionable.length})</span>
                </h2>
                <div className="space-y-3">
                  {actionable.map((task) => (
                    <div key={task.id} className="rounded-xl border border-yellow-700/30 bg-gray-900/80 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-medium">{task.skill_name}</p>
                          <p className="text-xs text-gray-500">
                            {t('taskManager.seller', 'Seller')}: {task.seller_agent}
                            {task.amount != null && ` · ${task.amount} ${task.currency || 'USDC'}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('taskManager.completed', 'Completed')}: {task.completed_at ? formatDate(task.completed_at) : '—'}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[task.status] || 'text-gray-400'}`}>
                          {task.status}
                        </span>
                      </div>

                      {task.result_url && (
                        <a href={task.result_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline mb-3 inline-block">
                          {t('taskManager.viewResult', 'View Result')}
                        </a>
                      )}

                      <p className="text-xs text-yellow-400/70 mb-3">
                        {t('taskManager.autoReleaseNotice', 'Funds auto-release to seller after 7 days if no action taken.')}
                      </p>

                      {showReject === task.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={rejectReason[task.id] || ''}
                            onChange={(e) => setRejectReason((prev) => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder={t('taskManager.rejectReasonPlaceholder', 'Why are you rejecting this delivery?')}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => rejectTask(task)}
                              disabled={actionLoading === task.id || !rejectReason[task.id]?.trim()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              {t('taskManager.confirmReject', 'Reject & Refund')}
                            </button>
                            <button onClick={() => setShowReject(null)} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors">
                              {t('taskManager.cancelAction', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmTask(task)}
                            disabled={actionLoading === task.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {t('taskManager.confirmRelease', 'Confirm & Release Funds')}
                          </button>
                          <button
                            onClick={() => setShowReject(task.id)}
                            disabled={actionLoading === task.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm border border-gray-700 disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            {t('taskManager.reject', 'Reject')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Historical tasks */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                {t('taskManager.orderHistory', 'Order History')}
                {tasks.length > 0 && <span className="text-sm font-normal text-gray-500">({tasks.length})</span>}
              </h2>
              {historical.length === 0 && actionable.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>{t('taskManager.noOrders', 'No orders yet.')}</p>
                </div>
              ) : historical.length === 0 ? (
                <p className="text-sm text-gray-500">{t('taskManager.noHistory', 'No past orders.')}</p>
              ) : (
                <div className="space-y-2">
                  {historical.map((task) => (
                    <div key={task.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 flex items-center gap-3">
                      <div className="shrink-0">
                        {task.escrow_status === 'released' ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : task.escrow_status === 'rejected' ? (
                          <XCircle className="w-5 h-5 text-red-400" />
                        ) : task.escrow_status === 'refunded' ? (
                          <AlertCircle className="w-5 h-5 text-orange-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.skill_name}</p>
                        <p className="text-xs text-gray-500">
                          {task.seller_agent}
                          {task.amount != null && ` · ${task.amount} ${task.currency || 'USDC'}`}
                          {' · '}
                          {formatDate(task.created_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs ${ESCROW_COLORS[task.escrow_status]}`}>
                          {task.escrow_status}
                        </span>
                        {task.reject_reason && (
                          <p className="text-xs text-red-400/70 mt-0.5 max-w-[200px] truncate" title={task.reject_reason}>
                            {task.reject_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
