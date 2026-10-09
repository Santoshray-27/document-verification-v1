import React from 'react';
import { cn } from '../../lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed border-border rounded-2xl bg-card/40',
        className
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4 ring-1 ring-border/50">
          <Icon className="h-6 w-6" />
        </div>
      )}
      {title && (
        <h4 className="font-display text-base font-semibold text-foreground tracking-tight mb-1">
          {title}
        </h4>
      )}
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
