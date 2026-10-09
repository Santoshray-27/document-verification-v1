/**
 * Evidentia Landing — FAQ Accordion
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Smooth height animation, rotating chevron, aria-expanded.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from './content.js';

function FAQItem({ q, a, isOpen, onToggle, index }) {
  return (
    <div className="border-b border-border last:border-none">
      <button
        id={`faq-btn-${index}`}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-lg transition"
      >
        <span className="text-sm sm:text-base font-semibold text-foreground">{q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted/80 text-primary border border-border"
          aria-hidden="true"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-panel-${index}`}
            role="region"
            aria-labelledby={`faq-btn-${index}`}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-muted-foreground text-xs sm:text-sm leading-relaxed pr-8">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <section
      id="faq"
      className="py-24 px-4 bg-muted/20 border-t border-border/50"
      aria-label="Frequently asked questions"
    >
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-section-title font-display text-center text-foreground mb-12"
        >
          Frequently Asked Questions
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl border border-border px-6 sm:px-8 shadow-sm"
        >
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              index={i}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx((prev) => (prev === i ? null : i))}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
