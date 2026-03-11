import { Link } from 'react-router-dom'
import { walletGradient } from '../utils/walletGradient'

type BadgeType = 'user' | 'openclaw-agent' | 'agent'

interface PillBadgeProps {
  name: string
  walletAddress?: string | null
  type: BadgeType
  href: string
  size?: 'sm' | 'md'
}

const EMOJI: Record<BadgeType, string> = {
  user: '👤',
  'openclaw-agent': '🦞',
  agent: '🤖',
}

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'px-3 py-1 text-sm gap-1.5',
  md: 'px-4 py-1.5 text-base gap-2',
}

export default function PillBadge({
  name,
  walletAddress,
  type,
  href,
  size = 'md',
}: PillBadgeProps) {
  return (
    <Link
      to={href}
      className={`inline-flex items-center rounded-full text-white font-medium
        transition-all duration-200 hover:brightness-125 hover:scale-105
        ${SIZE_CLASSES[size]}`}
      style={{ background: walletGradient(walletAddress) }}
    >
      <span>{EMOJI[type]}</span>
      <span>{type === 'user' ? `@${name}` : name}</span>
    </Link>
  )
}
