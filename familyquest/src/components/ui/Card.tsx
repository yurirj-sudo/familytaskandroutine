import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'primary' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  id?: string;
}

const variantClasses = {
  default: 'bg-surface-container-lowest rounded-DEFAULT shadow-cloud',
  glass:   'bg-surface-container-lowest rounded-DEFAULT shadow-cloud',
  primary: 'primary-gradient rounded-DEFAULT text-on-primary',
  dark:    'bg-surface-container-low rounded-DEFAULT',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
  padding = 'md',
  id,
}) => {
  const baseClasses = [
    variantClasses[variant],
    paddingClasses[padding],
    onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform duration-200 active:scale-[0.99]' : '',
    className,
  ].join(' ');

  if (onClick) {
    return (
      <div id={id} className={baseClasses} onClick={onClick} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}>
        {children}
      </div>
    );
  }

  return (
    <div id={id} className={baseClasses}>
      {children}
    </div>
  );
};

export default Card;
