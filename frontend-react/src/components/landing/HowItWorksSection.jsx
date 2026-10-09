/**
 * Agnitia Landing — How It Works
 * Giant text reveal, then 3 staggered cards rise in.
 * Optimized for performance: no scroll-linked updates, no blurs.
 */
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HOW_IT_WORKS } from './content.js';
import { ShieldIllustration, QRIllustration, ChainIllustration } from './Illustrations.jsx';

const STEP_ICONS = [ShieldIllustration, QRIllustration, ChainIllustration];
const STEP_OFFSETS = [40, 0, 60]; // vertical offsets for staggered card heights
const CARD_COLORS = ['#FF7A2F', '#EC4899', '#5B14F0'];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-32 px-4 bg-white"
      style={{ contain: 'layout paint' }}
      aria-label="How Agnitia works"
    >
      <div className="max-w-5xl mx-auto">
        {/* ── Giant heading reveal ── */}
        <div className="text-center mb-16 md:mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.6 }}
            className="landing-giant-heading text-[#0A0A0A] inline"
          >
            {HOW_IT_WORKS.heading}
          </motion.h2>
          {' '}
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-block bg-[#FFD83D] text-[#0A0A0A] font-bold text-3xl md:text-5xl px-5 py-2 rounded-2xl align-middle"
          >
            {HOW_IT_WORKS.chip}
          </motion.span>
        </div>

        {/* ── Staggered step cards ── */}
        <div className="grid md:grid-cols-3 gap-6 items-end pb-16">
          {HOW_IT_WORKS.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            const color = CARD_COLORS[i];
            return (
              <motion.article
                key={step.n}
                initial={{ opacity: 0, y: 50 + STEP_OFFSETS[i] }}
                whileInView={{ opacity: 1, y: STEP_OFFSETS[i] }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 100, damping: 18 }}
                whileHover={{ y: STEP_OFFSETS[i] - 12, transition: { duration: 0.25 } }}
                className="rounded-[32px] p-8 flex flex-col gap-6 cursor-default"
                style={{ background: color, willChange: 'transform' }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[64px] font-black tracking-tighter text-white leading-none">
                    {step.n}
                  </span>
                  <span
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm"
                    aria-hidden="true"
                  >
                    <ArrowRight size={20} color="white" />
                  </span>
                </div>

                <div className="flex justify-center py-4">
                  <Icon size={72} />
                </div>

                <div>
                  <h3 className="text-[22px] font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-[16px] text-white/90 leading-relaxed font-medium">{step.body}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
