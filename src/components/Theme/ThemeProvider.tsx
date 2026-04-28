import { useEffect } from 'react';
import { Moon, RotateCw, Sun } from 'lucide-react';
import { initTheme, useThemeStore } from './ThemeStore';

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

  return <div className={`theme-provider theme-${resolvedTheme}`}>{children}</div>;
}

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const themes: Array<{ value: import('./ThemeStore').Theme; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: '浅色', icon: <Sun size={16} /> },
    { value: 'dark', label: '深色', icon: <Moon size={16} /> },
    { value: 'auto', label: '跟随系统', icon: <RotateCw size={16} /> },
  ];

  return (
    <div className="theme-toggle" aria-label="主题切换">
      {themes.map((item) => (
        <button
          key={item.value}
          className={`theme-toggle-btn ${theme === item.value ? 'active' : ''}`}
          onClick={() => setTheme(item.value)}
          title={item.label}
          aria-label={item.label}
          type="button"
        >
          <span className="theme-toggle-icon">{item.icon}</span>
        </button>
      ))}
    </div>
  );
}
