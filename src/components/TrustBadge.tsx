import { useState } from 'react'
import type { TrustLevel } from '../utils/trustLevel'

interface TrustBadgeProps {
  level: TrustLevel
  size?: 'sm' | 'md'
}

const BADGE_CONFIG: Record<
  TrustLevel,
  { emoji: string; label: string; tooltip: string; classes: string }
> = {
  orb: {
    emoji: '👁️',
    label: 'Orb Verified',
    tooltip: 'Orb Verified Human',
    classes: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40',
  },
  world: {
    emoji: '🌍',
    label: 'World Verified',
    tooltip: 'World ID Verified',
    classes: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
  },
  wallet: {
    emoji: '🦊',
    label: 'Wallet User',
    tooltip: 'Wallet Connected',
    classes: 'bg-orange-600/20 text-orange-400 border-orange-600/40',
  },
  unverified: {
    emoji: '👤',
    label: 'User',
    tooltip: 'Unverified User',
    classes: 'bg-gray-600/20 text-gray-400 border-gray-600/40',
  },
  'openclaw-agent': {
    emoji: '🦞',
    label: 'OpenClaw',
    tooltip: 'OpenClaw AI Agent',
    classes: 'bg-red-600/20 text-red-400 border-red-600/40',
  },
  agent: {
    emoji: '🤖',
    label: 'Agent',
    tooltip: 'AI Agent',
    classes: 'bg-purple-600/20 text-purple-400 border-purple-600/40',
  },
  agentbook: {
    emoji: '📖',
    label: 'AgentBook',
    tooltip: 'AgentBook Verified (Human-backed)',
    classes: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
  },
}

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
}

export default function TrustBadge({ level, size = 'md' }: TrustBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const config = BADGE_CONFIG[level]

  return (
    <span
      className={`relative inline-flex items-center rounded-full border font-medium ${config.classes} ${SIZE_CLASSES[size]}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap pointer-events-none z-10">
          {config.tooltip}
        </span>
      )}
    </span>
  )
}
