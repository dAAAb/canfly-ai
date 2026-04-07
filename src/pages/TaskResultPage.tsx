/**
 * TaskResultPage — Buyer-facing task result view (CAN-282).
 *
 * Route: /tasks/:taskId
 * Shows task details, result preview image, download link, and seller notes.
 * Supports auth via login OR token-based URL (?token=...) for sharing.
 */
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { getApiAuthHeaders } from '../utils/apiAuth'
import Navbar from '../components/Navbar'
import ResultPreview from '../components/ResultPreview'
import {
  Loader2, AlertCircle, Clock, CheckCircle,
  Package, FileText, Share2, Copy, Check,
} from 'lucide-react'

interface TaskResult {
  id: string
  seller: string
  buyer: string | null
  buyer_email: string | null
  skill: string
  params: Record<string, unknown> | null
  status: string
  payment: {
    method: string | null
    chain: string | null
    tx: string | null
    amount: number | null
    currency: string | null
  }
  escrow?: {
    tx: string
    status: string
    sla_deadline: string | null
    confirmed_at: string | null
    rejected_at: string | null
    reject_reason: string | null
  }
  created_at: string
  started_at: string | null
  paid_at: string | null
  completed_at: string | null
  execution_time_ms: number | null
  result_url: string | null
  result_content_type: string | null
  result_preview: string | null
  result_note: string | null
  result_data: Record<string, unknown> | null
  share_token: string | null
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle }> = {
  completed: { color: 'bg-green-500/20 text-green-400 border-green-700/40', icon: CheckCircle },
  executing: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-700/40', icon: Clock },
  paid: { color: 'bg-blue-500/20 text-blue-400 border-blue-700/40', icon: Clock },
  failed: { color: 'bg-red-500/20 text-red-400 border-red-700/40', icon: AlertCircle },
  cancelled: { color: 'bg-gray-500/20 text-gray-400 border-gray-700/40', icon: AlertCircle },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  if (min < 60) return `${min}m ${remSec}s`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  return `${hr}h ${remMin}m`
}

export default function TaskResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { isAuthenticated, login, walletAddress, getAccessToken } = useAuth()

  const [task, setTask] = useState<TaskResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const urlToken = searchParams.get('token')

  useEffect(() => {
    if (!taskId) return

    async function fetchTask() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (urlToken) params.set('token', urlToken)
        const qs = params.toString() ? `?${params.toString()}` : ''

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }

        // Add auth headers if logged in (even with token, for share_token generation)
        if (isAuthenticated) {
          const authHeaders = await getApiAuthHeaders({ getAccessToken, walletAddress })
          Object.assign(headers, authHeaders)
        } else if (walletAddress) {
          headers['X-Wallet-Address'] = walletAddress
        }

        const res = await fetch(`/api/tasks/${taskId}${qs}`, { headers })

        if (res.status === 403) {
          setError(urlToken
            ? t('taskResult.tokenExpired', 'This link has expired or is invalid. Please contact the seller for a new link.')
            : t('taskResult.unauthorized', 'You are not authorized to view this task. Please sign in or use a valid sharing link.'))
          return
        }
        if (res.status === 404) {
          setError(t('taskResult.notFound', 'Task not found.'))
          return
        }
        if (!res.ok) throw new Error(`Error ${res.status}`)

        const data = await res.json() as TaskResult
        setTask(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task')
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [taskId, urlToken, isAuthenticated, walletAddress, getAccessToken, t])

  const handleCopyShareLink = async () => {
    if (!task?.share_token || !taskId) return
    const shareUrl = `${window.location.origin}/tasks/${taskId}?token=${task.share_token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text
    }
  }

  const statusCfg = task ? STATUS_CONFIG[task.status] || STATUS_CONFIG.cancelled : null
  const StatusIcon = statusCfg?.icon || Package

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('taskResult.loading', 'Loading task...')}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">{error}</p>
            {!isAuthenticated && !urlToken && (
              <button
                onClick={login}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {t('taskResult.signIn', 'Sign In')}
              </button>
            )}
          </div>
        )}

        {/* Task Content */}
        {!loading && !error && task && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold mb-1">{task.skill}</h1>
                <p className="text-sm text-gray-400">
                  {t('taskResult.taskId', 'Task')}: <span className="font-mono text-xs">{task.id.slice(0, 8)}</span>
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${statusCfg?.color || ''}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {task.status}
              </span>
            </div>

            {/* Result Preview (CAN-289: multimedia auto-detect) */}
            {task.result_url && (
              <ResultPreview
                url={task.result_url}
                contentType={task.result_content_type}
              />
            )}

            {/* Result Note */}
            {task.result_note && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <FileText className="w-4 h-4" />
                  {t('taskResult.sellerNote', 'Seller Note')}
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{task.result_note}</p>
              </div>
            )}

            {/* Task Details */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50">
              <div className="px-4 py-3 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">{t('taskResult.details', 'Task Details')}</h2>
              </div>
              <div className="divide-y divide-gray-800/50">
                <DetailRow label={t('taskResult.skill', 'Skill')} value={task.skill} />
                <DetailRow label={t('taskResult.seller', 'Seller')} value={task.seller} />
                {task.buyer && <DetailRow label={t('taskResult.buyer', 'Buyer')} value={task.buyer} />}
                {task.payment.amount != null && (
                  <DetailRow
                    label={t('taskResult.price', 'Price')}
                    value={`${task.payment.amount} ${task.payment.currency || 'USDC'}`}
                  />
                )}
                <DetailRow label={t('taskResult.created', 'Created')} value={formatDate(task.created_at)} />
                {task.completed_at && (
                  <DetailRow label={t('taskResult.completed', 'Completed')} value={formatDate(task.completed_at)} />
                )}
                {task.execution_time_ms != null && (
                  <DetailRow label={t('taskResult.executionTime', 'Execution Time')} value={formatDuration(task.execution_time_ms)} />
                )}
                {task.payment.chain && (
                  <DetailRow label={t('taskResult.chain', 'Chain')} value={task.payment.chain} />
                )}
                {task.escrow && (
                  <DetailRow
                    label={t('taskResult.escrow', 'Escrow')}
                    value={task.escrow.status}
                    valueClass={
                      task.escrow.status === 'released' ? 'text-green-400' :
                      task.escrow.status === 'rejected' ? 'text-red-400' :
                      task.escrow.status === 'deposited' ? 'text-blue-400' :
                      'text-yellow-400'
                    }
                  />
                )}
              </div>
            </div>

            {/* Share Link */}
            {task.share_token && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Share2 className="w-4 h-4" />
                    {t('taskResult.shareLink', 'Share this result')}
                  </div>
                  <button
                    onClick={handleCopyShareLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
                  >
                    {copied ? (
                      <><Check className="w-3.5 h-3.5 text-green-400" /> {t('taskResult.copied', 'Copied!')}</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> {t('taskResult.copyLink', 'Copy Link')}</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Not completed yet */}
            {task.status !== 'completed' && task.status !== 'failed' && (
              <div className="rounded-xl border border-yellow-700/30 bg-yellow-500/10 p-4 text-center">
                <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-yellow-300">
                  {t('taskResult.inProgress', 'This task is still in progress. Check back later for results.')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm ${valueClass || 'text-gray-200'}`}>{value}</span>
    </div>
  )
}
