/**
 * Agnitia Landing — Hero Section
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Clean layout with zero overlapping, rich typography, and interactive verification showcase card.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2, Hash, FileCheck, Lock, Sparkles } from 'lucide-react';
import { HERO } from './content.js';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';

const DEMO_VERDICTS = [
  { label: 'GENUINE', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  { label: 'GENUINE COPY', color: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400' },
  { label: 'ALTERED', color: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  { label: 'FORGED', color: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400' },
];

export default function HeroSection() {
  const containerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const cardScale = useTransform(scrollYProgress, [0, 0.5], [0.96, 1.02]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.4], [0.95, 1]);

  return (
    <section ref={containerRef} className="relative pt-28 pb-20 md:pt-36 md:pb-32 px-4 overflow-hidden">
      {/* Background ambient amber glow */}
      <div
        className="pointer-events-none absolute left-1/2 -top-24 -translate-x-1/2 h-[380px] w-[650px] rounded-full bg-amber-500/10 dark:bg-amber-500/15 blur-[120px]"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-6"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-xs">
            <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
            ECDSA P-256 · SHA-256 · Tamper-Evident Registry
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="landing-headline text-foreground font-display max-w-4xl mx-auto mb-6 tracking-tight"
        >
          {HERO.headline[0]}
          <span className="block mt-1 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent dark:from-amber-400 dark:via-amber-300 dark:to-amber-500">
            {HERO.headline[1]}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-9 leading-relaxed"
        >
          {HERO.sub}
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10"
        >
          <Button asChild size="lg" className="w-full sm:w-auto rounded-full font-semibold px-7 shadow-sm">
            <Link to={HERO.ctaPrimary.to} className="gap-2">
              {HERO.ctaPrimary.label}
              <ArrowRight size={16} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-full font-semibold px-6">
            <Link to={HERO.ctaSecondary.to}>
              {HERO.ctaSecondary.label}
            </Link>
          </Button>
        </motion.div>

        {/* Verdict chips row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-16"
        >
          <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mr-1">
            Deterministic Verdicts:
          </span>
          {DEMO_VERDICTS.map((v) => (
            <span
              key={v.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${v.color}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {v.label}
            </span>
          ))}
        </motion.div>

        {/* Product Showcase Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={prefersReducedMotion ? {} : { scale: cardScale, opacity: cardOpacity }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="relative mx-auto max-w-4xl rounded-2xl md:rounded-3xl border border-border bg-card/90 dark:bg-stone-900/90 shadow-xl overflow-hidden p-6 sm:p-8 md:p-10 text-left backdrop-blur-md"
        >
          {/* Card top banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live Verification Engine · Registry Match
              </span>
            </div>
            <Badge variant="outline" className="font-mono text-[11px] border-primary/30 text-primary gap-1">
              <Lock size={12} /> ECDSA P-256 Validated
            </Badge>
          </div>

          {/* Card body */}
          <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-center">
            {/* Left summary */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold tracking-tight">Verdict: GENUINE</span>
                <span className="text-xs opacity-75">· Confidence: High</span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Degree Certificate #MIT-2024-8841
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Manifest signature matches issuer public key. Cryptographic file hash exactly reproduces the timestamped registry anchor. No pixel alterations detected.
              </p>

              {/* Hash strip */}
              <div className="rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground flex items-center gap-2 overflow-hidden">
                <Hash size={14} className="shrink-0 text-primary" />
                <span className="truncate">a59136c949f1e04838b72e…fa1e275e3f1d0aaf224</span>
              </div>
            </div>

            {/* Right checks list */}
            <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
              {[
                { label: 'File format & PDF structure', ok: true },
                { label: 'SHA-256 content digest match', ok: true },
                { label: 'ECDSA P-256 manifest signature', ok: true },
                { label: 'Registry status: active (not revoked)', ok: true },
                { label: 'OCR field alignment & OCR text diff', ok: true },
                { label: 'Visual heatmap deviation score: 0.00%', ok: true },
              ].map((c, i) => (
                <div key={c.label} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-none">
                  <span className="text-foreground/80 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {c.label}
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">PASS</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
