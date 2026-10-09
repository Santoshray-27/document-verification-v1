import React from 'react';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 outline-none select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground font-semibold hover:bg-amber-400 dark:hover:bg-amber-400 shadow-sm border border-amber-600/20',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-stone-200 dark:hover:bg-stone-800 border border-border shadow-xs',
        outline:
          'border border-border bg-background hover:bg-muted hover:text-foreground text-foreground shadow-xs',
        ghost:
          'hover:bg-muted hover:text-foreground text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-red-700 shadow-sm font-medium',
        link:
          'text-amber-700 dark:text-amber-400 underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
        default: 'h-10 px-4 py-2 text-sm rounded-xl gap-2',
        lg: 'h-11 px-6 text-base rounded-xl gap-2.5',
        icon: 'h-9 w-9 p-0 rounded-xl justify-center',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg justify-center',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
