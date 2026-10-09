import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Ban, Check, Loader2, MinusCircle } from 'lucide-react';
import { fmtMs } from '../lib/format';

const STATUS = {
  passed: { color: '#10B981', Icon: Check, ring: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300' },
  failed: { color: '#EF4444', Icon: AlertTriangle, ring: 'border-rose-400/50 bg-rose-500/15 text-rose-300' },
  warning: { color: '#F59E0B', Icon: AlertTriangle, ring: 'border-amber-400/50 bg-amber-500/15 text-amber-300' },
  skipped: { color: '#94A3B8', Icon: MinusCircle, ring: 'border-slate-400/40 bg-slate-500/10 text-slate-400' },
  running: { color: '#D4AF37', Icon: Loader2, ring: 'border-gold-400/60 bg-gold-500/15 text-gold-300' },
  queued: { color: '#475569', Icon: Ban, ring: 'border-white/10 bg-white/[0.03] text-slate-600' },
};

/**
 * Vertical stepper with live per-step status. `steps` comes straight from the API job object.
 * `overlay` renders it as a full-screen modal (used by the issue flow).
 */
export default function Stepper({ steps = [], title, subtitle, progress = 0, overlay = false, error = null, onClose, footer = null }) {
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current?.scrollIntoView) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps.filter((s) => s.status === 'running').length]);

  const body = (
    <div className={overlay ? 'glass w-full max-w-2xl overflow-hidden' : 'glass w-full'}>
      {(title || progress > 0) && (
        <div className="border-b border-white/[0.07] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
            </div>
            {onClose && (
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Close">
                <Ban size={18} />
              </button>
            )}
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
              animate={{ width: `${Math.max(3, progress)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            />
          </div>
        </div>
      )}

      <ol className="max-h-[58vh] space-y-0.5 overflow-y-auto px-3 py-3" aria-live="polite">
        {steps.map((step, i) => {
          const s = STATUS[step.status] || STATUS.queued;
          const Icon = s.Icon;
          const running = step.status === 'running';
          return (
            <li
              key={step.id}
              ref={running ? activeRef : null}
              className={`relative flex items-start gap-3.5 rounded-xl px-3 py-2.5 transition-colors ${running ? 'bg-white/[0.05]' : ''}`}
            >
              {/* connector line */}
              {i < steps.length - 1 && (
                <span
                  className="absolute left-[26px] top-[38px] h-[calc(100%-24px)] w-px"
                  style={{ background: step.status === 'passed' ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)' }}
                />
              )}
              <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                {running && <span className="absolute inset-0 rounded-full bg-gold-400/30 animate-pulseRing" />}
                <span className={`relative flex h-7 w-7 items-center justify-center rounded-full border ${s.ring}`}>
                  <Icon size={14} className={running ? 'animate-spin' : ''} />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`truncate text-sm font-medium ${running ? 'text-white' : step.status === 'queued' ? 'text-slate-500' : 'text-slate-200'}`}>
                    {step.label}
                  </p>
                  {step.ms !== null && step.ms !== undefined && (
                    <span className="mono shrink-0 text-[10px] text-slate-500">{fmtMs(step.ms)}</span>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {step.message && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-0.5 break-words text-xs leading-relaxed ${
                        step.status === 'failed' ? 'text-rose-300' : step.status === 'skipped' ? 'text-slate-500' : 'text-slate-400'
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
        <div className="border-t border-rose-400/20 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          <p className="font-semibold">Step failed</p>
          <p className="mt-0.5 text-rose-200/80">{error}</p>
        </div>
      )}
      {footer && <div className="border-t border-white/[0.07] px-6 py-4">{footer}</div>}
    </div>
  );

  if (!overlay) return body;

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="w-full max-w-2xl">
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
