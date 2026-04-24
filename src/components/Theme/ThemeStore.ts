import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (resolvedTheme: 'light' | 'dark') => {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolvedTheme);
  
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      resolvedTheme: 'dark',

      setTheme: (theme) => {
        const resolvedTheme = theme === 'auto' ? getSystemTheme() : theme;
        applyTheme(resolvedTheme);
        set({ theme, resolvedTheme });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = state.theme === 'auto' ? getSystemTheme() : state.theme;
          applyTheme(resolvedTheme);
          state.resolvedTheme = resolvedTheme;
        }
      },
    }
  )
);

export function initTheme() {
  const { theme } = useThemeStore.getState();
  const resolvedTheme = theme === 'auto' ? getSystemTheme() : theme;
  applyTheme(resolvedTheme);

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const { theme } = useThemeStore.getState();
      if (theme === 'auto') {
        const newResolvedTheme = e.matches ? 'dark' : 'light';
        applyTheme(newResolvedTheme);
        useThemeStore.setState({ resolvedTheme: newResolvedTheme });
      }
    });
  }
}

export function getTheme(): Theme {
  return useThemeStore.getState().theme;
}

export function getResolvedTheme(): 'light' | 'dark' {
  return useThemeStore.getState().resolvedTheme;
}