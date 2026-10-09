import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, MinusCircle, X } from 'lucide-react';
import { CHECK_STATUS, shortHash } from '../lib/format';

const ICONS = { passed: Check, failed: X, warning: AlertTriangle, skipped: MinusCircle, running: AlertTriangle, queued: MinusCircle };

/**
 * Every check the pipeline ran, in order, each with pass/fail/warn/unavailable.
 * Expanding a row shows the raw detail (hashes, OCR fields, region coords).
 */
export default function EvidenceList({ checks = [] }) {
  const [open, setOpen] = useState(null);

  if (!checks.length) {
    return (
      <div className="glass p-6 text-center text-sm text-slate-400">
        No checks were run for this file.
      </div>
    );
  }

  return (
    <div className="glass divide-y divide-white/[0.05] overflow-hidden">
      {checks.map((c, i) => {
        const meta = CHECK_STATUS[c.status] || CHECK_STATUS.queued;
        const Icon = ICONS[c.status] || MinusCircle;
        const expanded = open === c.id;
        const hasDetail = c.detail && (Array.isArray(c.detail) ? c.detail.length : Object.keys(c.detail).length);
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.045, 0.5) }}
            className="px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
          >
            <button
              className="flex w-full items-start gap-3 text-left"
              onClick={() => hasDetail && setOpen(expanded ? null : c.id)}
              aria-expanded={expanded}
              disabled={!hasDetail}
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: `${meta.color}55`, background: `${meta.color}18`, color: meta.color }}
              >
                <Icon size={12} strokeWidth={2.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-100">{c.label}</span>
                  <span className="mono shrink-0 text-[10px] uppercase tracking-wide" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                </span>
                {c.message && <span className="mt-0.5 block break-words text-xs leading-relaxed text-slate-400">{c.message}</span>}
              </span>
              {hasDetail ? (
                <ChevronDown size={15} className={`mt-1 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              ) : (
                <span className="w-[15px]" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {expanded && hasDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 rounded-lg border border-white/[0.07] bg-navy-950/50 p-3.5">
                    <Detail detail={c.detail} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function Detail({ detail }) {
  if (Array.isArray(detail)) {
    return (
      <ul className="space-y-2">
        {detail.map((d, i) => (
          <li key={i} className="text-xs">
            <pre className="mono whitespace-pre-wrap break-all text-slate-300">{typeof d === 'string' ? d : JSON.stringify(d, null, 2)}</pre>
          </li>
        ))}
      </ul>
    );
  }
  if (detail.fields) {
    return (
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-500">
            <th className="pb-2 pr-3 font-semibold">Field</th>
            <th className="pb-2 pr-3 font-semibold">Expected</th>
            <th className="pb-2 pr-3 font-semibold">Detected</th>
            <th className="pb-2 font-semibold">Similarity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {detail.fields.map((f) => (
            <tr key={f.key}>
              <td className="py-1.5 pr-3 font-medium text-slate-300">{f.key}</td>
              <td className="py-1.5 pr-3 text-slate-400">{f.expected ?? '—'}</td>
              <td className="py-1.5 pr-3 text-slate-400">{f.detected ?? '—'}</td>
              <td className="mono py-1.5 text-slate-500">{f.similarity ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <dl className="space-y-1.5 text-xs">
      {Object.entries(detail).map(([k, v]) => (
        <div key={k} className="flex gap-3">
          <dt className="w-36 shrink-0 text-slate-500">{k}</dt>
          <dd className="mono min-w-0 flex-1 break-all text-slate-300">
            {typeof v === 'string' && v.length > 40 ? shortHash(v, 20, 12) : JSON.stringify(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
