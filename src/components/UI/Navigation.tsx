import { forwardRef } from 'react';

export type NavItemVariant = 'default' | 'compact' | 'full';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface NavigationProps {
  items: NavItem[];
  activeId?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: NavItemVariant;
  onItemClick?: (id: string) => void;
  className?: string;
}

export const Navigation = forwardRef<HTMLElement, NavigationProps>(
  ({
    items,
    activeId,
    orientation = 'horizontal',
    variant = 'default',
    onItemClick,
    className = '',
  }, ref) => {
    const baseStyles = 'navigation-base';
    const orientationStyles = {
      horizontal: 'navigation-horizontal',
      vertical: 'navigation-vertical',
    };
    const variantStyles = {
      default: 'navigation-default',
      compact: 'navigation-compact',
      full: 'navigation-full',
    };

    const classes = [
      baseStyles,
      orientationStyles[orientation],
      variantStyles[variant],
      className,
    ].filter(Boolean).join(' ');

    const handleItemClick = (item: NavItem) => {
      if (item.disabled) return;
      if (item.onClick) {
        item.onClick();
      } else if (onItemClick) {
        onItemClick(item.id);
      }
    };

    const getItemClasses = (item: NavItem) => {
      const isActive = item.id === activeId;
      return [
        'nav-item',
        isActive ? 'nav-item-active' : '',
        item.disabled ? 'nav-item-disabled' : '',
      ].filter(Boolean).join(' ');
    };

    return (
      <nav ref={ref} className={classes}>
        {items.map((item) => (
          item.href ? (
            <a
              key={item.id}
              href={item.href}
              className={getItemClasses(item)}
              aria-current={item.id === activeId ? 'page' : undefined}
            >
              {item.icon && <span className="nav-item-icon">{item.icon}</span>}
              <span className="nav-item-label">{item.label}</span>
            </a>
          ) : (
            <button
              key={item.id}
              type="button"
              className={getItemClasses(item)}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              aria-current={item.id === activeId ? 'page' : undefined}
            >
              {item.icon && <span className="nav-item-icon">{item.icon}</span>}
              <span className="nav-item-label">{item.label}</span>
            </button>
          )
        ))}
      </nav>
    );
  }
);

Navigation.displayName = 'Navigation';

export interface NavGroupProps {
  title?: string;
  items: NavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  className?: string;
}

export function NavGroup({
  title,
  items,
  activeId,
  onItemClick,
  className = '',
}: NavGroupProps) {
  return (
    <div className={`nav-group ${className}`}>
      {title && <div className="nav-group-title">{title}</div>}
      <Navigation
        items={items}
        activeId={activeId}
        orientation="vertical"
        variant="compact"
        onItemClick={onItemClick}
      />
    </div>
  );
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export function Breadcrumb({
  items,
  separator = '/',
  className = '',
}: BreadcrumbProps) {
  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            {index > 0 && (
              <span className="breadcrumb-separator">{separator}</span>
            )}
            {item.href ? (
              <a href={item.href} className="breadcrumb-link">
                {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                {item.label}
              </a>
            ) : (
              <span className="breadcrumb-current" aria-current="page">
                {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = 'default',
  className = '',
}: TabsProps) {
  const variantStyles = {
    default: 'tabs-default',
    pills: 'tabs-pills',
    underline: 'tabs-underline',
  };

  return (
    <div className={`tabs ${variantStyles[variant]} ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`tab-item ${item.id === activeId ? 'tab-item-active' : ''} ${item.disabled ? 'tab-item-disabled' : ''}`}
          onClick={() => !item.disabled && onChange(item.id)}
          disabled={item.disabled}
          role="tab"
          aria-selected={item.id === activeId}
        >
          {item.icon && <span className="tab-item-icon">{item.icon}</span>}
          <span className="tab-item-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}