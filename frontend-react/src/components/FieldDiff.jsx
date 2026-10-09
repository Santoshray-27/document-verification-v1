import React from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, X } from 'lucide-react';

const ROW = {
  passed: { color: '#10B981', Icon: Check, label: 'Match' },
  failed: { color: '#EF4444', Icon: X, label: 'Differs' },
  warning: { color: '#F59E0B', Icon: Minus, label: 'Uncertain' },
  skipped: { color: '#94A3B8', Icon: Minus, label: 'Not read' },
};

const LABELS = {
  name: 'Recipient name',
  certificate_number: 'Certificate ID',
  course: 'Course / title',
  grade: 'Grade',
  issue_date: 'Issue date',
  issuer_name: 'Issuer',
  doc_id: 'Document ID',
};

/** Registry field vs OCR-detected field, row by row. */
export default function FieldDiff({ fields = [], ocrConfidence = null }) {
  if (!fields.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-xs">
        No key fields could be compared for this file.
      </div>
    );
  }
  const matched = fields.filter((f) => f.status === 'passed').length;

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 bg-muted/20">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Expected vs detected fields
        </h3>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{matched}/{fields.length}</span> match
          {ocrConfidence !== null && ocrConfidence !== undefined && (
            <span className="ml-2">· OCR confidence {ocrConfidence}%</span>
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
              <th className="px-5 py-2.5 font-semibold">Field</th>
              <th className="px-4 py-2.5 font-semibold">Expected (registry)</th>
              <th className="px-4 py-2.5 font-semibold">Detected (OCR)</th>
              <th className="px-5 py-2.5 text-right font-semibold">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {fields.map((f, i) => {
              const r = ROW[f.status] || ROW.skipped;
              const Icon = r.Icon;
              const failed = f.status === 'failed';
              return (
                <motion.tr
                  key={f.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className={failed ? 'bg-rose-500/10 dark:bg-rose-950/20' : 'hover:bg-muted/30 transition-colors'}
                >
                  <td className="px-5 py-3 font-medium text-foreground">{LABELS[f.key] || f.key}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.expected ?? <span className="text-stone-400">—</span>}</td>
                  <td className="px-4 py-3 text-foreground">
                    {f.detected ?? <span className="text-stone-400 italic">not read</span>}
                    {f.similarity !== null && f.similarity !== undefined && (
                      <span className="font-mono ml-2 text-[11px] text-muted-foreground">({(f.similarity * 100).toFixed(0)}%)</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: r.color }}>
                      <Icon size={13} strokeWidth={2.8} />
                      {r.label}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground bg-muted/10">
        OCR comparisons account for scan degradation and sensor noise. A decisive mismatch on an authenticated cryptographic field informs the final verdict.
      </p>
    </div>
  );
}
