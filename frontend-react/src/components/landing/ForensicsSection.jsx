/**
 * Agnitia Landing — Forensics Evidence Section
 * Sticky two-panel with left card cycling 3 states + right stats card.
 */
import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';
import { FORENSICS_CARDS } from './content.js';

const VERDICT_COLOURS = {
  'GENUINE':       '#10B981',
  'GENUINE COPY':  '#14B8A6',
  'ALTERED':       '#F59E0B',
  'FORGED':        '#EF4444',
  'REVOKED':       '#F97316',
  'UNVERIFIABLE':  '#8B5CF6',
};

const SEGMENT_COLOURS = ['#4B0FC4', '#FFD83D', '#F0568F'];

/* ── Left card states ─────────────────────────────────────────── */

function VerdictEngineState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 mt-4">
      <h3 className="text-[#0A0A0A] font-bold text-[26px] mb-6">Verdict Engine</h3>
      <div className="flex flex-wrap gap-3 justify-center max-w-sm">
        {FORENSICS_CARDS.left.verdictChips.map((chip, i) => (
          <motion.span
            key={chip}
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
            className="px-4 py-2 rounded-full text-[14px] font-bold border"
            style={{
              color:            VERDICT_COLOURS[chip] || '#888',
              borderColor:      `${VERDICT_COLOURS[chip]}44` || '#88888844',
              background:       `${VERDICT_COLOURS[chip]}14` || '#88888814',
              transform:        `rotate(${(i % 3 - 1) * 2}deg)`,
            }}
          >
            {chip}
          </motion.span>
        ))}
      </div>
      <p className="text-[15px] text-[#4B5563] text-center mt-6 max-w-sm leading-relaxed">{FORENSICS_CARDS.left.tabs[0].desc}</p>
    </div>
  );
}

function HeatmapState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 mt-4">
      <h3 className="text-[#0A0A0A] font-bold text-[26px] mb-6">Tamper Heatmap</h3>
      {/* mock document - wider (>=260px) */}
      <div className="relative bg-white rounded-2xl shadow-lg border border-[#E5E7EB] w-[280px] p-5">
        <div className="h-2.5 w-32 bg-[#D1D5DB] rounded mb-3" />
        <div className="h-2.5 w-44 bg-[#E5E7EB] rounded mb-4" />
        {/* altered field with heatmap overlay */}
        <div className="relative mb-3">
          <div className="h-2.5 w-40 bg-[#E5E7EB] rounded mb-1.5" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.85, 0.4, 0.85] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute -inset-1 rounded"
            style={{
              background: 'linear-gradient(90deg,rgba(239,68,68,0.5),rgba(251,146,60,0.3))',
              border: '2px solid rgba(239,68,68,0.8)',
            }}
          />
        </div>
        <div className="h-2.5 w-28 bg-[#E5E7EB] rounded mb-3" />
        <div className="h-2.5 w-48 bg-[#E5E7EB] rounded" />
        {/* bounding box label */}
        <div className="absolute -top-3 -right-3 bg-[#EF4444] text-white text-[11px] font-bold px-2 py-1 rounded-full shadow-md">
          ALTERED
        </div>
      </div>
      <p className="text-[15px] text-[#4B5563] text-center mt-6 max-w-sm leading-relaxed">{FORENSICS_CARDS.left.tabs[1].desc}</p>
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
      <h3 className="text-[#0A0A0A] font-bold text-[26px] mb-8">Live Pipeline</h3>
      <ul className="space-y-4 w-full max-w-[280px]">
        {FORENSICS_CARDS.left.pipelineSteps.map((s, i) => {
          const isCompleted = i <= step;
          return (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: isCompleted ? 1 : 0.6, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4"
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <CheckCircle size={20} weight="fill" className="text-[#4B0FC4] shrink-0 fill-current" />
                  </motion.span>
                ) : (
                  <Circle size={20} className="text-[#6B7280] shrink-0" />
                )}
              </AnimatePresence>
              <span className={`text-[15px] font-medium ${isCompleted ? 'text-[#0A0A0A]' : 'text-[#262626]'}`}>{s}</span>
            </motion.li>
          );
        })}
      </ul>
      <p className="text-[15px] text-[#4B5563] text-center mt-8 max-w-sm leading-relaxed">{FORENSICS_CARDS.left.tabs[2].desc}</p>
    </div>
  );
}

const STATES = [VerdictEngineState, HeatmapState, PipelineState];

