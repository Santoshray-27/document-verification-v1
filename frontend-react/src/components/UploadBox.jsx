import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, Trash2, UploadCloud } from 'lucide-react';
import { fmtBytes } from '../lib/format';

const MAX_MB = 5;
const ACCEPT = '.pdf,.png,.jpg,.jpeg';

/**
 * Drag-and-drop upload with keyboard support, type/size validation done client-side
 * (the server re-validates magic bytes — this is only for fast feedback).
 */
export default function UploadBox({ file, onFile, onError, disabled = false }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const accept = useCallback(
    (f) => {
      if (!f) return;
      const okType = /\.(pdf|png|jpe?g)$/i.test(f.name);
      if (!okType) return onError?.('Only PDF, PNG and JPEG files are accepted.');
      if (f.size > MAX_MB * 1024 * 1024) return onError?.(`That file is ${fmtBytes(f.size)} — the limit is ${MAX_MB} MB.`);
      onFile(f);
    },
    [onFile, onError]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      accept(e.dataTransfer.files?.[0]);
    },
    [accept, disabled]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a document to verify"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
          ${
            dragging
              ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
              : 'border-border hover:border-amber-500/50 bg-card/50 hover:bg-card'
          }
          ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <motion.span
          animate={dragging ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-transform"
        >
          <UploadCloud size={26} strokeWidth={2} />
        </motion.span>
        <p className="font-display text-base font-semibold text-foreground">
          Drop a document here
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or <span className="text-amber-700 dark:text-amber-400 font-medium underline underline-offset-2">browse files</span>
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          PDF, PNG or JPEG · up to {MAX_MB} MB · document is analyzed cryptographically
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>

      {file && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 shadow-xs"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
            {/\.(png|jpe?g)$/i.test(file.name) ? <ImageIcon size={18} /> : <FileText size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
            <span className="font-mono block text-xs text-muted-foreground">{fmtBytes(file.size)}</span>
          </span>
          <button
            onClick={() => onFile(null)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="Remove file"
          >
            <Trash2 size={16} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
