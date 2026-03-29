import React from 'react';
import { formatPoints } from '../../utils/points';

interface PointsBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1 gap-1.5',
  lg: 'text-base px-4 py-1.5 gap-2',
};

const starSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const PointsBadge: React.FC<PointsBadgeProps> = ({
  points,
  size = 'md',
  animate = false,
  className = '',
}) => {
  return (
    <div
      className={[
        'inline-flex items-center rounded-full font-headline font-bold',
        'bg-primary text-on-primary shadow-primary-glow',
        animate ? 'animate-pulse-glow' : '',
        sizeClasses[size],
        className,
      ].join(' ')}
      aria-label={`${points} pontos`}
    >
      <span className={starSizes[size]} role="img" aria-hidden="true">⭐</span>
      <span>{points.toLocaleString('pt-BR')}</span>
    </div>
  );
};

export default PointsBadge;
