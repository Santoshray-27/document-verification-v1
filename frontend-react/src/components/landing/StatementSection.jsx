/**
 * Agnitia Landing — Statement Text Reveal
 * Words fade in word-by-word as user scrolls through the section.
 * Optimized with smaller pinned height and proper contrast.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { STATEMENT } from './content.js';
import { ShieldIllustration, KeyIllustration } from './Illustrations.jsx';

// Parse statement into words, inserting illustration markers
function buildTokens(text) {
  const words = text.split(' ');
  const iconPositions = { 4: 'shield', 10: 'key' };
  const tokens = [];
  words.forEach((w, i) => {
    if (iconPositions[i]) tokens.push({ type: 'icon', name: iconPositions[i] });
    tokens.push({ type: 'word', text: w });
  });
  return tokens;
}

const TOKENS = buildTokens(STATEMENT.words);
const WORD_TOKENS = TOKENS.filter((t) => t.type === 'word');

export default function StatementSection() {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start center', 'end center'],
  });

  if (prefersReducedMotion || window.innerWidth < 768) {
    return (
      <section className="py-24 px-4 bg-white" style={{ contain: 'layout paint' }}>
        <div className="max-w-[1000px] mx-auto text-center">
          <p className="text-[clamp(2rem,4.5vw,4rem)] font-bold text-[#111827] leading-[1.15] tracking-tight">
            {TOKENS.map((token, globalIdx) => {
              if (token.type === 'icon') {
                return (
                  <span key={`icon-${globalIdx}`} className="inline-block align-middle mx-3 relative -top-1">
                    {token.name === 'shield' && <ShieldIllustration size={48} />}
                    {token.name === 'key'    && <KeyIllustration    size={40} />}
                  </span>
                );
              }
              return <span key={`word-${globalIdx}`} className="inline-block mr-[0.25em]">{token.text}</span>;
            })}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className="relative bg-white"
      style={{ height: '160vh', contain: 'layout paint' }}
      aria-label="Mission statement"
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 md:px-12 pt-16">
        <div className="max-w-[1000px] mx-auto text-center">
          <p className="text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.15] tracking-tight" aria-label={STATEMENT.words}>
            {TOKENS.map((token, globalIdx) => {
              if (token.type === 'icon') {
                return (
                  <span key={`icon-${globalIdx}`} className="inline-block align-middle mx-3 relative -top-1">
                    {token.name === 'shield' && <ShieldIllustration size={48} />}
                    {token.name === 'key'    && <KeyIllustration    size={40} />}
                  </span>
                );
              }

              const wordIdx = WORD_TOKENS.findIndex((wt) => wt === token);
              const total   = WORD_TOKENS.length;
              const start   = wordIdx / total * 0.9;
              const end     = Math.min((wordIdx + 1) / total * 0.9 + 0.05, 1);

              return (
                <WordReveal
                  key={`word-${globalIdx}`}
                  scrollYProgress={scrollYProgress}
                  start={start}
                  end={end}
                  word={token.text}
                />
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

function WordReveal({ scrollYProgress, start, end, word }) {
  // Unrevealed: 0.35 opacity, Revealed: 1.0. Color changes from #111827 (dark gray) to #0A0A0A (black)
  const opacity = useTransform(scrollYProgress, [start, end], [0.35, 1]);
  return (
    <motion.span
      style={{ opacity, color: '#111827' }}
      className="inline-block mr-[0.25em] will-change-[opacity]"
    >
      {word}
    </motion.span>
  );
}
