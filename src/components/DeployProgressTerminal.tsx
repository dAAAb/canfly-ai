/**
 * Terminal-style progress display for the Pinata wizard's Step 5.
 *
 * Reveals scripted lines on a fixed timeline that approximates the actual
 * server-side work order. Not connected to live backend events (we explicitly
 * avoid polling — Cloudflare Pages charges per request and the steps are
 * deterministic enough that timed reveal feels honest). When the parent
 * gets the real fetch result, it flips `state` to `success` or `error` and
 * the final line reflects the outcome.
 */
import { useEffect, useState } from 'react'

interface Step {
  /** Seconds since "creating" started */
  at: number
  /** Line text. Use {{...}} for emphasis */
  text: string
}

const STEPS: Step[] = [
  { at: 0.0, text: '正在驗證 Pinata 帳號…' },
  { at: 1.2, text: '為你建立 OpenRouter 免費 key（限 free model）' },
  { at: 2.5, text: '把 OPENROUTER_API_KEY 推進你的 Pinata Secrets Vault' },
  { at: 4.0, text: '建立 Pinata 蝦…' },
  { at: 6.0, text: '把 secret 掛到新蝦上' },
  { at: 7.5, text: '寫入 CanFly 部署紀錄' },
  { at: 9.0, text: '✓ 蝦已上線！背景中設定預設模型…' },
]

type DeployState = 'idle' | 'running' | 'success' | 'error'

interface Props {
  state: DeployState
  /** Used when state === 'error' */
  errorMessage?: string | null
  /** Final agent name shown on success */
  agentName?: string | null
}

export default function DeployProgressTerminal({ state, errorMessage, agentName }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (state !== 'running') return
    const start = Date.now()
    const t = setInterval(() => {
      setElapsed((Date.now() - start) / 1000)
    }, 100)
    return () => clearInterval(t)
  }, [state])

  if (state === 'idle') return null

  // Lines that should be visible by current elapsed time
  const visible = STEPS.filter((s) => elapsed >= s.at)
  const activeIdx = visible.length - 1

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden bg-black/60 font-mono text-xs">
      {/* macOS-style header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/80 border-b border-gray-800">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-[11px] text-gray-500">canfly@deploy ~ {agentName ?? 'creating-lobster'}</span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-1.5 min-h-[180px]">
        {visible.map((step, i) => {
          const isActive = i === activeIdx && state === 'running'
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.at} className="flex items-start gap-2">
              <span className="text-cyan-500 select-none">$</span>
              <span className={`${isActive ? 'text-cyan-200' : 'text-gray-300'} flex-1`}>
                {step.text}
                {isActive && state === 'running' && !isLast && (
                  <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 align-middle animate-pulse" />
                )}
              </span>
            </div>
          )
        })}

        {state === 'success' && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-800">
            <span className="text-green-500">✓</span>
            <span className="text-green-300">
              完成！正在帶你進蝦的設定頁…
            </span>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-red-900/50">
            <span className="text-red-500 select-none">✗</span>
            <span className="text-red-300 break-all">
              {errorMessage || '部署失敗'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
