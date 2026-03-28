import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'primary-gradient text-on-primary shadow-primary-glow hover:opacity-90 disabled:opacity-50',
  secondary:
    'bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:bg-surface-container-highest',
  ghost:
    'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low active:bg-surface-container',
  danger:
    'bg-error hover:bg-error-dim text-on-error shadow-sm',
  success:
    'bg-secondary hover:bg-secondary-dim text-on-secondary shadow-sm',
  gold:
    'bg-tertiary-container hover:bg-tertiary-fixed-dim text-on-tertiary-container font-bold shadow-glow-gold',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-full gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-full gap-2',
  lg: 'px-6 py-4 text-base rounded-full gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-headline font-bold',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-1 focus:ring-offset-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.97]',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
