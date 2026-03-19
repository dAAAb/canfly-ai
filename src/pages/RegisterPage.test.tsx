import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock heavy components
vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

import RegisterPage from './RegisterPage'

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

describe('RegisterPage wallet→username lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('redirects to /u/:username when wallet is already registered', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      walletAddress: '0xABC123',
      worldIdLevel: null,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ username: 'dAAAb', walletAddress: '0xABC123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderRegisterPage()

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/community/lookup-wallet?address=0xABC123',
      )
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/u/dAAAb', { replace: true })
    })
  })

  it('shows registration form when wallet has no existing profile', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      walletAddress: '0xNEW999',
      worldIdLevel: null,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'No user found' }), { status: 404 }),
    )

    renderRegisterPage()

    await waitFor(() => {
      expect(screen.getByText('Create Your Profile')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows login CTA when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      ready: true,
      walletAddress: null,
      worldIdLevel: null,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
    })

    renderRegisterPage()

    expect(screen.getByText('Sign In to Register')).toBeInTheDocument()
  })

  it('does not call lookup-wallet when walletAddress is null', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      walletAddress: null,
      worldIdLevel: null,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    renderRegisterPage()

    // Wait a tick to ensure useEffect has run
    await waitFor(() => {
      expect(screen.getByText('Create Your Profile')).toBeInTheDocument()
    })

    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('lookup-wallet'),
    )
  })

  it('still shows registration form when lookup-wallet fetch fails', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      walletAddress: '0xFAIL',
      worldIdLevel: null,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
    })

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    renderRegisterPage()

    await waitFor(() => {
      expect(screen.getByText('Create Your Profile')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
