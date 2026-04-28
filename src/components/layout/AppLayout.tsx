import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart, BookOpen, Crown, Home, LogOut, Menu, Music, User, X } from 'lucide-react';
import { ThemeToggle } from '../Theme';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/services/auth';
import { useSubscriptionStore } from '@/services/subscription';

export interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const { isPremium } = useSubscriptionStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleResize = () => {
      if (window.innerWidth >= 900) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isAuthPage = location.pathname === '/user' && !isAuthenticated;

  if (isAuthPage) {
    return (
      <div className="app-layout auth-layout">
        <main className="app-main auth-main">{children}</main>
      </div>
    );
  }

  const navItems = [
    { id: 'home', label: t.nav.home, href: '/', icon: <Home size={20} /> },
    { id: 'library', label: t.nav.library, href: '/library', icon: <BookOpen size={20} /> },
    { id: 'practice', label: t.nav.practice, href: '/practice', icon: <Music size={20} /> },
    { id: 'statistics', label: t.nav.statistics, href: '/statistics', icon: <BarChart size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <div className="spotify-sidebar-inner">
      <div className="spotify-sidebar-header">
        <Link to="/" className="spotify-brand">
          <span className="brand-icon">♪</span>
          <span className="brand-text">Resonance</span>
        </Link>
      </div>

      <nav className="spotify-nav" aria-label="主导航">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={`spotify-nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="spotify-sidebar-footer">
        {!isAuthenticated ? (
          <Link to="/user" className="spotify-nav-item nav-auth-entry">
            <span className="nav-icon"><User size={20} /></span>
            <span className="nav-label">登录 / 注册</span>
          </Link>
        ) : (
          <>
            <Link to="/subscription" className={`spotify-nav-item ${isActive('/subscription') ? 'active' : ''}`}>
              <span className="nav-icon"><Crown size={20} /></span>
              <span className="nav-label">{isPremium() ? '会员中心' : '升级 VIP'}</span>
            </Link>
            <Link to="/user" className={`spotify-nav-item ${isActive('/user') ? 'active' : ''}`}>
              <span className="nav-icon"><User size={20} /></span>
              <span className="nav-label">个人中心</span>
            </Link>
            <button type="button" className="spotify-nav-item logout-btn" onClick={handleLogout}>
              <span className="nav-icon"><LogOut size={20} /></span>
              <span className="nav-label">退出登录</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="spotify-layout">
      <div className="spotify-mobile-header">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link to="/" className="spotify-brand compact-brand">Resonance</Link>
        <ThemeToggle />
      </div>

      <aside className={`spotify-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {sidebarContent}
      </aside>
      {isMobileMenuOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="关闭菜单"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="spotify-main-wrapper">
        <header className="spotify-content-header">
          <div className="header-actions">
            <ThemeToggle />
            <Link to="/user" className="header-user-profile" aria-label="个人中心">
              <span className="user-avatar"><User size={18} /></span>
              <span className="header-user-label">个人中心</span>
            </Link>
          </div>
        </header>

        <main className="app-main" onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}>
          <div className="content-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

export interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, children }: PageLayoutProps) {
  return (
    <div className="page-layout">
      <header className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="page-content">{children}</div>
    </div>
  );
}
