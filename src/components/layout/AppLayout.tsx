import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Music, BookOpen, BarChart, User, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '../Theme';
import { Navigation, NavItem } from '../UI';
import { useI18n } from '@/i18n';

export interface AppLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  showFooter?: boolean;
}

export function AppLayout({ 
  children, 
  showNavigation = true,
  showFooter = true,
}: AppLayoutProps) {
  const location = useLocation();
  const { t } = useI18n();
  
  const navItems: NavItem[] = [
    { id: 'home', label: t.nav.home, href: '/', icon: <Home size={18} /> },
    { id: 'practice', label: t.nav.practice, href: '/practice', icon: <Music size={18} /> },
    { id: 'library', label: t.nav.library, href: '/library', icon: <BookOpen size={18} /> },
    { id: 'statistics', label: t.nav.statistics, href: '/statistics', icon: <BarChart size={18} /> },
  ];
  
  const getActiveId = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/practice')) return 'practice';
    if (path.startsWith('/library')) return 'library';
    if (path.startsWith('/statistics')) return 'statistics';
    return '';
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <Link to="/" className="app-brand">
            <h1 className="app-brand-title">Resonance</h1>
            <p className="app-brand-subtitle">Precision Practice</p>
          </Link>
        </div>
        
        {showNavigation && (
          <div className="app-header-center">
            <Navigation
              items={navItems}
              activeId={getActiveId()}
              orientation="horizontal"
              variant="default"
            />
          </div>
        )}
        
        <div className="app-header-right">
          <ThemeToggle />
          <Link to="/user" className="app-user-link">
            <span className="app-user-icon"><User size={20} /></span>
          </Link>
        </div>
      </header>
      
      <main className="app-main">
        {children}
      </main>
      
      {showFooter && (
        <footer className="app-footer">
          <div className="app-footer-content">
            <p className="app-footer-copyright">
              © 2026 Resonance. All rights reserved.
            </p>
            <div className="app-footer-links">
              <Link to="/help">帮助</Link>
              <Link to="/help/about">关于</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  backLink?: string;
}

export function PageLayout({
  title,
  subtitle,
  children,
  actions,
  backLink,
}: PageLayoutProps) {
  return (
    <AppLayout>
      <div className="page-layout">
        <header className="page-header">
          <div className="page-header-left">
            {backLink && (
              <Link to={backLink} className="page-back-link">
                <ArrowLeft size={16} className="inline-icon" /> 返回
              </Link>
            )}
            <div className="page-title-group">
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && (
            <div className="page-header-right">
              {actions}
            </div>
          )}
        </header>
        <div className="page-content">
          {children}
        </div>
      </div>
    </AppLayout>
  );
}