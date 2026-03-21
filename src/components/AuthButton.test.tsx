import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

function renderAuthButton() {
  return render(
    <MemoryRouter>
      <AuthButton />
    </MemoryRouter>,
  )
}

describe('AuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
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

  it('shows orb badge for orb-verified user', () => {
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
    expect(screen.getByText('TestUser')).toBeInTheDocument()
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

  it('shows wallet badge when wallet connected but no World ID', () => {
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
    expect(screen.getByText('test')).toBeInTheDocument() // email prefix
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

  it('opens dropdown on pill click and shows profile + logout', () => {
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
    fireEvent.click(screen.getByText('TestUser'))
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
    fireEvent.click(screen.getByText('TestUser'))
    const profileLink = screen.getByText('Profile').closest('a')
    expect(profileLink).toHaveAttribute('href', '/u/dAAAb')
  })

  it('links to register page when no edit token exists', () => {
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
    fireEvent.click(screen.getByText('TestUser'))
    const profileLink = screen.getByText('Profile').closest('a')
    expect(profileLink).toHaveAttribute('href', '/community/register')
  })

  it('calls logout when logout button clicked', () => {
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
    fireEvent.click(screen.getByText('TestUser'))
    fireEvent.click(screen.getByText('Logout'))
    expect(mockLogout).toHaveBeenCalledOnce()
  })
})
