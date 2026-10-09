/**
 * Evidentia Landing — Who It's For
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Three fanned use-case cards with clean stone & amber styling.
 */
import { motion } from 'framer-motion';
import { USE_CASES } from './content.js';

export default function UseCasesSection() {
  return (
    <section
      className="py-20 md:py-28 px-4 bg-background border-t border-border/50 overflow-hidden"
      aria-label="Use cases"
    >
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-section-title font-display text-center text-foreground mb-3"
        >
          Built For Institutions That Can't Afford Doubt
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-center text-muted-foreground text-sm md:text-base mb-16 max-w-lg mx-auto"
        >
          From university registrars to HR departments, anyone who accepts documents needs evidence, not trust.
        </motion.p>

        {/* Level, aligned cards grid */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {USE_CASES.map((uc, i) => (
            <motion.article
              key={uc.role}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 120, damping: 20 }}
              className="bg-card rounded-3xl border border-border shadow-sm hover:shadow-md p-7 flex flex-col justify-between transition-all cursor-default"
              aria-label={`Use case: ${uc.role}`}
            >
              {/* icon + role */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl" role="img" aria-label={uc.role}>{uc.icon}</span>
                <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                  {uc.role}
                </span>
              </div>

              {/* quote mark */}
              <span className="text-5xl leading-none text-primary/40 font-black select-none block" aria-hidden="true">“</span>

              {/* quote */}
              <p className="text-foreground text-sm leading-relaxed -mt-3">{uc.quote}</p>

              {/* attribution */}
              <p className="mt-4 text-xs font-mono text-muted-foreground">— {uc.attr}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
