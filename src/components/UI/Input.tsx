import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    className = '',
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`input-wrapper ${className}`}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div className={`input-container ${error ? 'input-error' : ''}`}>
          {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`input-field ${leftIcon ? 'input-with-left-icon' : ''} ${rightIcon ? 'input-with-right-icon' : ''}`}
            {...props}
          />
          {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
        </div>
        {error && <span className="input-error-text">{error}</span>}
        {helperText && !error && <span className="input-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  id?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    label,
    error,
    helperText,
    className = '',
    id,
    ...props
  }, ref) => {
    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`textarea-wrapper ${className}`}>
        {label && (
          <label htmlFor={inputId} className="textarea-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`textarea-field ${error ? 'textarea-error' : ''}`}
          {...props}
        />
        {error && <span className="textarea-error-text">{error}</span>}
        {helperText && !error && <span className="textarea-helper-text">{helperText}</span>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';