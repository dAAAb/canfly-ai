import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useHead } from '../hooks/useHead'
import Navbar from '../components/Navbar'
import SmartAvatar from '../components/SmartAvatar'
import GlassCard from '../components/GlassCard'
import { walletGradient } from '../utils/walletGradient'
import TelegramConnectCard from '../components/TelegramConnectCard'
import {
  LayoutDashboard,
  Bot,
  Activity,
  CircleDot,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Send,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────────────── */

interface KanbanIssue {
  id: string
  identifier: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  assigneeAgentId: string | null
  agentName?: string
  updatedAt: string
}

interface KanbanData {
  todo: KanbanIssue[]
  in_progress: KanbanIssue[]
  in_review: KanbanIssue[]
  done: KanbanIssue[]
}

interface AgentStatus {
  id: string
  name: string
  title: string
  status: 'running' | 'idle' | 'blocked' | 'error'
  lastHeartbeatAt: string | null
  icon: string
}

interface ActivityItem {
  id: string
  type: 'status_change' | 'comment' | 'created' | 'completed'
  issueIdentifier: string
  issueTitle: string
  agentName: string | null
  summary: string
  createdAt: string
}

interface DashboardData {
  kanban: KanbanData
  agents: AgentStatus[]
  activity: ActivityItem[]
}

/* ── Constants ──────────────────────────────────────────── */

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const STATUS_CONFIG: Record<string, { icon: typeof Bot; color: string; bg: string }> = {
  running: { icon: Loader2, color: 'text-green-400', bg: 'bg-green-500/20' },
  idle: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/20' },
  blocked: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
}

const KANBAN_COLUMNS = ['todo', 'in_progress', 'in_review', 'done'] as const

/* ── Helpers ────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/* ── Mock data generator (until real API is connected) ─── */

function generateMockData(): DashboardData {
  return {
    kanban: {
      todo: [
        { id: '1', identifier: 'CAN-301', title: 'Add agent marketplace filters', priority: 'medium', assigneeAgentId: null, agentName: 'Content Writer', updatedAt: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', identifier: 'CAN-302', title: 'Write voice cloning tutorial', priority: 'high', assigneeAgentId: null, agentName: 'Content Writer', updatedAt: new Date(Date.now() - 7200000).toISOString() },
      ],
      in_progress: [
        { id: '3', identifier: 'CAN-255', title: 'Paperclip Dashboard v1', priority: 'medium', assigneeAgentId: null, agentName: 'Content Writer', updatedAt: new Date().toISOString() },
      ],
      in_review: [
        { id: '4', identifier: 'CAN-260', title: 'Release gate check script', priority: 'high', assigneeAgentId: null, agentName: 'CEO', updatedAt: new Date(Date.now() - 1800000).toISOString() },
      ],
      done: [
        { id: '5', identifier: 'CAN-249', title: 'V2 Protection & Rollback Framework', priority: 'critical', assigneeAgentId: null, agentName: 'CEO', updatedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '6', identifier: 'CAN-258', title: 'Kill-switch circuit breaker', priority: 'high', assigneeAgentId: null, agentName: 'CEO', updatedAt: new Date(Date.now() - 172800000).toISOString() },
      ],
    },
    agents: [
      { id: 'a1', name: 'CEO', title: 'Chief Executive Officer', status: 'idle', lastHeartbeatAt: new Date(Date.now() - 300000).toISOString(), icon: 'crown' },
      { id: 'a2', name: 'Content Writer', title: 'Content Producer', status: 'running', lastHeartbeatAt: new Date().toISOString(), icon: 'file-code' },
    ],
    activity: [
      { id: 'ev1', type: 'status_change', issueIdentifier: 'CAN-255', issueTitle: 'Paperclip Dashboard v1', agentName: 'Content Writer', summary: 'Status changed to in_progress', createdAt: new Date().toISOString() },
      { id: 'ev2', type: 'completed', issueIdentifier: 'CAN-249', issueTitle: 'V2 Protection & Rollback Framework', agentName: 'CEO', summary: 'Marked as done', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'ev3', type: 'comment', issueIdentifier: 'CAN-258', issueTitle: 'Kill-switch circuit breaker', agentName: 'CEO', summary: 'Added circuit breaker implementation', createdAt: new Date(Date.now() - 172800000).toISOString() },
    ],
  }
}

/* ── Sub-components ─────────────────────────────────────── */

function KanbanCard({ issue, t }: { issue: KanbanIssue; t: (key: string) => string }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-gray-500">{issue.identifier}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[issue.priority]}`}>
          {t(`dashboard.priority.${issue.priority}`)}
        </span>
      </div>
      <p className="text-sm text-gray-200 leading-snug mb-2">{issue.title}</p>
      <div className="flex items-center justify-between">
        {issue.agentName && (
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            {issue.agentName}
          </span>
        )}
        <span className="text-[11px] text-gray-600">{timeAgo(issue.updatedAt)}</span>
      </div>
    </div>
  )
}

function KanbanColumn({ columnKey, issues, t }: { columnKey: string; issues: KanbanIssue[]; t: (key: string) => string }) {
  const columnColors: Record<string, string> = {
    todo: 'border-gray-500/40',
    in_progress: 'border-cyan-500/40',
    in_review: 'border-purple-500/40',
    done: 'border-green-500/40',
  }
  const dotColors: Record<string, string> = {
    todo: 'bg-gray-500',
    in_progress: 'bg-cyan-500',
    in_review: 'bg-purple-500',
    done: 'bg-green-500',
  }

  return (
    <div className="flex-1 min-w-[220px]">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${columnColors[columnKey]}`}>
        <span className={`w-2 h-2 rounded-full ${dotColors[columnKey]}`} />
        <span className="text-sm font-medium text-gray-300">
          {t(`dashboard.columns.${columnKey}`)}
        </span>
        <span className="text-xs text-gray-600 ml-auto">{issues.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <KanbanCard key={issue.id} issue={issue} t={t} />
        ))}
        {issues.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">{t('dashboard.emptyColumn')}</p>
        )}
      </div>
    </div>
  )
}

function AgentStatusCard({ agent, t }: { agent: AgentStatus; t: (key: string) => string }) {
  const config = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle
  const Icon = config.icon

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
          <Bot className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{agent.name}</p>
          <p className="text-xs text-gray-500 truncate">{agent.title}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${config.color} ${agent.status === 'running' ? 'animate-spin' : ''}`} />
          <span className={`text-xs font-medium ${config.color}`}>
            {t(`dashboard.agentStatus.${agent.status}`)}
          </span>
        </div>
      </div>
      {agent.lastHeartbeatAt && (
        <p className="text-[11px] text-gray-600 mt-2 pl-[52px]">
          {t('dashboard.lastHeartbeat')}: {timeAgo(agent.lastHeartbeatAt)}
        </p>
      )}
    </GlassCard>
  )
}

