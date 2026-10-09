import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../lib/format';

function Hash({ label, value, tone }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const doCopy = async () => {
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <div className="min-w-0 flex-1">
      <p className="section-title mb-1.5">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-navy-950/50 px-3 py-2">
        <code className="mono min-w-0 flex-1 truncate" style={{ color: tone }} title={value}>
          {value}
        </code>
        <button onClick={doCopy} className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200" aria-label={`Copy ${label}`}>
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

/** Expected (registry) vs uploaded SHA-256, with a MATCH / MISMATCH pill. */
export default function HashStrip({ expected, uploaded, match }) {
  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="section-title">SHA-256 file hashes</h3>
        {match === true && (
          <span className="chip border border-emerald-400/40 bg-emerald-500/12 text-emerald-300">Match</span>
        )}
        {match === false && (
          <span className="chip border border-amber-400/40 bg-amber-500/12 text-amber-300">Mismatch</span>
        )}
        {match === null && <span className="chip border border-white/10 bg-white/[0.04] text-slate-400">No record</span>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Hash label="Registry (expected)" value={expected} tone="#93A3C8" />
        <Hash label="Your upload" value={uploaded} tone={match ? '#6EE7B7' : '#FCD34D'} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        A mismatch means the bytes differ — a re-save, a scan or a screenshot all do that. It is not by itself proof of forgery;
        the OCR and visual checks below decide that.
      </p>
    </div>
  );
}
