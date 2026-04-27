import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Music, BookOpen, BarChart, User, Crown, LogOut, Menu, X } from 'lucide-react';
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
  
  // Auth & Subscription state
  const { isAuthenticated, logout } = useAuthStore();
  const { isPremium } = useSubscriptionStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if we are on login/register page to hide sidebar
  const isAuthPage = location.pathname === '/user' || !isAuthenticated;

  if (isAuthPage) {
    return (
      <div className="app-layout auth-layout">
        <main className="app-main">
          {children}
        </main>
      </div>
    );
  }

  // Navigation Items
  const navItems = [
    { id: 'home', label: t.nav.home, href: '/', icon: <Home size={22} /> },
    { id: 'library', label: t.nav.library, href: '/library', icon: <BookOpen size={22} /> },
    { id: 'practice', label: t.nav.practice, href: '/practice', icon: <Music size={22} /> },
    { id: 'statistics', label: t.nav.statistics, href: '/statistics', icon: <BarChart size={22} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (location.pathname.startsWith(path)) return true;
    return false;
  };

  const SidebarContent = () => (
    <div className="sidebar-inner">
      {/* Sidebar Header / Logo */}
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">
          <span className="brand-icon">🎵</span>
          <span className="brand-text">Resonance</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link 
            key={item.id} 
            to={item.href}
            className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {!isPremium() && (
          <Link to="/subscription" className="nav-item premium-upgrade">
            <span className="nav-icon"><Crown size={22} /></span>
            <span className="nav-label">升级 VIP</span>
          </Link>
        )}
        <Link to="/user" className={`nav-item ${isActive('/user') ? 'active' : ''}`}>
          <span className="nav-icon"><User size={22} /></span>
          <span className="nav-label">个人中心</span>
        </Link>
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <span className="nav-icon"><LogOut size={22} /></span>
          <span className="nav-label">登出</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-layout spotify-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link to="/" className="mobile-brand">Resonance</Link>
        <ThemeToggle />
      </div>

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <SidebarContent />
      </aside>
      
      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Sticky Header inside content */}
        <header className="content-header">
          <div className="header-actions">
            <ThemeToggle />
            <Link to="/user" className="header-user-profile">
              <span className="user-avatar"><User size={18} /></span>
            </Link>
          </div>
        </header>

        <main className="app-main" onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}>
          <div className="content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// PageLayout for inner pages with a title
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
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}
