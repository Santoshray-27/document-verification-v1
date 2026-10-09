import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../lib/format';
import { Badge } from './ui/badge';

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
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2">
        <code className="font-mono text-xs min-w-0 flex-1 truncate text-foreground font-medium" style={{ color: tone }} title={value}>
          {value}
        </code>
        <button
          onClick={doCopy}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

/** Expected (registry) vs uploaded SHA-256, with a MATCH / MISMATCH pill. */
export default function HashStrip({ expected, uploaded, match }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          SHA-256 file hashes
        </h3>
        {match === true && (
          <Badge variant="genuine">Exact Byte Match</Badge>
        )}
        {match === false && (
          <Badge variant="altered">Bytes Differ</Badge>
        )}
        {match === null && <Badge variant="secondary">No Registry Record</Badge>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Hash label="Registry (expected)" value={expected} />
        <Hash label="Your upload" value={uploaded} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        A mismatch means the file bytes differ — print-to-PDF, rescanning, or screenshots modify file metadata without altering underlying content. Subsequent multi-layer checks evaluate semantic text and visual layout.
      </p>
    </div>
  );
}
