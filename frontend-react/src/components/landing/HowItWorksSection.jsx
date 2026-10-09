/**
 * Evidentia Landing — How It Works
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Giant text reveal, then 3 staggered cards rise in.
 */
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HOW_IT_WORKS } from './content.js';
import { ShieldIllustration, QRIllustration, ChainIllustration } from './Illustrations.jsx';

const STEP_ICONS = [ShieldIllustration, QRIllustration, ChainIllustration];
const STEP_OFFSETS = [30, 0, 45];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-32 px-4 bg-background border-t border-border/50"
      aria-label="How Evidentia works"
    >
      <div className="max-w-5xl mx-auto">
        {/* ── Giant heading reveal ── */}
        <div className="text-center mb-16 md:mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="landing-giant-heading font-display text-foreground inline"
          >
            {HOW_IT_WORKS.heading}
          </motion.h2>
          {' '}
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-block bg-primary text-primary-foreground font-display font-bold text-2xl md:text-4xl px-4 py-1.5 rounded-2xl align-middle shadow-xs ml-2"
          >
            {HOW_IT_WORKS.chip}
          </motion.span>
        </div>

        {/* ── Staggered step cards ── */}
        <div className="grid md:grid-cols-3 gap-6 items-end pb-8">
          {HOW_IT_WORKS.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <motion.article
                key={step.n}
                initial={{ opacity: 0, y: 40 + STEP_OFFSETS[i] }}
                whileInView={{ opacity: 1, y: STEP_OFFSETS[i] }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 100, damping: 18 }}
                whileHover={{ y: STEP_OFFSETS[i] - 8, transition: { duration: 0.2 } }}
                className="rounded-3xl p-7 flex flex-col gap-5 border border-border bg-card shadow-sm hover:shadow-md transition-shadow cursor-default"
              >
                <div className="flex items-start justify-between">
                  <span className="text-5xl font-mono font-black tracking-tighter text-foreground/80 leading-none">
                    {step.n}
                  </span>
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20"
                    aria-hidden="true"
                  >
                    <ArrowRight size={18} />
                  </span>
                </div>

                <div className="flex justify-center py-4">
                  <Icon size={64} />
                </div>

                <div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
