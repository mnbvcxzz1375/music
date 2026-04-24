import { useEffect } from 'react';
import { useThemeStore, initTheme } from './ThemeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    const resolved = theme === 'auto' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    
    document.documentElement.setAttribute('data-theme', resolved);
  }, [theme]);

  return (
    <div className={`theme-provider theme-${resolvedTheme}`}>
      {children}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const themes: Array<{ value: import('./ThemeStore').Theme; label: string; icon: string }> = [
    { value: 'light', label: '浅色', icon: '☀️' },
    { value: 'dark', label: '深色', icon: '🌙' },
    { value: 'auto', label: '自动', icon: '🔄' },
  ];

  return (
    <div className="theme-toggle">
      {themes.map((t) => (
        <button
          key={t.value}
          className={`theme-toggle-btn ${theme === t.value ? 'active' : ''}`}
          onClick={() => setTheme(t.value)}
          title={t.label}
        >
          <span className="theme-toggle-icon">{t.icon}</span>
        </button>
      ))}
    </div>
  );
}