import { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'medium',
    loading = false,
    icon,
    fullWidth = false,
    className = '',
    disabled,
    children,
    ...props
  }, ref) => {
    const baseStyles = 'button-base';
    const variantStyles = {
      primary: 'button-primary',
      secondary: 'button-secondary',
      ghost: 'button-ghost',
      danger: 'button-danger',
    };
    const sizeStyles = {
      small: 'button-small',
      medium: 'button-medium',
      large: 'button-large',
    };

    const classes = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? 'button-full-width' : '',
      loading ? 'button-loading' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="button-spinner" />}
        {icon && !loading && <span className="button-icon">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';