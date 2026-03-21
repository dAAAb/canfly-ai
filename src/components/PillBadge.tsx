import { Link } from 'react-router-dom'
import { walletGradient } from '../utils/walletGradient'

type BadgeType = 'user' | 'openclaw-agent' | 'agent'

interface PillBadgeProps {
  name: string
  walletAddress?: string | null
  type: BadgeType
  href: string
  size?: 'sm' | 'md'
  highlightText?: string
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

function renderHighlighted(text: string, query?: string) {
  if (!query) return text
  const q = query.toLowerCase()
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-purple-300/40 text-white rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function PillBadge({
  name,
  walletAddress,
  type,
  href,
  size = 'md',
  highlightText,
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
      <span>{renderHighlighted(name, highlightText)}</span>
    </Link>
  )
}
