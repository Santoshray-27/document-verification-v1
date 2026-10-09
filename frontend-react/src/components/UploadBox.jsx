import { motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
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
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all
          ${dragging ? 'border-gold-400/70 bg-gold-500/[0.07]' : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'}
          ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <motion.span
          animate={dragging ? { scale: 1.08, y: -3 } : { scale: 1, y: 0 }}
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/25 bg-gold-500/10 text-gold-300"
        >
          <UploadCloud size={26} />
        </motion.span>
        <p className="text-base font-semibold text-white">Drop a document here</p>
        <p className="mt-1 text-sm text-slate-400">or click to browse</p>
        <p className="mt-3 text-xs text-slate-500">PDF, PNG or JPEG · up to {MAX_MB} MB · the file is analysed, never modified</p>
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-500/30 text-gold-300">
            {/\.(png|jpe?g)$/i.test(file.name) ? <ImageIcon size={17} /> : <FileText size={17} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-100">{file.name}</span>
            <span className="mono block text-[11px] text-slate-500">{fmtBytes(file.size)}</span>
          </span>
          <button
            onClick={() => onFile(null)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
            aria-label="Remove file"
          >
            <Trash2 size={16} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
