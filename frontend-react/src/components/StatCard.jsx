import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

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

export default function StatCard({ label, value, icon: Icon, tone = '#D4AF37', hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="glass card-hover relative overflow-hidden p-5"
    >
      <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.09]" style={{ background: tone }} />
      <div className="flex items-start justify-between">
        <p className="section-title">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border" style={{ borderColor: `${tone}33`, background: `${tone}14`, color: tone }}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </motion.div>
  );
}
