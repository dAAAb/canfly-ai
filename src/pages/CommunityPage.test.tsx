import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock heavy dependencies
vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

vi.mock('../components/PillBadge', () => ({
  default: ({ name }: { name: string }) => <span data-testid={`pill-${name}`}>{name}</span>,
}))

vi.mock('../components/TrustBadge', () => ({
  default: ({ level }: { level: string }) => <span data-testid={`trust-${level}`}>{level}</span>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({ localePath: (p: string) => p, currentLang: 'en' }),
}))

vi.mock('../hooks/useHead', () => ({
  useHead: () => {},
}))

vi.mock('lucide-react', () => ({
  Search: () => <span />,
  Users: () => <span />,
  Bot: () => <span />,
  Wrench: () => <span />,
  Star: () => <span />,
  Flame: () => <span />,
  ArrowUpDown: () => <span />,
  Shield: () => <span />,
  Wallet: () => <span />,
  X: () => <span />,
}))

import CommunityPage from './CommunityPage'

const mockUsers = [
  {
    username: 'alice',
    display_name: 'Alice',
    wallet_address: '0xAAA',
    avatar_url: null,
    bio: 'AI researcher',
    links: {},
    claimed: 1,
    claimed_at: '2026-03-01T00:00:00Z',
    verification_level: 'orb',
    agent_count: 3,
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    username: 'bob',
    display_name: 'Bob',
    wallet_address: '0xBBB',
    avatar_url: null,
    bio: null,
    links: {},
    claimed: 1,
    claimed_at: '2026-03-10T00:00:00Z',
    verification_level: null,
    agent_count: 0,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    username: 'charlie',
    display_name: 'Charlie',
    wallet_address: null,
    avatar_url: null,
    bio: 'Blockchain dev',
    links: {},
    claimed: 0,
    claimed_at: null,
    verification_level: null,
    agent_count: 0,
    created_at: '2026-03-15T00:00:00Z',
  },
]

const mockAgents = [
  {
    name: 'AliceBot',
    owner_username: 'alice',
    wallet_address: '0xAAA',
    platform: 'openclaw',
    bio: 'A helpful bot',
    model: 'gpt-4',
    created_at: '2026-03-01T00:00:00Z',
    agentbook_registered: 1,
  },
  {
    name: 'BobHelper',
    owner_username: 'bob',
    wallet_address: '0xBBB',
    platform: 'other',
    bio: null,
    model: null,
    created_at: '2026-03-05T00:00:00Z',
  },
]

function setupFetchMock() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    if (urlStr.includes('/api/community/users')) {
      return new Response(JSON.stringify({ users: mockUsers }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (urlStr.includes('/api/community/agents')) {
      return new Response(JSON.stringify({ agents: mockAgents }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('{}', { status: 404 })
  })
}

function renderCommunityPage() {
  return render(
    <MemoryRouter>
      <CommunityPage />
    </MemoryRouter>,
  )
}

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('renders loading spinner initially', () => {
    setupFetchMock()
    renderCommunityPage()
    // The spinner should be visible before data loads
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('fetches and displays users and agents', async () => {
    setupFetchMock()
    renderCommunityPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('pill-alice').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByTestId('pill-bob').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('pill-AliceBot').length).toBeGreaterThan(0)
  })

  it('shows correct stats counts', async () => {
    setupFetchMock()
    renderCommunityPage()

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // 2 agents
      expect(screen.getByText('3')).toBeInTheDocument() // 3 users
    })
  })

  it('filters users by search query', async () => {
    setupFetchMock()
    renderCommunityPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('pill-alice').length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText('community.search')
    fireEvent.change(searchInput, { target: { value: 'alice' } })

    // Wait for debounce — alice should still be visible
    await waitFor(() => {
      expect(screen.getAllByTestId('pill-alice').length).toBeGreaterThan(0)
    })
  })

  it('searches users by bio text', async () => {
    setupFetchMock()
    renderCommunityPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('pill-alice').length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText('community.search')
    fireEvent.change(searchInput, { target: { value: 'blockchain' } })

    // Charlie has 'Blockchain dev' in bio
    await waitFor(() => {
      expect(screen.getAllByTestId('pill-charlie').length).toBeGreaterThan(0)
    })
  })

  it('displays trust badges with correct levels', async () => {
    setupFetchMock()
    renderCommunityPage()

    await waitFor(() => {
      // Alice has orb verification
      expect(screen.getAllByTestId('trust-orb').length).toBeGreaterThan(0)
    })
  })

  it('handles API error gracefully — shows empty state', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    renderCommunityPage()

    await waitFor(() => {
      // Should not crash, loading should finish
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    })
  })

  it('renders featured section for verified claimed users', async () => {
    setupFetchMock()
    renderCommunityPage()

    await waitFor(() => {
      // Alice is claimed + orb verified → should appear in sections
      expect(screen.getAllByTestId('pill-alice').length).toBeGreaterThan(0)
    })

    // Charlie is unclaimed → should be in discoveries
    expect(screen.getAllByTestId('pill-charlie').length).toBeGreaterThan(0)
  })
})
