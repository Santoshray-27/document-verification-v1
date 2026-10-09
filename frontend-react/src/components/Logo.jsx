import { motion } from 'framer-motion';

/** Agnitia shield mark. Pure SVG so it renders offline with no font/asset dependency. */
export default function Logo({ size = 34, animate = true, withWord = true, wordClass = '' }) {
  const s = size;
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-flex" style={{ width: s, height: s }}>
        {animate && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-[26%] bg-gold-500/25 animate-pulseRing"
          />
        )}
        <svg viewBox="0 0 32 32" width={s} height={s} className="relative drop-shadow-[0_2px_8px_rgba(212,175,55,0.35)]">
          <rect width="32" height="32" rx="7.5" fill="#0A1F44" />
          <path
            d="M16 5.6l8.4 4.1v7.2c0 5.2-3.5 8.7-8.4 10-4.9-1.3-8.4-4.8-8.4-10V9.7z"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="1.7"
          />
          <path d="M12.2 16.4l2.7 2.7 5.2-5.6" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {withWord && (
        <span className={`font-bold tracking-tight text-white ${wordClass}`}>
          Agnitia
          <span className="ml-1.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400/80 sm:inline">
            Proof in Every Pixel
          </span>
        </span>
      )}
    </span>
  );
}
