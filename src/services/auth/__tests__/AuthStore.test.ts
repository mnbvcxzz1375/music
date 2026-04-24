import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore, getAccessToken, isAuthenticated, hasPermission } from '../AuthStore'
import type { Permission, User, UserSettings } from '../types'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    })
    mockFetch.mockReset()
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', nickname: 'Test User', subscription: 'free' } as unknown as User,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { login } = useAuthStore.getState()
      await login({ email: 'test@example.com', password: 'password123' })

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockResponse.user)
      expect(state.accessToken).toBe('mock-access-token')
      expect(state.isAuthenticated).toBe(true)
      expect(state.loading).toBe(false)
      expect(state.error).toBe(null)
    })

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      })

      const { login } = useAuthStore.getState()
      await expect(login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe('Invalid credentials')
    })

    it('should set loading state during login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free' },
          accessToken: 'token',
          refreshToken: 'refresh',
        }),
      })

      const { login } = useAuthStore.getState()
      const loginPromise = login({ email: 'test@example.com', password: 'password123' })

      expect(useAuthStore.getState().loading).toBe(true)
      await loginPromise
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        user: { id: '2', email: 'new@example.com', nickname: 'New User', subscription: 'free' } as unknown as User,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { register } = useAuthStore.getState()
      await register({ email: 'new@example.com', password: 'password123', nickname: 'New User', instrument: 'piano' })

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockResponse.user)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      })

      const { register } = useAuthStore.getState()
      await expect(register({ email: 'existing@example.com', password: 'password123', nickname: 'User', instrument: 'piano' })).rejects.toThrow('Email already exists')
    })
  })

  describe('oauthLogin', () => {
    it('should login with OAuth successfully', async () => {
      const mockResponse = {
        user: { id: '3', email: 'oauth@example.com', nickname: 'OAuth User', subscription: 'free' } as unknown as User,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { oauthLogin } = useAuthStore.getState()
      await oauthLogin({ provider: 'google', code: 'mock-code' })

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
    })

    it('should handle OAuth login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'OAuth authorization failed' }),
      })

      const { oauthLogin } = useAuthStore.getState()
      await expect(oauthLogin({ provider: 'google', code: 'invalid-code' })).rejects.toThrow('OAuth authorization failed')
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free' } as unknown as User,
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
      })

      mockFetch.mockResolvedValueOnce({ ok: true })

      const { logout } = useAuthStore.getState()
      await logout()

      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.accessToken).toBe(null)
      expect(state.isAuthenticated).toBe(false)
    })

    it('should logout even if API call fails', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free' } as unknown as User,
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
      })

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { logout } = useAuthStore.getState()
      await logout()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      useAuthStore.setState({
        refreshToken: 'old-refresh-token',
        accessToken: 'old-access-token',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      })

      const { refreshTokens } = useAuthStore.getState()
      await refreshTokens()

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe('new-access-token')
      expect(state.refreshToken).toBe('new-refresh-token')
    })

    it('should logout if refresh fails', async () => {
      useAuthStore.setState({
        refreshToken: 'invalid-refresh-token',
        accessToken: 'token',
        user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free' } as unknown as User,
        isAuthenticated: true,
      })

      mockFetch.mockResolvedValueOnce({ ok: false })

      const { refreshTokens } = useAuthStore.getState()
      await expect(refreshTokens()).rejects.toThrow('Token refresh failed')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })

    it('should throw error if no refresh token', async () => {
      useAuthStore.setState({ refreshToken: null })

      const { refreshTokens } = useAuthStore.getState()
      await expect(refreshTokens()).rejects.toThrow('No refresh token')
    })
  })

  describe('updateUser', () => {
    it('should update user data', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free' } as unknown as User,
      })

      const { updateUser } = useAuthStore.getState()
      updateUser({ nickname: 'Updated Name' })

      const state = useAuthStore.getState()
      expect(state.user?.nickname).toBe('Updated Name')
    })

    it('should not update if no user', () => {
      useAuthStore.setState({ user: null })

      const { updateUser } = useAuthStore.getState()
      updateUser({ nickname: 'Name' })

      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
    })
  })

  describe('updateSettings', () => {
    it('should update user settings', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free', settings: {} as unknown as UserSettings } as unknown as User,
      })

      const { updateSettings } = useAuthStore.getState()
      updateSettings({ theme: 'dark' })

      const state = useAuthStore.getState()
      expect(state.user?.settings?.theme).toBe('dark')
    })
  })

  describe('hasPermission', () => {
    it('should return false if no user', () => {
      useAuthStore.setState({ user: null })

      const { hasPermission } = useAuthStore.getState()
      expect(hasPermission('practice' as Permission)).toBe(false)
    })

    it('should return true for free user basic permissions', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free' } as unknown as User,
      })

      const { hasPermission } = useAuthStore.getState()
      expect(hasPermission('basic_practice' as Permission)).toBe(true)
    })
  })

  describe('setTheme', () => {
    it('should set dark theme', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free', settings: {} as unknown as UserSettings } as unknown as User,
      })

      const { setTheme } = useAuthStore.getState()
      setTheme('dark')

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('should set light theme', () => {
      const { setTheme } = useAuthStore.getState()
      setTheme('light')

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })
  })
})

describe('Helper functions', () => {
  it('getAccessToken should return current access token', () => {
    useAuthStore.setState({ accessToken: 'test-token' })
    expect(getAccessToken()).toBe('test-token')
  })

  it('isAuthenticated should return authentication status', () => {
    useAuthStore.setState({ isAuthenticated: true })
    expect(isAuthenticated()).toBe(true)
  })

  it('hasPermission should check permission', () => {
    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com', nickname: 'Test', subscription: 'free' } as unknown as User,
    })
    expect(hasPermission('basic_practice' as Permission)).toBe(true)
  })
})