/**
 * Evidentia Landing — Big Numbers List
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Rows with giant numbers, dividers, and count-up on enter.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { BIG_NUMBERS } from './content.js';
import { ShieldIllustration, QRIllustration, KeyIllustration, ChainIllustration } from './Illustrations.jsx';

const THUMBS = [ShieldIllustration, QRIllustration, KeyIllustration, ChainIllustration];

function useCountUp(target, duration = 1400, start = false) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    if (!start) return;
    let raf;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  
  return value;
}

function NumberRow({ item, index }) {
  const rowRef = useRef(null);
  const isInView = useInView(rowRef, { once: true, margin: "-10%" });

  const numericTarget = parseInt(item.n.replace(/,/g, ''), 10);
  const isNumeric     = !isNaN(numericTarget);
  
  const counted       = useCountUp(isNumeric ? numericTarget : 0, 1400, isInView && isNumeric);
  const formattedCounted = isNumeric ? counted.toLocaleString() : counted;
  const displayValue  = isNumeric ? formattedCounted : item.n;

  const Thumb = THUMBS[index % THUMBS.length];

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100, damping: 20 }}
      className="flex items-center gap-6 py-8"
    >
      {/* thumbnail */}
      <div className="relative shrink-0 hidden sm:block">
        <div className="w-20 h-20 rounded-2xl bg-muted/60 border border-border flex items-center justify-center overflow-visible">
          <Thumb size={48} />
        </div>
        <span className="absolute -top-2.5 -right-2.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground shadow-xs">
          0{index + 1}
        </span>
      </div>

      {/* number */}
      <div className="flex-1 min-w-0">
        <span className="landing-big-number font-display text-foreground font-black">
          {displayValue}
          <span className="text-3xl md:text-5xl font-bold text-primary ml-1">{item.suffix}</span>
        </span>
      </div>

      {/* description */}
      <div className="text-right max-w-sm ml-auto">
        <p className="font-display font-bold text-foreground text-base md:text-lg">{item.label}</p>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
      </div>
    </motion.div>
  );
}

export default function BigNumbersSection() {
  return (
    <section
      id="verdicts"
      className="py-20 md:py-28 px-4 bg-muted/20 border-t border-border/50 scroll-mt-28"
      aria-label="Key metrics"
    >
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          className="landing-section-title font-display text-center text-foreground mb-3"
        >
          Verification In Numbers
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ delay: 0.1 }}
          className="text-center text-muted-foreground text-sm md:text-base mb-12 max-w-lg mx-auto"
        >
          Deterministic metrics from the core cryptographic pipeline.
        </motion.p>

        <div className="divide-y divide-border">
          {BIG_NUMBERS.map((item, i) => (
            <NumberRow key={item.label} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
