/**
 * Evidentia Landing — Statement Text Reveal
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Words fade in word-by-word as user scrolls.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { STATEMENT } from './content.js';
import { ShieldIllustration, KeyIllustration } from './Illustrations.jsx';

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

  if (prefersReducedMotion || (typeof window !== 'undefined' && window.innerWidth < 768)) {
    return (
      <section className="py-24 px-4 bg-background border-t border-border/50">
        <div className="max-w-[960px] mx-auto text-center">
          <p className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold text-foreground leading-[1.2] tracking-tight">
            {TOKENS.map((token, globalIdx) => {
              if (token.type === 'icon') {
                return (
                  <span key={`icon-${globalIdx}`} className="inline-block align-middle mx-3 relative -top-1">
                    {token.name === 'shield' && <ShieldIllustration size={44} />}
                    {token.name === 'key'    && <KeyIllustration    size={38} />}
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
      className="relative bg-background border-t border-border/50"
      style={{ height: '140vh' }}
      aria-label="Mission statement"
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 md:px-12">
        <div className="max-w-[960px] mx-auto text-center">
          <p className="text-[clamp(2rem,4.5vw,3.8rem)] font-display font-bold leading-[1.2] tracking-tight text-foreground" aria-label={STATEMENT.words}>
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
  const opacity = useTransform(scrollYProgress, [start, end], [0.25, 1]);
  return (
    <motion.span
      style={{ opacity }}
      className="inline-block mr-[0.25em] text-foreground will-change-[opacity]"
    >
      {word}
    </motion.span>
  );
}
