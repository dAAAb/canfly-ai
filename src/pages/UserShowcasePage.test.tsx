import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock useQueryLang
vi.mock('../hooks/useLanguage', () => ({
  useQueryLang: () => ({ currentLang: 'en', switchLang: vi.fn() }),
}))

// Mock heavy components
vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))
vi.mock('../components/SmartAvatar', () => ({
  default: (props: { name: string }) => <div data-testid="avatar">{props.name}</div>,
}))
vi.mock('../components/PillBadge', () => ({
  default: (props: { name: string }) => <span data-testid="pill-badge">{props.name}</span>,
}))
vi.mock('../components/TrustBadge', () => ({
  default: () => <span data-testid="trust-badge" />,
}))
vi.mock('../components/ClaimProfileButton', () => ({
  default: () => <button data-testid="claim-btn">Claim</button>,
}))
vi.mock('../utils/trustLevel', () => ({
  getTrustLevel: () => 'basic',
}))
vi.mock('../utils/walletGradient', () => ({
  walletGradient: () => 'linear-gradient(135deg, #000, #111)',
}))

import UserShowcasePage from './UserShowcasePage'

const MOCK_USER = {
  username: 'testuser',
  display_name: 'Test User',
  wallet_address: '0xABC123def456',
  avatar_url: null,
  bio: 'Hello world',
  links: {},
  isPublic: true,
  claimed: 1,
  verification_level: 'none',
  created_at: '2026-01-01T00:00:00.000Z',
  agents: [],
  hardware: [],
  ownerInviteCode: null,
}

function renderShowcasePage(username = 'testuser') {
  return render(
    <MemoryRouter initialEntries={[`/u/${username}`]}>
      <Routes>
        <Route path="/u/:username" element={<UserShowcasePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UserShowcasePage wallet-based canEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows Edit button when wallet matches profile owner (case-insensitive)', async () => {
    mockUseAuth.mockReturnValue({
      walletAddress: '0xabc123DEF456', // different case than user's 0xABC123def456
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      worldIdLevel: null,
      user: null,
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('/api/community/users/testuser/pending-agents')) {
        return new Response(JSON.stringify({ pendingAgents: [] }), { status: 200 })
      }
      if (urlStr.includes('/api/community/users/testuser')) {
        return new Response(JSON.stringify(MOCK_USER), { status: 200 })
      }
      return new Response('Not found', { status: 404 })
    })

    renderShowcasePage()

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('shows Edit button when localStorage edit token exists', async () => {
    mockUseAuth.mockReturnValue({
      walletAddress: null, // no wallet connected
      isAuthenticated: false,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      worldIdLevel: null,
      user: null,
    })

    localStorage.setItem('canfly_edit_token_testuser', 'tok_abc')

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('/api/community/users/testuser/pending-agents')) {
        return new Response(JSON.stringify({ pendingAgents: [] }), { status: 200 })
      }
      if (urlStr.includes('/api/community/users/testuser')) {
        return new Response(JSON.stringify(MOCK_USER), { status: 200 })
      }
      return new Response('Not found', { status: 404 })
    })

    renderShowcasePage()

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('does NOT show Edit button when wallet does not match and no edit token', async () => {
    mockUseAuth.mockReturnValue({
      walletAddress: '0xDIFFERENT999',
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      worldIdLevel: null,
      user: null,
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('/pending-agents')) {
        return new Response(JSON.stringify({ pendingAgents: [] }), { status: 200 })
      }
      if (urlStr.includes('/api/community/users/testuser')) {
        return new Response(JSON.stringify(MOCK_USER), { status: 200 })
      }
      return new Response('Not found', { status: 404 })
    })

    renderShowcasePage()

    await waitFor(() => {
      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('does NOT show Edit button when user has no wallet_address set', async () => {
    const userNoWallet = { ...MOCK_USER, wallet_address: null }
    mockUseAuth.mockReturnValue({
      walletAddress: '0xABC123def456',
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      worldIdLevel: null,
      user: null,
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('/pending-agents')) {
        return new Response(JSON.stringify({ pendingAgents: [] }), { status: 200 })
      }
      if (urlStr.includes('/api/community/users/testuser')) {
        return new Response(JSON.stringify(userNoWallet), { status: 200 })
      }
      return new Response('Not found', { status: 404 })
    })

    renderShowcasePage()

    await waitFor(() => {
      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('shows 404 page when user not found', async () => {
    mockUseAuth.mockReturnValue({
      walletAddress: null,
      isAuthenticated: false,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      worldIdLevel: null,
      user: null,
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not found', { status: 404 }),
    )

    renderShowcasePage('nonexistent')

    await waitFor(() => {
      expect(screen.getByText('User Not Found')).toBeInTheDocument()
    })
  })
})
