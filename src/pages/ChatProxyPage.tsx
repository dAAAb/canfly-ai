import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useHead } from '../hooks/useHead'
import Navbar from '../components/Navbar'
import SmartAvatar from '../components/SmartAvatar'
import { walletGradient } from '../utils/walletGradient'
import {
  Send,
  ArrowLeft,
  Bot,
  User,
  Loader2,
  MessageSquare,
  AlertCircle,
  Plus,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────────────── */

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface ChatSession {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

interface AgentInfo {
  name: string
  bio: string | null
  avatar_url: string | null
  wallet_address: string | null
  model: string | null
  heartbeat_status: string | null
}

interface ChatProxyPageProps {
  subdomainUsername?: string
}

export default function ChatProxyPage({ subdomainUsername }: ChatProxyPageProps) {
  const { username: paramUsername, agentName: paramAgentName } = useParams<{ username: string; agentName: string }>()
  const username = subdomainUsername || paramUsername || ''
  const agentName = paramAgentName || ''
  const { t } = useTranslation()
  const { walletAddress, isAuthenticated, login } = useAuth()

  useHead({ title: `${t('chat.title')} — ${agentName}` })

  const [agent, setAgent] = useState<AgentInfo | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Get auth headers
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (walletAddress) headers['X-Wallet-Address'] = walletAddress
    const editToken = localStorage.getItem(`canfly_edit_token_${username}`)
    if (editToken) headers['X-Edit-Token'] = editToken
    return headers
  }, [walletAddress, username])

  // Fetch agent info
  useEffect(() => {
    if (!agentName) return
    fetch(`/api/community/agents/${encodeURIComponent(agentName)}`)
      .then(r => r.json())
      .then((data: AgentInfo) => {
        setAgent(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentName])

  // Fetch chat sessions
  useEffect(() => {
    if (!agentName || !isAuthenticated) return
    fetch(`/api/agents/${encodeURIComponent(agentName)}/chat`, {
      headers: getAuthHeaders(),
    })
      .then(r => r.json())
      .then((data: { sessions?: ChatSession[] }) => {
        setSessions(data.sessions || [])
      })
      .catch(() => {})
  }, [agentName, isAuthenticated, getAuthHeaders])

  // Load session messages
  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSession(sessionId)
    setMessages([])
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agentName)}/chat?sessionId=${sessionId}`,
        { headers: getAuthHeaders() },
      )
      const data = await res.json() as { messages?: ChatMessage[] }
      setMessages(data.messages || [])
    } catch {
      setError(t('chat.loadError'))
    }
  }, [agentName, getAuthHeaders, t])

  // Start new session
  const startNewSession = useCallback(() => {
    setActiveSession(null)
    setMessages([])
    setInput('')
    setError(null)
  }, [])

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return
    const message = input.trim()
    setInput('')
    setError(null)

    // Optimistic add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])
    setSending(true)

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, sessionId: activeSession }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error || `Error ${res.status}`)
      }

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') && res.body) {
        // Streaming response
        setStreaming(true)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assistantContent = ''
        let sessionIdReceived = false

        const tempAssistantMsg: ChatMessage = {
          id: `temp-assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, tempAssistantMsg])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })

          // Parse SSE events
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue

            // First event might be session ID
            if (!sessionIdReceived) {
              try {
                const parsed = JSON.parse(data)
                if (parsed.sessionId) {
                  setActiveSession(parsed.sessionId)
                  sessionIdReceived = true
                  continue
                }
              } catch { /* not JSON, treat as content */ }
            }

            assistantContent += data
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: assistantContent }
              }
              return updated
            })
          }
        }

        setStreaming(false)
      } else {
        // JSON response
        const data = await res.json() as { sessionId?: string; content?: string }
        if (data.sessionId) setActiveSession(data.sessionId)

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || '',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])
      }

      // Refresh sessions list
      fetch(`/api/agents/${encodeURIComponent(agentName)}/chat`, {
        headers: getAuthHeaders(),
      })
        .then(r => r.json())
        .then((data: { sessions?: ChatSession[] }) => setSessions(data.sessions || []))
        .catch(() => {})
    } catch (err) {
      setError((err as Error).message)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
    } finally {
      setSending(false)
    }
  }, [input, sending, agentName, getAuthHeaders, activeSession])

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">{t('chat.loginRequired')}</h1>
          <p className="text-gray-400 mb-8">{t('chat.loginDescription')}</p>
          <button
            onClick={login}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            {t('chat.loginButton')}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full overflow-hidden">
        {/* Sidebar — Session List */}
        <div className="w-64 border-r border-gray-800 flex flex-col hidden md:flex">
          <div className="p-4 border-b border-gray-800">
            <Link
              to={`/u/${username}/agent/${agentName}`}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('chat.backToAgent')}
            </Link>
            <button
              onClick={startNewSession}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('chat.newChat')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                  activeSession === session.id
                    ? 'bg-white/15 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                {session.title || t('chat.untitled')}
              </button>
            ))}
            {sessions.length === 0 && (
              <p className="text-gray-600 text-sm px-3 py-4 text-center">
                {t('chat.noSessions')}
              </p>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800">
            {agent?.avatar_url ? (
              <img src={agent.avatar_url} alt={agentName} className="w-8 h-8 rounded-full" />
            ) : agent?.wallet_address ? (
              <SmartAvatar address={agent.wallet_address} size={32} />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: walletGradient(agentName) }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-white font-medium text-sm truncate">{agentName}</h2>
              {agent?.model && (
                <p className="text-gray-500 text-xs truncate">{agent.model}</p>
              )}
            </div>
            {agent?.heartbeat_status === 'live' && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {t('chat.online')}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: walletGradient(agentName) }}
                >
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  {t('chat.startConversation', { agent: agentName })}
                </h3>
                <p className="text-gray-500 text-sm max-w-md">
                  {agent?.bio || t('chat.defaultBio', { agent: agentName })}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-800 mt-1">
                    <Bot className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-800 text-gray-200 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                  {streaming && msg === messages[messages.length - 1] && msg.role === 'assistant' && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-blue-600 mt-1">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {sending && messages[messages.length - 1]?.role === 'user' && !streaming && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-800">
                  <Bot className="w-4 h-4 text-gray-400" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-6 mb-2 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Input Area */}
          <div className="px-6 py-4 border-t border-gray-800">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder', { agent: agentName })}
                rows={1}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500 transition-colors max-h-32"
                style={{ minHeight: '44px' }}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2 text-center">
              {t('chat.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
