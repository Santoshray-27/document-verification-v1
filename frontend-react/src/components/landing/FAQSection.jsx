/**
 * Agnitia Landing — FAQ Accordion
 * Smooth height animation, rotating chevron, aria-expanded.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from './content.js';

function FAQItem({ q, a, isOpen, onToggle, index }) {
  return (
    <div className="border-b border-[#ebebeb] last:border-none">
      <button
        id={`faq-btn-${index}`}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B0FC4] rounded-sm"
      >
        <span className="text-base font-semibold text-[#0A0A0A]">{q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#F4F4F5]"
          aria-hidden="true"
        >
          <ChevronDown size={16} className="text-[#4B0FC4]" />
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
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[#555] text-sm leading-relaxed pr-10">{a}</p>
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
      className="py-24 px-4 bg-[#FAFAFA]"
      aria-label="Frequently asked questions"
    >
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-section-title text-center mb-12"
        >
          Frequently Asked Questions
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl border border-[#ebebeb] px-7 shadow-sm"
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
