import { motion } from 'framer-motion';
import { Ban, Clock, CopyCheck, FileQuestion, FileWarning, FileX, HelpCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { CONFIDENCE_META, verdictMeta } from '../lib/format';

const ICONS = {
  'shield-check': ShieldCheck,
  'copy-check': CopyCheck,
  'file-warning': FileWarning,
  'shield-x': ShieldX,
  'file-x': FileX,
  'help-circle': HelpCircle,
  ban: Ban,
  clock: Clock,
  'file-question': FileQuestion,
};

/**
 * The hero of the result page: a big colour-coded verdict with a pulsing ring.
 * Confidence is always shown as High/Medium/Low — never as a percentage.
 */
export default function VerdictBadge({ verdict, confidence, size = 'lg' }) {
  const meta = verdictMeta(verdict);
  const Icon = ICONS[meta.icon] || FileQuestion;
  const conf = CONFIDENCE_META[confidence] || CONFIDENCE_META.Low;
  const dim = size === 'lg' ? 96 : 56;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: dim, height: dim }}>
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: `${meta.color}33` }}
          animate={{ scale: [1, 1.35], opacity: [0.55, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          className="relative flex h-full w-full items-center justify-center rounded-full border-2"
          style={{ borderColor: `${meta.color}66`, background: `${meta.color}14`, boxShadow: `0 0 44px -6px ${meta.color}55` }}
        >
          <Icon size={dim * 0.46} style={{ color: meta.color }} strokeWidth={1.9} />
        </motion.span>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className={`mt-5 font-bold tracking-tight text-white ${size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-xl'}`}
      >
        {meta.label}
      </motion.h1>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
        {meta.blurb}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
      >
        <span className="chip border" style={{ borderColor: `${conf.color}55`, background: `${conf.color}14`, color: conf.color }}>
          Confidence: {confidence}
        </span>
        <span className="chip border border-white/10 bg-white/[0.04] text-slate-400 normal-case tracking-normal">{conf.note}</span>
      </motion.div>
    </div>
  );
}

/** Compact pill for tables and lists. */
export function VerdictPill({ verdict }) {
  const meta = verdictMeta(verdict);
  return (
    <span
      className="chip whitespace-nowrap border"
      style={{ borderColor: `${meta.color}44`, background: `${meta.color}14`, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
