/**
 * Agnitia Landing — CTA Card + Footer
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Warm amber/stone card with floating illustration, then clean footer.
 */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Github, Twitter, Linkedin, ShieldCheck } from 'lucide-react';
import { CTA_SECTION, FOOTER_LINKS } from './content.js';
import { DocumentIllustration } from './Illustrations.jsx';
import { Button } from '../ui/button.jsx';

function scrollTo(href) {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function CTAFooter() {
  const floatRef = useRef(null);
  const isInView = useInView(floatRef, { margin: "100px" });

  return (
    <section
      id="contact"
      className="px-4 pt-8 pb-16 bg-background border-t border-border/50"
      aria-label="Call to action and footer"
    >
      <div className="max-w-5xl mx-auto">
        {/* ── CTA card ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
          className="relative rounded-3xl overflow-hidden px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-10 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 text-stone-50 border border-amber-500/20 shadow-2xl"
        >
          {/* subtle amber gradient glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />

          {/* text */}
          <div className="relative z-10 max-w-lg">
            <h2 className="text-stone-50 font-display font-bold text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight">
              {CTA_SECTION.heading}
            </h2>
            <p className="mt-3 text-stone-300 text-sm sm:text-base leading-relaxed">
              {CTA_SECTION.sub}
            </p>
            <div className="mt-7">
              <Button asChild size="lg" className="rounded-full font-semibold px-7 shadow-sm">
                <Link to={CTA_SECTION.btn.to} className="gap-2">
                  {CTA_SECTION.btn.label} <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>

          {/* floating illustration */}
          <div
            ref={floatRef}
            className="relative z-10 hidden md:block"
            style={{ 
              animation: isInView ? 'float 5s ease-in-out infinite' : 'none',
              willChange: 'transform'
            }}
          >
            <div className="relative">
              <DocumentIllustration size={110} className="drop-shadow-2xl" />
              <div className="absolute inset-0 -m-6 rounded-full border border-amber-500/20 pointer-events-none" aria-hidden="true" />
              <div className="absolute inset-0 -m-12 rounded-full border border-amber-500/10 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* logo + tagline */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/25">
                  <ShieldCheck size={16} />
                </div>
                <span className="font-display font-bold text-foreground text-lg tracking-tight">Agnitia</span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
                Secure Digital Document Verification. Proof in Every Pixel.
              </p>
            </div>

            {/* nav links */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer navigation">
              {FOOTER_LINKS.map((l) => (
                <button
                  key={l.label}
                  onClick={() => scrollTo(l.href)}
                  className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </button>
              ))}
            </nav>

            {/* social icons */}
            <div className="flex items-center gap-2.5">
              <a href="#" aria-label="GitHub" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all">
                <Github size={15} />
              </a>
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all">
                <Twitter size={15} />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all">
                <Linkedin size={15} />
              </a>
            </div>
          </div>

          {/* bottom row */}
          <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Agnitia. Deterministic cryptographic verification.
            </p>
            <div className="flex gap-5">
              <Link to="/verify" className="text-primary font-semibold hover:underline">Verify a Document</Link>
              <Link to="/login"  className="hover:text-foreground transition-colors">Issuer Login</Link>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
