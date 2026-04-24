import { useEffect } from 'react';
import { Sun, Moon, RotateCw } from 'lucide-react';
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

  const themes: Array<{ value: import('./ThemeStore').Theme; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: '浅色', icon: <Sun size={16} /> },
    { value: 'dark', label: '深色', icon: <Moon size={16} /> },
    { value: 'auto', label: '自动', icon: <RotateCw size={16} /> },
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