/* ── Right stats card ─────────────────────────────────────────── */
function StatsCard() {
  return (
    <div className="rounded-3xl bg-[#F4F4F5] p-6 h-full flex flex-col gap-5 min-h-[460px]">
      {/* tab group (cosmetic) */}
      <div className="flex gap-2">
        {['Overview', 'Details'].map((t, i) => (
          <span key={t} className={`text-[13px] font-semibold px-4 py-1.5 rounded-full ${i === 0 ? 'bg-[#0A0A0A] text-white' : 'text-[#4B5563]'}`}>
            {t}
          </span>
        ))}
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {FORENSICS_CARDS.right.stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-2xl p-5 flex flex-col justify-between ${i === 0 ? 'bg-[#FFD83D]' : i === 1 ? 'bg-[#F0568F] text-white' : 'bg-white shadow-sm border border-[#E5E7EB]' }`}
          >
            <p className={`text-[32px] font-bold tracking-tight ${i === 1 ? 'text-white' : 'text-[#0A0A0A]'}`}>{s.value}</p>
            <p className={`text-[15px] font-medium mt-1 ${i === 1 ? 'text-white/80' : 'text-[#4B5563]'}`}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* sparkline / decorative SVG */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#E5E7EB] min-h-[160px] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[14px] font-semibold text-[#0A0A0A]">Verification pipeline</span>
          <span className="text-[14px] text-[#4B0FC4] font-semibold">100% deterministic</span>
        </div>
        <div className="flex-1 relative">
          <svg viewBox="0 0 200 60" className="w-full h-full absolute inset-0" preserveAspectRatio="none" aria-label="Decorative chart">
            <motion.path
              d="M0 50 C30 48, 50 20, 80 18 C110 16, 130 35, 160 15 C180 5, 195 8, 200 6"
              stroke="#F0568F" strokeWidth="3" strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
            />
            {/* tooltip pills */}
            <rect x="68" y="2" width="44" height="18" rx="9" fill="#0A0A0A" />
            <text x="90" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">5.8s avg</text>
            <rect x="146" y="-2" width="48" height="18" rx="9" fill="#4B0FC4" />
            <text x="170" y="10" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">100% det.</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────── */
export default function ForensicsSection() {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Use discrete event instead of updating every frame
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    let newTab = 0;
    if (latest >= 0.66) newTab = 2;
    else if (latest >= 0.33) newTab = 1;
    
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  });

  const ActiveState = STATES[activeTab];

  if (prefersReducedMotion || window.innerWidth < 768) {
    return (
      <section className="py-24 px-4 bg-white" style={{ contain: 'layout paint' }}>
        <h2 className="landing-section-title text-center mb-10">{FORENSICS_CARDS.heading}</h2>
        <div className="max-w-5xl mx-auto grid gap-8">
           <div className="rounded-3xl bg-[#F4F4F5] p-6"><VerdictEngineState /></div>
           <StatsCard />
        </div>
      </section>
    );
  }

  return (
    /* tall scroll container - 240vh */
    <section
      id="features"
      ref={containerRef}
      className="relative bg-white"
      style={{ height: '240vh', contain: 'layout paint' }}
      aria-label="Forensic evidence features"
    >
      <div className="sticky top-0 min-h-screen flex flex-col items-center justify-center py-20 px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          className="landing-section-title text-center mb-12"
        >
          {FORENSICS_CARDS.heading}
        </motion.h2>

        <div className="grid lg:grid-cols-2 gap-6 w-full max-w-5xl">
          {/* ── Left cycling card ── */}
          <div className="rounded-3xl bg-[#F4F4F5] overflow-hidden flex flex-col border border-[#E5E7EB]" style={{ minHeight: 460 }}>
            {/* progress bar */}
            <div className="flex h-1.5">
              {FORENSICS_CARDS.left.tabs.map((t, i) => (
                <div
                  key={t.key}
                  className="flex-1 origin-left transition-transform duration-300"
                  style={{ 
                    background: SEGMENT_COLOURS[i], 
                    transform: `scaleX(${i < activeTab ? 1 : i === activeTab ? 0.5 : 0})`,
                    opacity: i <= activeTab ? 1 : 0.25 
                  }}
                />
              ))}
            </div>

            {/* tab selectors */}
            <div className="flex gap-2 p-5 pb-0 justify-center">
              {FORENSICS_CARDS.left.tabs.map((t, i) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(i)}
                  className={`text-[13px] font-semibold px-4 py-2 rounded-full transition-all ${activeTab === i ? 'bg-[#0A0A0A] text-white shadow-md' : 'text-[#4B5563] hover:bg-[#E5E7EB]'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* animated content */}
            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{   opacity: 0, y: -16 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0"
                >
                  <ActiveState />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right stats card ── */}
          <StatsCard />
        </div>
      </div>
    </section>
  );
}
