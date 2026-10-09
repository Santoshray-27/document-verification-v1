/**
 * Evidentia Landing — Forensics Evidence Section
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Sticky two-panel with left card cycling 3 states + right stats card.
 */
import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { FORENSICS_CARDS } from './content.js';

const VERDICT_COLOURS = {
  'GENUINE':       { text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  'GENUINE COPY':  { text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500/30', bg: 'bg-teal-500/10' },
  'ALTERED':       { text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
  'FORGED':        { text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  'REVOKED':       { text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  'UNVERIFIABLE':  { text: 'text-stone-700 dark:text-stone-400', border: 'border-stone-500/30', bg: 'bg-stone-500/10' },
};

/* ── Left card states ─────────────────────────────────────────── */

function VerdictEngineState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
      <h3 className="text-foreground font-display font-bold text-2xl mb-4 text-center">Verdict Engine</h3>
      <div className="flex flex-wrap gap-2.5 justify-center max-w-sm">
        {FORENSICS_CARDS.left.verdictChips.map((chip, i) => {
          const style = VERDICT_COLOURS[chip] || { text: 'text-foreground', border: 'border-border', bg: 'bg-muted' };
          return (
            <motion.span
              key={chip}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${style.text} ${style.border} ${style.bg}`}
            >
              {chip}
            </motion.span>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground text-center mt-6 max-w-sm leading-relaxed">{FORENSICS_CARDS.left.tabs[0].desc}</p>
    </div>
  );
}

function HeatmapState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 mt-4">
      <h3 className="text-foreground font-display font-bold text-2xl mb-4">Tamper Heatmap</h3>
      <div className="relative bg-card rounded-2xl shadow-md border border-border w-[280px] p-5">
        <div className="h-2.5 w-32 bg-muted rounded mb-3" />
        <div className="h-2.5 w-44 bg-muted/60 rounded mb-4" />
        {/* altered field with heatmap overlay */}
        <div className="relative mb-3">
          <div className="h-2.5 w-40 bg-muted/60 rounded mb-1.5" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.85, 0.4, 0.85] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute -inset-1 rounded"
            style={{
              background: 'linear-gradient(90deg, rgba(234, 88, 12, 0.5), rgba(245, 158, 11, 0.3))',
              border: '2px solid rgba(234, 88, 12, 0.8)',
            }}
          />
        </div>
        <div className="h-2.5 w-28 bg-muted/60 rounded mb-3" />
        <div className="h-2.5 w-48 bg-muted/60 rounded" />
        {/* bounding box label */}
        <div className="absolute -top-3 -right-3 bg-orange-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md">
          ALTERED
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center mt-6 max-w-sm leading-relaxed">{FORENSICS_CARDS.left.tabs[1].desc}</p>
    </div>
  );
}

function PipelineState() {
  const [step, setStep] = useState(0);
  
  useEffect(() => {
    const steps = FORENSICS_CARDS.left.pipelineSteps.length;
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i >= steps) { 
        clearInterval(id); 
      } else {
        setStep(i);
      }
    }, 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 mt-4">
      <h3 className="text-foreground font-display font-bold text-2xl mb-6">Live Pipeline</h3>
      <ul className="space-y-3 w-full max-w-[280px]">
        {FORENSICS_CARDS.left.pipelineSteps.map((s, i) => {
          const isCompleted = i <= step;
          return (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: isCompleted ? 1 : 0.6, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <CheckCircle2 size={18} className="text-primary shrink-0" />
                  </motion.span>
                ) : (
                  <Circle size={18} className="text-muted-foreground shrink-0" />
                )}
              </AnimatePresence>
              <span className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            </motion.li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground text-center mt-6 max-w-sm leading-relaxed">{FORENSICS_CARDS.left.tabs[2].desc}</p>
    </div>
  );
}

const STATES = [VerdictEngineState, HeatmapState, PipelineState];

/* ── Right stats card ─────────────────────────────────────────── */
function StatsCard() {
  return (
    <div className="rounded-3xl bg-muted/40 border border-border p-6 h-full flex flex-col gap-5 min-h-[460px]">
      {/* tab group (cosmetic) */}
      <div className="flex gap-2">
        {['Overview', 'Details'].map((t, i) => (
          <span
            key={t}
            className={`text-xs font-semibold px-4 py-1.5 rounded-full ${
              i === 0 ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-2 gap-3.5 flex-1">
        {FORENSICS_CARDS.right.stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-2xl p-4.5 flex flex-col justify-between border ${
              i === 0
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200'
                : i === 1
                ? 'bg-primary/20 border-primary/40 text-foreground'
                : 'bg-card border-border shadow-xs'
            }`}
          >
            <p className="text-2xl font-display font-bold tracking-tight text-foreground">{s.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* sparkline / decorative SVG */}
      <div className="rounded-2xl bg-card p-5 shadow-xs border border-border min-h-[160px] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-semibold text-foreground">Verification pipeline</span>
          <span className="text-xs text-primary font-bold">100% deterministic</span>
        </div>
        <div className="flex-1 relative">
          <svg viewBox="0 0 200 60" className="w-full h-full absolute inset-0" preserveAspectRatio="none" aria-label="Decorative chart">
            <motion.path
              d="M0 50 C30 48, 50 20, 80 18 C110 16, 130 35, 160 15 C180 5, 195 8, 200 6"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
            />
            <rect x="68" y="2" width="44" height="18" rx="9" fill="#0C0A09" />
            <text x="90" y="14" textAnchor="middle" fill="#FAFAF9" fontSize="9" fontWeight="bold">5.8s avg</text>
            <rect x="146" y="-2" width="48" height="18" rx="9" fill="#D97706" />
            <text x="170" y="10" textAnchor="middle" fill="#0C0A09" fontSize="9" fontWeight="bold">100% det.</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────── */
export default function ForensicsSection() {
  const [activeTab, setActiveTab] = useState(0);

  const ActiveState = STATES[activeTab];

  return (
    <section id="features" className="py-20 md:py-28 px-4 bg-background scroll-mt-28">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-primary mb-2 block">
            Cryptographic Integrity
          </span>
          <h2 className="landing-section-title font-display text-foreground mb-4">
            {FORENSICS_CARDS.heading}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            Every verification is backed by deterministic math and visual diffs — zero black-box probability.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-muted/60 p-1 border border-border">
            {FORENSICS_CARDS.left.tabs.map((tab, idx) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(idx)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  activeTab === idx
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two-panel grid */}
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="rounded-3xl border border-border bg-card shadow-sm p-6 flex flex-col justify-center min-h-[460px]">
            <ActiveState />
          </div>
          <StatsCard />
        </div>
      </div>
    </section>
  );
}
