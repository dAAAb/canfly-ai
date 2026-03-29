import { useState, useEffect } from 'react'

/** Poll Zeabur live status for a deployment */
export function useLiveStatus(deploymentId: string | null, canflyStatus: string) {
  const [zeaburStatus, setZeaburStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!deploymentId) return
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch(`/api/zeabur/deploy/${deploymentId}/live-status`)
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { zeaburStatus?: string | null }
          setZeaburStatus(data.zeaburStatus || null)
        }
      } catch { /* ignore */ }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [deploymentId])

  const liveStatus = zeaburStatus || canflyStatus.toUpperCase()
  const isOnline = liveStatus === 'RUNNING'
  return { liveStatus, isOnline }
}

export const STATUS_CONFIG: Record<string, { color: string; labelKey: string; fallback: string }> = {
  RUNNING: { color: 'text-green-400 bg-green-400/10 border-green-600/40', labelKey: 'deployStatus.online', fallback: 'Online' },
  QUEUED: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-600/40', labelKey: 'deployStatus.queued', fallback: 'Queued' },
  DEPLOYING: { color: 'text-blue-400 bg-blue-400/10 border-blue-600/40', labelKey: 'deployStatus.deploying', fallback: 'Deploying' },
  STOPPED: { color: 'text-gray-400 bg-gray-400/10 border-gray-600/40', labelKey: 'deployStatus.offline', fallback: 'Offline' },
  ERROR: { color: 'text-red-400 bg-red-400/10 border-red-600/40', labelKey: 'deployStatus.failed', fallback: 'Failed' },
  FAILED: { color: 'text-red-400 bg-red-400/10 border-red-600/40', labelKey: 'deployStatus.failed', fallback: 'Failed' },
  PENDING: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-600/40', labelKey: 'deployStatus.pending', fallback: 'Pending' },
}
