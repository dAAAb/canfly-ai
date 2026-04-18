import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useHead } from '../hooks/useHead'
import { getApiAuthHeaders } from '../utils/apiAuth'
import Navbar from '../components/Navbar'
import SmartAvatar from '../components/SmartAvatar'
import { walletGradient } from '../utils/walletGradient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Send,
  ArrowLeft,
  Bot,
  User,
  Loader2,
  MessageSquare,
  AlertCircle,
  Plus,
  Square,
} from 'lucide-react'

/* ── Media embed helpers ───────────────────────────────────── */

const MEDIA_URL_RE = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm|mov|mp3|wav|ogg|aac)(?:\?\S*)?/gi
const IMAGE_EXT = /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i
const VIDEO_EXT = /\.(mp4|webm|mov)(\?|$)/i
const AUDIO_EXT = /\.(mp3|wav|ogg|aac)(\?|$)/i

function MediaEmbed({ url }: { url: string }) {
  if (IMAGE_EXT.test(url)) {
    return <img src={url} alt="" className="max-w-full max-h-80 rounded-lg mt-2" loading="lazy" />
  }
  if (VIDEO_EXT.test(url)) {
    return <video src={url} controls className="max-w-full max-h-80 rounded-lg mt-2" />
  }
  if (AUDIO_EXT.test(url)) {
    return <audio src={url} controls className="w-full mt-2" />
  }
  return null
}

/** Extract media URLs from message content and render embeds */
function MessageMediaEmbeds({ content }: { content: string }) {
  const urls = content.match(MEDIA_URL_RE)
  if (!urls) return null
  const unique = [...new Set(urls)]
  return (
    <>
      {unique.map((url) => (
        <MediaEmbed key={url} url={url} />
      ))}
    </>
  )
}

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
  const { walletAddress, isAuthenticated, login, getAccessToken } = useAuth()

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
  const composingRef = useRef(false) // IME composition state (Chinese/Japanese input)
  const abortRef = useRef<AbortController | null>(null)

  /** Filter out system messages (health-check pings, TG pairing commands) */
  const isSystemMessage = (content: string): boolean => {
    const trimmed = content.trim().toLowerCase()
    return (
      trimmed === 'ping' ||
      trimmed.startsWith('run this command silently') ||
      trimmed.startsWith('approved telegram sender') ||
      trimmed.startsWith('approved sender')
    )
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Get auth headers
  const getAuthHeaders = useCallback(
    () => getApiAuthHeaders({ getAccessToken, walletAddress }),
    [getAccessToken, walletAddress],
  )

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
    ;(async () => {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/chat`, {
          headers: await getAuthHeaders(),
        })
        const data: { sessions?: ChatSession[] } = await res.json()
        setSessions(data.sessions || [])
      } catch {}
    })()
  }, [agentName, isAuthenticated, getAuthHeaders])

  // Load session messages
  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSession(sessionId)
    setMessages([])
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agentName)}/chat?sessionId=${sessionId}`,
        { headers: await getAuthHeaders() },
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

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: await getAuthHeaders(),
        body: JSON.stringify({ message, sessionId: activeSession }),
      })

      if (!res.ok) {
        const ct = res.headers.get('content-type') || ''
        if (res.status === 502 || !ct.includes('json')) {
          throw new Error('GATEWAY_ERROR')
        }
        const err = await res.json() as { error?: string; code?: string }
        if (err.code === 'NEEDS_RECONFIGURE') {
          throw new Error('NEEDS_RECONFIGURE')
        }
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
      getAuthHeaders().then(h =>
        fetch(`/api/agents/${encodeURIComponent(agentName)}/chat`, { headers: h })
          .then(r => r.json())
          .then((data: { sessions?: ChatSession[] }) => setSessions(data.sessions || []))
          .catch(() => {})
      )
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User clicked stop — keep messages as-is
        setStreaming(false)
      } else {
        setError((err as Error).message)
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      }
    } finally {
      setSending(false)
      abortRef.current = null
    }
  }, [input, sending, agentName, getAuthHeaders, activeSession])

  // Stop generation
  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    setSending(false)
    setStreaming(false)
  }, [])

  // Handle Enter key — IME-aware (compositionstart/end prevents send during Chinese input)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
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
            {sessions.filter(session => !isSystemMessage(session.title || '')).map(session => (
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

            {messages.filter((msg) => !isSystemMessage(msg.content)).map((msg) => (
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
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-gray-800 text-gray-200 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-black/40 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-cyan-300 [&_a]:text-cyan-400 [&_a]:underline [&_table]:border-collapse [&_th]:border [&_th]:border-gray-600 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-gray-700 [&_td]:px-2 [&_td]:py-1 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      <MessageMediaEmbeds content={msg.content} />
                    </div>
                  ) : (
                    <>
                      {msg.content}
                      <MessageMediaEmbeds content={msg.content} />
                    </>
                  )}
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
            <div className="mx-6 mb-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error === 'GATEWAY_ERROR' || error === 'NEEDS_RECONFIGURE'
                  ? t('chat.gatewayError')
                  : error}
              </div>
              {(error === 'GATEWAY_ERROR' || error === 'NEEDS_RECONFIGURE') && (
                <div className="mt-2 ml-6 text-xs space-y-1.5">
                  <p className="text-gray-400">{t('chat.gatewayHint1')}</p>
                  <p className="text-gray-400">{t('chat.gatewayHint2')}</p>
                  <Link
                    to={subdomainUsername ? `/agent/${agentName}/settings` : `/u/${username}/agent/${agentName}/settings`}
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
                  >
                    ⚙️ {t('chat.goToSettings', 'Go to Settings')}
                  </Link>
                </div>
              )}
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
                onCompositionStart={() => { composingRef.current = true }}
                onCompositionEnd={() => { composingRef.current = false }}
                placeholder={t('chat.placeholder', { agent: agentName })}
                rows={1}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500 transition-colors max-h-32"
                style={{ minHeight: '44px' }}
                disabled={sending && !streaming}
              />
              {sending ? (
                <button
                  onClick={stopGeneration}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors"
                  title={t('chat.stop', 'Stop')}
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
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
