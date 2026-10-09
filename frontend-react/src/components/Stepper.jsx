import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Circle, Loader2, MinusCircle, X } from 'lucide-react';
import { fmtMs } from '../lib/format';

const STATUS = {
  passed: {
    color: '#10B981',
    Icon: Check,
    ring: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    color: '#EF4444',
    Icon: AlertTriangle,
    ring: 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
  warning: {
    color: '#F59E0B',
    Icon: AlertTriangle,
    ring: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  skipped: {
    color: '#94A3B8',
    Icon: MinusCircle,
    ring: 'border-stone-400/40 bg-stone-500/10 text-stone-500 dark:text-stone-400',
  },
  running: {
    color: '#F59E0B',
    Icon: Loader2,
    ring: 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  queued: {
    color: '#78716C',
    Icon: Circle,
    ring: 'border-stone-400 dark:border-stone-600 bg-stone-100/60 dark:bg-stone-800/40 text-stone-500 dark:text-stone-400',
  },
};

/**
 * Vertical stepper with live per-step status. `steps` comes straight from the API job object.
 * `overlay` renders it as a full-screen modal (used by the issue flow).
 */
export default function Stepper({
  steps = [],
  title,
  subtitle,
  progress = 0,
  overlay = false,
  error = null,
  onClose,
  footer = null,
}) {
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current?.scrollIntoView) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps.filter((s) => s.status === 'running').length]);

  const body = (
    <div
      className={
        overlay
          ? 'w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl'
          : 'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden'
      }
    >
      {(title || progress > 0) && (
        <div className="border-b border-border px-6 py-5 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="font-display text-lg font-semibold text-foreground tracking-tight">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary border border-border/40">
            <motion.div
              className="h-full rounded-full bg-amber-500"
              animate={{ width: `${Math.max(4, progress)}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            />
          </div>
        </div>
      )}

      <ol className="max-h-[58vh] space-y-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {steps.map((step, i) => {
          const s = STATUS[step.status] || STATUS.queued;
          const Icon = s.Icon;
          const running = step.status === 'running';
          const passed = step.status === 'passed';

          return (
            <li
              key={step.id}
              ref={running ? activeRef : null}
              className={`relative flex items-start gap-3.5 rounded-xl px-3.5 py-2.5 transition-colors ${
                running ? 'bg-amber-500/10 dark:bg-amber-500/10' : 'hover:bg-muted/40'
              }`}
            >
              {/* connector line */}
              {i < steps.length - 1 && (
                <span
                  className="absolute left-[27px] top-[40px] h-[calc(100%-24px)] w-0.5"
                  style={{
                    background: passed
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'var(--border)',
                  }}
                />
              )}
              <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                {running && (
                  <span className="absolute inset-0 rounded-full bg-amber-500/25 animate-ping opacity-75" />
                )}
                <span
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full border shadow-2xs ${s.ring}`}
                >
                  <Icon size={14} className={running ? 'animate-spin' : ''} strokeWidth={passed ? 2.8 : 2} />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`truncate text-sm font-medium ${
                      running
                        ? 'text-amber-800 dark:text-amber-300 font-semibold'
                        : step.status === 'queued'
                        ? 'text-stone-500 dark:text-stone-400'
                        : 'text-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.ms !== null && step.ms !== undefined && (
                    <span className="font-mono shrink-0 text-[11px] text-muted-foreground">{fmtMs(step.ms)}</span>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {step.message && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-1 break-words text-xs leading-relaxed ${
                        step.status === 'failed'
                          ? 'text-rose-600 dark:text-rose-400 font-medium'
                          : step.status === 'skipped'
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="border-t border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm text-rose-700 dark:text-rose-300">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Step failed
          </p>
          <p className="mt-0.5 text-xs text-rose-700/80 dark:text-rose-300/80 leading-relaxed">{error}</p>
        </div>
      )}
      {footer && <div className="border-t border-border px-6 py-4 bg-muted/20">{footer}</div>}
    </div>
  );

  if (!overlay) return body;

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-2xl"
      >
        {body}
      </motion.div>
    </motion.div>
  );
}

/** Small inline "working" pill for buttons and headers. */
export function Spinner({ size = 15, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

/** Live elapsed timer, used while a job runs. */
export function useElapsed(running) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const t = setInterval(() => setMs(Date.now() - t0), 100);
    return () => clearInterval(t);
  }, [running]);
  return ms;
}
