/**
 * Agnitia Landing — Who It's For
 * Three fanned use-case cards (quote-style).
 * [PLACEHOLDER] text is in content.js.
 */
import { motion } from 'framer-motion';
import { USE_CASES } from './content.js';

const FAN_ROTATIONS = [-5, 0, 5];
const FAN_Y         = [20, 0, 20];

export default function UseCasesSection() {
  return (
    <section
      className="py-28 px-4 bg-white overflow-hidden"
      aria-label="Use cases"
    >
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-section-title text-center mb-3"
        >
          Built For Institutions That Can't Afford Doubt
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-center text-[#777] text-base mb-16 max-w-lg mx-auto"
        >
          {/* [PLACEHOLDER] Subtitle — replace with your own */}
          From university registrars to HR teams, anyone who accepts documents needs evidence, not trust.
        </motion.p>

        {/* fanned cards container */}
        <div className="relative flex items-end justify-center gap-4 md:gap-0 flex-wrap md:flex-nowrap min-h-[380px]">
          {USE_CASES.map((uc, i) => (
            <motion.article
              key={uc.role}
              initial={{ opacity: 0, y: 60, rotate: 0 }}
              whileInView={{
                opacity: 1,
                y:       FAN_Y[i],
                rotate:  FAN_ROTATIONS[i],
              }}
              whileHover={{ y: FAN_Y[i] - 12, rotate: 0, scale: 1.02, zIndex: 10 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 120, damping: 16 }}
              className="relative bg-white rounded-3xl border border-[#eee] shadow-lg p-7 w-full md:w-72 shrink-0 cursor-default"
              style={{ zIndex: i === 1 ? 5 : 2 }}
              aria-label={`Use case: ${uc.role}`}
            >
              {/* icon + role */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl" role="img" aria-label={uc.role}>{uc.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B0FC4]">{uc.role}</span>
              </div>

              {/* quote mark */}
              <span className="text-6xl leading-none text-[#FFD83D] font-black select-none" aria-hidden="true">"</span>

              {/* [PLACEHOLDER] quote — edit in content.js */}
              <p className="text-[#222] text-sm leading-relaxed -mt-4">{uc.quote}</p>

              {/* [PLACEHOLDER] attribution — edit or remove in content.js */}
              <p className="mt-4 text-xs text-[#999]">— {uc.attr}</p>

              {/* decorative accent */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-full pointer-events-none"
                style={{
                  background: i === 0 ? '#FFD83D20' : i === 1 ? '#F0568F20' : '#4B0FC420',
                  transform: 'translate(30%,-30%)',
                }}
                aria-hidden="true"
              />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
