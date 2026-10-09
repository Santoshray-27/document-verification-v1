import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground font-semibold',
        secondary:
          'bg-secondary text-secondary-foreground border border-border/80',
        destructive:
          'bg-destructive/15 text-red-700 dark:text-red-400 border border-red-500/20',
        outline:
          'border border-border text-foreground bg-transparent',
        // Verdict variants
        genuine:
          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60',
        copy:
          'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800/60',
        altered:
          'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-800/60',
        forged:
          'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800/60',
        revoked:
          'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60',
        unverifiable:
          'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700',
        // Confidence variants
        high:
          'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
        medium:
          'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30',
        low:
          'bg-stone-500/15 text-stone-700 dark:text-stone-400 border border-stone-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
