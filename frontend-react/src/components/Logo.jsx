import React from 'react';
import { motion } from 'framer-motion';

/** Evidentia shield mark. Pure SVG so it renders offline with no font/asset dependency. */
export default function Logo({ size = 34, animate = false, withWord = true, wordClass = '' }) {
  const s = size;
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-flex" style={{ width: s, height: s }}>
        {animate && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-[28%] bg-amber-500/20"
            animate={{ scale: [1, 1.25], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <svg viewBox="0 0 32 32" width={s} height={s} className="relative drop-shadow-xs">
          <rect width="32" height="32" rx="8" fill="currentColor" className="text-stone-900 dark:text-stone-900" />
          <path
            d="M16 5.6l8.4 4.1v7.2c0 5.2-3.5 8.7-8.4 10-4.9-1.3-8.4-4.8-8.4-10V9.7z"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.8"
          />
          <path
            d="M12.2 16.4l2.7 2.7 5.2-5.6"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {withWord && (
        <span className={`font-display font-bold tracking-tight text-foreground ${wordClass}`}>
          Evidentia
          <span className="ml-2 hidden text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 sm:inline">
            Proof in Every Pixel
          </span>
        </span>
      )}
    </span>
  );
}
