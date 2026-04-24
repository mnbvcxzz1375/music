import { forwardRef } from 'react';

export type CardVariant = 'default' | 'outlined' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'small' | 'medium' | 'large';
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'medium',
    hoverable = false,
    className = '',
    children,
    ...props
  }, ref) => {
    const baseStyles = 'card-base';
    const variantStyles = {
      default: 'card-default',
      outlined: 'card-outlined',
      elevated: 'card-elevated',
    };
    const paddingStyles = {
      none: 'card-padding-none',
      small: 'card-padding-small',
      medium: 'card-padding-medium',
      large: 'card-padding-large',
    };

    const classes = [
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      hoverable ? 'card-hoverable' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div className="card-header-content">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-content ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}