import React from 'react';
import { motion } from 'framer-motion';
import { Ban, Clock, CopyCheck, FileQuestion, FileWarning, FileX, HelpCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { CONFIDENCE_META, verdictMeta } from '../lib/format';
import { Badge } from './ui/badge';

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
          style={{ background: `${meta.color}20` }}
          animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative flex h-full w-full items-center justify-center rounded-full border-2 shadow-sm"
          style={{
            borderColor: meta.color,
            background: `${meta.color}18`,
          }}
        >
          <Icon size={dim * 0.46} style={{ color: meta.color }} strokeWidth={2} />
        </motion.span>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`mt-5 font-display font-bold tracking-tight text-foreground ${
          size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-xl'
        }`}
      >
        {meta.label}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground"
      >
        {meta.blurb}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
      >
        <span
          className="chip border text-xs font-semibold"
          style={{
            borderColor: `${conf.color}40`,
            background: `${conf.color}15`,
            color: conf.color,
          }}
        >
          Confidence: {confidence}
        </span>
        <span className="chip border border-border bg-muted/60 text-muted-foreground normal-case tracking-normal text-xs">
          {conf.note}
        </span>
      </motion.div>
    </div>
  );
}

/** Compact pill for tables and lists. */
export function VerdictPill({ verdict }) {
  const meta = verdictMeta(verdict);
  const Icon = ICONS[meta.icon] || FileQuestion;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs whitespace-nowrap"
      style={{
        borderColor: `${meta.color}35`,
        background: `${meta.color}15`,
        color: meta.color,
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      <span>{meta.label}</span>
    </span>
  );
}