function ActivityFeed({ items, t }: { items: ActivityItem[]; t: (key: string) => string }) {
  const typeIcons: Record<string, typeof Activity> = {
    status_change: ArrowRight,
    comment: Activity,
    created: CircleDot,
    completed: CheckCircle,
  }
  const typeColors: Record<string, string> = {
    status_change: 'text-cyan-400',
    comment: 'text-gray-400',
    created: 'text-purple-400',
    completed: 'text-green-400',
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = typeIcons[item.type] || Activity
        return (
          <div key={item.id} className="flex gap-3 items-start">
            <div className="mt-0.5">
              <Icon className={`w-4 h-4 ${typeColors[item.type] || 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">
                <span className="font-mono text-xs text-gray-500">{item.issueIdentifier}</span>
                {' '}{item.summary}
              </p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {item.agentName && <span className="text-gray-500">{item.agentName}</span>}
                {item.agentName && ' · '}
                {timeAgo(item.createdAt)}
              </p>
            </div>
          </div>
        )
      })}
      {items.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-6">{t('dashboard.noActivity')}</p>
      )}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────── */

export default function PaperclipDashboardPage({ subdomainUsername }: { subdomainUsername?: string } = {}) {
  const params = useParams<{ username: string }>()
  const username = subdomainUsername || params.username
  const { t } = useTranslation()
  const { walletAddress } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useHead({
    title: `${username} · ${t('dashboard.pageTitle')}`,
    description: t('dashboard.pageDescription'),
  })

  const fetchDashboard = useCallback(async () => {
    try {
      // TODO: Replace with real API call once Paperclip bridge API is available
      // const res = await fetch(`/api/community/users/${username}/paperclip/dashboard`)
      // const json = await res.json()
      // setData(json)
      setData(generateMockData())
      setLastRefresh(new Date())
    } catch {
      // Silently fail — keep stale data visible
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 10000) // refresh every 10s
    return () => clearInterval(interval)
  }, [fetchDashboard])

  const gradientStyle = walletAddress
    ? { background: walletGradient(walletAddress) }
    : { background: 'linear-gradient(135deg, #0e7490, #7c3aed)' }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const totalIssues =
    data.kanban.todo.length +
    data.kanban.in_progress.length +
    data.kanban.in_review.length +
    data.kanban.done.length

  const activeAgents = data.agents.filter((a) => a.status === 'running').length

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="page-enter">
        {/* Banner */}
        <div className="relative h-32 md:h-40" style={gradientStyle}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-4 max-w-7xl mx-auto">
            <div className="flex items-end gap-4">
              <SmartAvatar seed={username || ''} size={56} className="border-2 border-black rounded-xl" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-cyan-400" />
                  {t('dashboard.heading')}
                </h1>
                <p className="text-sm text-gray-400">
                  <Link to={`/u/${username}`} className="hover:text-white transition-colors">
                    @{username}
                  </Link>
                  {' · '}
                  {t('dashboard.subtitle', { count: totalIssues, agents: activeAgents })}
                </p>
              </div>
              <button
                onClick={fetchDashboard}
                className="ml-auto text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title={t('dashboard.refresh')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">
          {/* Kanban Board */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-cyan-400" />
              {t('dashboard.kanbanTitle')}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col}
                  columnKey={col}
                  issues={data.kanban[col]}
                  t={t}
                />
              ))}
            </div>
          </section>

          {/* Agent Status Wall + Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Status */}
            <section className="lg:col-span-1">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                {t('dashboard.agentsTitle')}
              </h2>
              <div className="flex flex-col gap-3">
                {data.agents.map((agent) => (
                  <AgentStatusCard key={agent.id} agent={agent} t={t} />
                ))}
                {data.agents.length === 0 && (
                  <p className="text-sm text-gray-600 text-center py-6">
                    {t('dashboard.noAgents')}
                  </p>
                )}
              </div>
            </section>

            {/* Activity Feed */}
            <section className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                {t('dashboard.activityTitle')}
              </h2>
              <GlassCard className="p-4">
                <ActivityFeed items={data.activity} t={t} />
              </GlassCard>
              <p className="text-[11px] text-gray-700 mt-2 text-right">
                {t('dashboard.lastUpdated')}: {lastRefresh.toLocaleTimeString()}
              </p>
            </section>
          </div>

          {/* Integrations — Telegram Connect (CAN-274) */}
          {data.agents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                {t('dashboard.telegram.title')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.agents.map((agent) => (
                  <TelegramConnectCard key={agent.id} agentName={agent.name} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
