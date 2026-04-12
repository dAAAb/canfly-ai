import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

// Mock walletGradient
vi.mock('../utils/walletGradient', () => ({
  walletGradient: () => 'linear-gradient(135deg, #333, #666)',
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LogOut: () => <span data-testid="logout-icon" />,
  User: () => <span data-testid="user-icon" />,
}))

import AuthButton from './AuthButton'

/** Render the button on a path where the auto-redirect guard is a no-op.
 *  (The auto-redirect to /community/register is exercised in e2e, not here.) */
function renderAuthButton() {
  return render(
    <MemoryRouter initialEntries={['/community/register']}>
      <AuthButton />
    </MemoryRouter>,
  )
}

describe('AuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    try { sessionStorage.clear() } catch { /* ignore */ }

    // Default: lookup returns 404 (no existing profile). Individual tests
    // can override with their own mockResolvedValueOnce if needed.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'No user found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when not ready', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      ready: false,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
      worldIdLevel: null,
      walletAddress: null,
    })

    const { container } = renderAuthButton()
    expect(container.innerHTML).toBe('')
  })

  it('shows login button when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
      worldIdLevel: null,
      walletAddress: null,
    })

    renderAuthButton()
    expect(screen.getByText('Join Flight Community')).toBeInTheDocument()
  })

  it('calls login when login button clicked', () => {
    const mockLogin = vi.fn()
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      ready: true,
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      worldIdLevel: null,
      walletAddress: null,
    })

    renderAuthButton()
    fireEvent.click(screen.getByText('Join Flight Community'))
    expect(mockLogin).toHaveBeenCalledOnce()
  })

  it('shows orb badge for orb-verified user', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { google: { name: 'TestUser' } },
      worldIdLevel: 'orb',
      walletAddress: '0x123',
    })

    renderAuthButton()
    expect(screen.getByText('👁️')).toBeInTheDocument()
    // Wait for lookup-wallet to resolve (404) before display name appears
    await waitFor(() => expect(screen.getByText('TestUser')).toBeInTheDocument())
  })

  it('shows device badge for device-verified user', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { google: { name: 'DeviceUser' } },
      worldIdLevel: 'device',
      walletAddress: '0x456',
    })

    renderAuthButton()
    expect(screen.getByText('🌍')).toBeInTheDocument()
  })

  it('shows wallet badge when wallet connected but no World ID', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { email: { address: 'test@example.com' } },
      worldIdLevel: null,
      walletAddress: '0x789',
    })

    renderAuthButton()
    expect(screen.getByText('🦊')).toBeInTheDocument()
    // Wait for lookup to settle before display name appears (email prefix)
    await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument())
  })

  it('shows generic badge when no wallet and no World ID', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: {},
      worldIdLevel: null,
      walletAddress: null,
    })

    renderAuthButton()
    expect(screen.getByText('👤')).toBeInTheDocument()
  })

  it('opens dropdown on pill click and shows profile + logout', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { google: { name: 'TestUser' } },
      worldIdLevel: null,
      walletAddress: '0x123',
    })

    renderAuthButton()
    const pill = await screen.findByText('TestUser')
    fireEvent.click(pill)
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('links to profile page when user has edit token in localStorage', () => {
    localStorage.setItem('canfly_edit_token_dAAAb', 'tok123')

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { google: { name: 'TestUser' } },
      worldIdLevel: null,
      walletAddress: '0x123',
    })

    renderAuthButton()
    // With localStorage token set, displayName resolves to 'dAAAb' (from token key)
    fireEvent.click(screen.getByText('dAAAb'))
    const profileLink = screen.getByText('Profile').closest('a')
    expect(profileLink).toHaveAttribute('href', '/u/dAAAb')
  })

  it('links to register page when no edit token exists', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { google: { name: 'TestUser' } },
      worldIdLevel: null,
      walletAddress: '0x123',
    })

    renderAuthButton()
    const pill = await screen.findByText('TestUser')
    fireEvent.click(pill)
    const profileLink = screen.getByText('Profile').closest('a')
    expect(profileLink).toHaveAttribute('href', '/community/register')
  })

  it('calls logout when logout button clicked', async () => {
    const mockLogout = vi.fn()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: mockLogout,
      user: { google: { name: 'TestUser' } },
      worldIdLevel: null,
      walletAddress: '0x123',
    })

    renderAuthButton()
    const pill = await screen.findByText('TestUser')
    fireEvent.click(pill)
    fireEvent.click(screen.getByText('Logout'))
    expect(mockLogout).toHaveBeenCalledOnce()
  })

  it('auto-redirects new authenticated users without a profile to /community/register', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { google: { name: 'NewUser', email: 'new@example.com' }, id: 'did:privy:new' },
      worldIdLevel: null,
      walletAddress: '0xNEW',
    })

    // Render on a neutral path (home) — auto-redirect should fire
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthButton />
      </MemoryRouter>,
    )

    // Wait for the lookup effect to run (will 404 per beforeEach default)
    // Then the sessionStorage flag should be set to mark we redirected
    await waitFor(() => {
      expect(sessionStorage.getItem('canfly_register_autoredirect_done')).toBe('1')
    })
  })

  it('does NOT auto-redirect when already on /community/register', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { google: { name: 'NewUser', email: 'new@example.com' } },
      worldIdLevel: null,
      walletAddress: '0xNEW',
    })

    render(
      <MemoryRouter initialEntries={['/community/register']}>
        <AuthButton />
      </MemoryRouter>,
    )

    // Give effects time to run
    await new Promise((resolve) => setTimeout(resolve, 50))
    // Flag should NOT be set — we're already on register so no redirect needed
    expect(sessionStorage.getItem('canfly_register_autoredirect_done')).toBeNull()
  })
})
