import React from 'react';

interface AvatarProps {
  value: string; // emoji ou URL
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  name?: string;
  ring?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-base',
  sm: 'w-9 h-9 text-xl',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl',
  xl: 'w-20 h-20 text-4xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  value,
  size = 'md',
  name,
  ring = false,
  className = '',
}) => {
  const isUrl = value.startsWith('http') || value.startsWith('/');

  return (
    <div
      className={[
        'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
        'bg-primary-container border-2 border-surface-container-lowest',
        ring ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : '',
        sizeClasses[size],
        className,
      ].join(' ')}
      title={name}
      aria-label={name || 'Avatar'}
    >
      {isUrl ? (
        <img
          src={value}
          alt={name || 'Avatar'}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span role="img" aria-label={name || 'Emoji avatar'} className="leading-none">
          {value}
        </span>
      )}
    </div>
  );
};

export default Avatar;
