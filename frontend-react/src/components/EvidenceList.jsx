import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, ChevronDown, MinusCircle, X } from 'lucide-react';
import { CHECK_STATUS, shortHash } from '../lib/format';

const ICONS = {
  passed: Check,
  failed: X,
  warning: AlertTriangle,
  skipped: MinusCircle,
  running: AlertTriangle,
  queued: MinusCircle,
};

/**
 * Every check the pipeline ran, in order, each with pass/fail/warn/unavailable.
 * Expanding a row shows the raw detail (hashes, OCR fields, region coords).
 */
export default function EvidenceList({ checks = [] }) {
  const [open, setOpen] = useState(null);

  if (!checks.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No checks were run for this file.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
      {checks.map((c, i) => {
        const meta = CHECK_STATUS[c.status] || CHECK_STATUS.queued;
        const Icon = ICONS[c.status] || MinusCircle;
        const expanded = open === c.id;
        const hasDetail = c.detail && (Array.isArray(c.detail) ? c.detail.length : Object.keys(c.detail).length);

        return (
          <div
            key={c.id}
            className="px-5 py-3.5 transition-colors hover:bg-muted/30"
          >
            <button
              className="flex w-full items-start gap-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1 -m-1"
              onClick={() => hasDetail && setOpen(expanded ? null : c.id)}
              aria-expanded={expanded}
              disabled={!hasDetail}
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border shadow-2xs"
                style={{ borderColor: `${meta.color}60`, background: `${meta.color}15`, color: meta.color }}
              >
                <Icon size={12} strokeWidth={2.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{c.label}</span>
                  <span
                    className="font-mono shrink-0 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </span>
                {c.message && (
                  <span className="mt-0.5 block break-words text-xs leading-relaxed text-muted-foreground">
                    {c.message}
                  </span>
                )}
              </span>
              {hasDetail ? (
                <ChevronDown
                  size={16}
                  className={`mt-1 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    expanded ? 'rotate-180 text-foreground' : ''
                  }`}
                />
              ) : (
                <span className="w-4" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {expanded && hasDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4">
                    <Detail detail={c.detail} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
            <pre className="font-mono whitespace-pre-wrap break-all text-foreground/90 bg-background/60 p-2.5 rounded-lg border border-border/60">
              {typeof d === 'string' ? d : JSON.stringify(d, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    );
  }
  if (detail.fields) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pr-3 font-semibold">Field</th>
              <th className="pb-2 pr-3 font-semibold">Expected</th>
              <th className="pb-2 pr-3 font-semibold">Detected</th>
              <th className="pb-2 font-semibold">Similarity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {detail.fields.map((f) => (
              <tr key={f.key}>
                <td className="py-2 pr-3 font-medium text-foreground">{f.key}</td>
                <td className="py-2 pr-3 text-muted-foreground">{f.expected ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground">{f.detected ?? '—'}</td>
                <td className="font-mono py-2 text-stone-600 dark:text-stone-400 font-semibold">{f.similarity ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <dl className="space-y-2 text-xs">
      {Object.entries(detail).map(([k, v]) => (
        <div key={k} className="flex flex-col sm:flex-row sm:gap-3">
          <dt className="w-36 shrink-0 font-medium text-muted-foreground">{k}</dt>
          <dd className="font-mono min-w-0 flex-1 break-all text-foreground bg-background/50 px-2 py-0.5 rounded border border-border/50">
            {typeof v === 'string' && v.length > 40 ? shortHash(v, 20, 12) : JSON.stringify(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
