import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/** Count-up number that only animates once, when the card scrolls into view. */
function CountUp({ value, duration = 700 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = Number(value) || 0;
    if (target === 0) return setN(0);
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return <span ref={ref}>{n}</span>;
}

export default function StatCard({ label, value, icon: Icon, tone = '#F59E0B', hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-all hover:shadow-sm"
    >
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.08]"
        style={{ background: tone }}
      />
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl border shadow-2xs"
            style={{
              borderColor: `${tone}40`,
              background: `${tone}15`,
              color: tone,
            }}
          >
            <Icon size={17} strokeWidth={2.2} />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}
