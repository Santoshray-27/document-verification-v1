/** Shimmering placeholders that match the final layout, so nothing "jumps" on load. */
function Bar({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-white/[0.06] ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
    </div>
  );
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`glass p-5 ${className}`}>
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
        <div key={i} className="glass p-5">
          <Bar className="mb-3 h-3 w-20" />
          <Bar className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="glass overflow-hidden">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <Bar className="h-3.5 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-3.5 last:border-0">
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
      <div className="glass p-8 text-center">
        <div className="mx-auto mb-5 h-24 w-24 rounded-full bg-white/[0.06]" />
        <Bar className="mx-auto mb-3 h-7 w-52" />
        <Bar className="mx-auto h-3.5 w-72" />
      </div>
      <div className="glass p-6">
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
