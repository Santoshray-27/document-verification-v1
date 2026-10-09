import React from 'react';

/** Shimmering placeholders that match the final layout, so nothing "jumps" on load. */
function Bar({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-muted/80 dark:bg-stone-800/80 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
    </div>
  );
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-xs ${className}`}>
      <Bar className="mb-4 h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} className={`mb-2.5 h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <Bar className="mb-3 h-3 w-20" />
          <Bar className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="border-b border-border px-5 py-4 bg-muted/20">
        <Bar className="h-3.5 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border/50 px-5 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Bar key={c} className={`h-3 ${c === 0 ? 'w-1/4' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonResult() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="mx-auto mb-5 h-24 w-24 rounded-full bg-muted/80 dark:bg-stone-800/80" />
        <Bar className="mx-auto mb-3 h-7 w-52" />
        <Bar className="mx-auto h-3.5 w-72" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center gap-3">
            <Bar className="h-5 w-5 rounded-full" />
            <Bar className="h-3 flex-1" />
          </div>
        ))}
      </div>
      <SkeletonCard lines={4} />
    </div>
  );
}

export default Bar;
