/**
 * Agnitia Landing — Big Numbers List
 * Rows with giant numbers, dividers, and count-up on enter.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { BIG_NUMBERS } from './content.js';
import { ShieldIllustration, QRIllustration, KeyIllustration, ChainIllustration } from './Illustrations.jsx';

const THUMBS = [ShieldIllustration, QRIllustration, KeyIllustration, ChainIllustration];
const BADGE_COLOURS = ['#F0568F', '#FFD83D', '#FF7A2F', '#4B0FC4'];

/** Counts from 0 to `target` over `duration` ms when `start` becomes true. */
function useCountUp(target, duration = 1400, start = false) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    if (!start) return;
    let raf;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setValue(target); // Ensure we hit exact target at end
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

  // parse numeric target (ignore non-numeric like 'ECDSA P-256')
  const numericTarget = parseInt(item.n.replace(/,/g, ''), 10); // Handle commas if present
  const isNumeric     = !isNaN(numericTarget);
  
  const counted       = useCountUp(isNumeric ? numericTarget : 0, 1400, isInView && isNumeric);
  
  // Format with commas if it was a large number
  const formattedCounted = isNumeric ? counted.toLocaleString() : counted;
  const displayValue  = isNumeric ? formattedCounted : item.n;

  const Thumb = THUMBS[index % THUMBS.length];

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100, damping: 20 }}
      className="flex items-center gap-6 py-10"
    >
      {/* thumbnail with tilted badge */}
      <div className="relative shrink-0 hidden sm:block">
        <div className="w-24 h-24 rounded-[32px] bg-[#F4F4F5] flex items-center justify-center overflow-visible shadow-inner">
          <Thumb size={64} />
        </div>
        <span
          className="absolute -top-3 -right-3 text-[12px] font-black px-3 py-1 rounded-full text-white rotate-6 shadow-md"
          style={{ background: BADGE_COLOURS[index % BADGE_COLOURS.length] }}
        >
          #{index + 1}
        </span>
      </div>

      {/* number */}
      <div className="flex-1 min-w-0">
        <span className="landing-big-number text-[#0A0A0A]">
          {displayValue}
          <span className="text-4xl md:text-6xl font-bold text-[#4B0FC4] ml-1">{item.suffix}</span>
        </span>
      </div>

      {/* description */}
      <div className="text-right max-w-sm ml-auto">
        <p className="font-bold text-[#0A0A0A] text-[18px]">{item.label}</p>
        <p className="text-[15px] text-[#374151] mt-1.5 leading-relaxed">{item.desc}</p>
      </div>
    </motion.div>
  );
}

export default function BigNumbersSection() {
  return (
    <section
      id="verdicts"
      className="py-24 md:py-32 px-4 bg-[#FAFAFA]"
      style={{ contain: 'layout paint' }}
      aria-label="Key metrics"
    >
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          className="landing-section-title text-center mb-6"
        >
          The Numbers
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ delay: 0.1 }}
          className="text-center text-[#4B5563] text-[16px] mb-12 max-w-lg mx-auto"
        >
          Truthful metrics from the product, not marketing copy.
        </motion.p>

        <div className="divide-y divide-[#E5E7EB]">
          {BIG_NUMBERS.map((item, i) => (
            <NumberRow key={item.label} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
