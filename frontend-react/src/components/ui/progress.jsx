import React from 'react';
import { cn } from '../../lib/utils';

export function Progress({ value = 0, max = 100, className, indicatorClassName }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary border border-border/50',
        className
      )}
    >
      <div
        className={cn(
          'h-full bg-primary transition-all duration-300 ease-out rounded-full',
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
