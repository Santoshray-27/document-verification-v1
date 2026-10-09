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
      <div className="glass p-6 text-sm text-slate-400">
        No key fields could be compared for this file.
      </div>
    );
  }
  const matched = fields.filter((f) => f.status === 'passed').length;

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <h3 className="section-title">Expected vs detected</h3>
        <span className="text-xs text-slate-400">
          {matched}/{fields.length} match
          {ocrConfidence !== null && ocrConfidence !== undefined && (
            <span className="ml-2 text-slate-500">· OCR confidence {ocrConfidence}%</span>
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-2.5 font-semibold">Field</th>
              <th className="px-3 py-2.5 font-semibold">Expected (registry)</th>
              <th className="px-3 py-2.5 font-semibold">Detected (OCR)</th>
              <th className="px-5 py-2.5 text-right font-semibold">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {fields.map((f, i) => {
              const r = ROW[f.status] || ROW.skipped;
              const Icon = r.Icon;
              return (
                <motion.tr
                  key={f.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4) }}
                  className={f.status === 'failed' ? 'bg-rose-500/[0.06]' : ''}
                >
                  <td className="px-5 py-3 font-medium text-slate-200">{LABELS[f.key] || f.key}</td>
                  <td className="px-3 py-3 text-slate-400">{f.expected ?? <span className="text-slate-600">—</span>}</td>
                  <td className="px-3 py-3 text-slate-300">
                    {f.detected ?? <span className="text-slate-600">not read</span>}
                    {f.similarity !== null && f.similarity !== undefined && (
                      <span className="mono ml-2 text-[10px] text-slate-500">{(f.similarity * 100).toFixed(0)}%</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: r.color }}>
                      <Icon size={13} strokeWidth={2.6} />
                      {r.label}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-white/[0.06] px-5 py-3 text-[11px] leading-relaxed text-slate-500">
        OCR is fuzzy by nature, so small differences are treated as noise. Only a clear mismatch on a key field counts against the document.
      </p>
    </div>
  );
}
