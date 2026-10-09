import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Circle, Loader2, MinusCircle, X, ShieldCheck } from 'lucide-react';
import { fmtMs } from '../lib/format';

const STATUS = {
  passed: {
    color: '#059669',
    Icon: Check,
    ring: 'border-emerald-600 bg-emerald-50 text-emerald-800',
  },
  failed: {
    color: '#DC2626',
    Icon: AlertTriangle,
    ring: 'border-red-600 bg-red-50 text-red-800',
  },
  warning: {
    color: '#D97706',
    Icon: AlertTriangle,
    ring: 'border-amber-600 bg-amber-50 text-amber-800',
  },
  skipped: {
    color: '#6B675C',
    Icon: MinusCircle,
    ring: 'border-line bg-surface-2 text-ink-muted',
  },
  running: {
    color: '#F59E0B',
    Icon: Loader2,
    ring: 'border-amber-600 bg-amber-100 text-amber-900',
  },
  queued: {
    color: '#6B675C',
    Icon: Circle,
    ring: 'border-line bg-surface text-ink-muted',
  },
};

/**
 * Vertical stepper with live per-step status. `steps` comes straight from the API job object.
 * `overlay` renders it as a clean solid modal matching Evidentia's light warm paper theme.
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
          ? 'w-full max-w-xl overflow-hidden border-2 border-ink bg-[#FBFAF6] text-ink shadow-[8px_8px_0_#14130F]'
          : 'w-full border border-line bg-surface text-ink shadow-sm overflow-hidden'
      }
    >
      {(title || progress > 0) && (
        <div className="border-b border-line px-6 py-5 bg-[#EFEBE1]">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-600" />
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-1 font-mono text-[11px] text-ink-muted">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 border border-line bg-surface text-ink hover:border-ink hover:text-ink transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden border border-line bg-surface">
            <motion.div
              className="h-full bg-amber-500"
              animate={{ width: `${Math.max(4, progress)}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            />
          </div>
        </div>
      )}

      <ol className="max-h-[58vh] space-y-1.5 overflow-y-auto px-5 py-5 bg-[#FBFAF6]" aria-live="polite">
        {steps.map((step, i) => {
          const s = STATUS[step.status] || STATUS.queued;
          const Icon = s.Icon;
          const running = step.status === 'running';
          const passed = step.status === 'passed';

          return (
            <li
              key={step.id}
              ref={running ? activeRef : null}
              className={`relative flex items-start gap-3.5 border p-3 transition-colors ${
                running
                  ? 'border-amber-600 bg-amber-50/70 shadow-sm'
                  : passed
                  ? 'border-line/70 bg-[#FBFAF6]'
                  : 'border-line/50 bg-[#EFEBE1]/30'
              }`}
            >
              {/* connector line */}
              {i < steps.length - 1 && (
                <span
                  className="absolute left-[24px] top-[42px] h-[calc(100%-20px)] w-0.5 z-0"
                  style={{
                    background: passed ? '#059669' : 'rgba(20, 19, 15, 0.2)',
                  }}
                />
              )}
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center border font-mono ${s.ring}`}
                >
                  <Icon size={13} className={running ? 'animate-spin' : ''} strokeWidth={passed ? 3 : 2} />
                </span>
              </span>
              <div className="min-w-0 flex-1 z-10">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`font-mono text-xs font-bold uppercase tracking-tight ${
                      running
                        ? 'text-amber-900'
                        : step.status === 'queued'
                        ? 'text-ink-muted'
                        : 'text-ink'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.ms !== null && step.ms !== undefined && (
                    <span className="font-mono shrink-0 text-[10px] text-ink-muted bg-[#EFEBE1] px-1.5 py-0.5 border border-line">
                      {fmtMs(step.ms)}
                    </span>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {step.message && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-1 font-mono text-[11px] leading-relaxed break-words ${
                        step.status === 'failed'
                          ? 'text-red-700 font-bold'
                          : 'text-ink-muted'
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
        <div className="border-t border-red-300 bg-red-50 px-6 py-4 font-mono text-xs text-red-800">
          <p className="font-bold flex items-center gap-1.5 uppercase">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Step failed
          </p>
          <p className="mt-1 text-red-700 leading-relaxed">{error}</p>
        </div>
      )}
      {footer && <div className="border-t border-line px-6 py-4 bg-[#EFEBE1]">{footer}</div>}
    </div>
  );

  if (!overlay) return body;

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-xl"
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
