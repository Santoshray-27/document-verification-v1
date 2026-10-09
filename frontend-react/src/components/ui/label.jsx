import React from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        'text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
