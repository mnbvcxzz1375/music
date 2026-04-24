import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState, LoginCredentials, RegisterCredentials, OAuthCredentials, UserSettings, Permission } from './types';
import { ROLE_PERMISSIONS } from './types';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  oauthLogin: (credentials: OAuthCredentials) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  hasPermission: (permission: Permission) => boolean;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
}

const API_BASE = '/api/v1';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '登录失败');
          }

          const data = await response.json();
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            loading: false,
          });
        } catch (error) {
          set({ loading: false, error: (error as Error).message });
          throw error;
        }
      },

      register: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '注册失败');
          }

          const data = await response.json();
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            loading: false,
          });
        } catch (error) {
          set({ loading: false, error: (error as Error).message });
          throw error;
        }
      },

      oauthLogin: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/auth/oauth/${credentials.provider}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: credentials.code }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'OAuth登录失败');
          }

          const data = await response.json();
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            loading: false,
          });
        } catch (error) {
          set({ loading: false, error: (error as Error).message });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${get().accessToken}`,
            },
            body: JSON.stringify({ refreshToken }),
          });
        } catch {
          // Token refresh failed - proceed with logout anyway
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        try {
          const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            get().logout();
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },

      updateSettings: (settings) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              settings: { ...user.settings, ...settings },
            },
          });
        }
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return ROLE_PERMISSIONS[user.subscription].includes(permission);
      },

      setTheme: (theme) => {
        const root = document.documentElement;
        if (theme === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
          root.setAttribute('data-theme', theme);
        }
        get().updateSettings({ theme });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}

export function hasPermission(permission: Permission): boolean {
  return useAuthStore.getState().hasPermission(permission);
}