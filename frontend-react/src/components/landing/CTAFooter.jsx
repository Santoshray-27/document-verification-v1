/**
 * Agnitia Landing — CTA Card + Footer
 * Periwinkle rounded card with floating illustration, then a footer row.
 */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Github, Twitter, Linkedin, ShieldCheck } from 'lucide-react';
import { CTA_SECTION, FOOTER_LINKS } from './content.js';
import { DocumentIllustration } from './Illustrations.jsx';

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
      className="px-4 pt-8 pb-16 bg-white"
      aria-label="Call to action and footer"
      style={{ contain: 'layout paint' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* ── CTA card ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
          className="relative rounded-[32px] overflow-hidden px-8 py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-10"
          style={{ background: 'linear-gradient(135deg, #6E86E8 0%, #4B0FC4 100%)' }}
        >
          {/* text */}
          <div className="relative z-10 max-w-md">
            <h2 className="text-white font-bold text-3xl md:text-[40px] leading-tight tracking-tight">
              {CTA_SECTION.heading}
            </h2>
            <p className="mt-4 text-white/90 text-[16px] leading-relaxed font-medium">{CTA_SECTION.sub}</p>
            <Link
              to={CTA_SECTION.btn.to}
              className="mt-8 inline-flex items-center gap-2 border-2 border-white text-white font-bold text-sm px-8 py-3.5 rounded-full hover:bg-white hover:text-[#4B0FC4] transition-all duration-200 min-h-[44px]"
            >
              {CTA_SECTION.btn.label} <ArrowRight size={16} />
            </Link>
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
              <DocumentIllustration size={120} className="drop-shadow-2xl" />
              {/* orbit rings */}
              <div className="absolute inset-0 -m-8 rounded-full border border-white/20 pointer-events-none" aria-hidden="true" />
              <div className="absolute inset-0 -m-16 rounded-full border border-white/10 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <footer className="mt-16 pt-8 border-t border-[#E5E7EB]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* logo + tagline */}
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={24} className="text-[#4B0FC4]" />
                <span className="landing-font font-bold text-[#0A0A0A] text-xl tracking-tight">Agnitia</span>
              </div>
              <p className="mt-2 text-[14px] text-[#4B5563] max-w-xs leading-relaxed">
                Secure Digital Document Verification. Proof in Every Pixel.
              </p>
            </div>

            {/* nav links */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer navigation">
              {FOOTER_LINKS.map((l) => (
                <button
                  key={l.label}
                  onClick={() => scrollTo(l.href)}
                  className="text-[14px] font-medium text-[#4B5563] hover:text-[#4B0FC4] transition-colors"
                >
                  {l.label}
                </button>
              ))}
            </nav>

            {/* social icons (cosmetic) */}
            <div className="flex items-center gap-3">
              <a href="#" aria-label="GitHub" className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#4B5563] hover:bg-[#4B0FC4] hover:text-white transition-all">
                <Github size={18} />
              </a>
              <a href="#" aria-label="Twitter" className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#4B5563] hover:bg-[#4B0FC4] hover:text-white transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#4B5563] hover:bg-[#4B0FC4] hover:text-white transition-all">
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {/* bottom row */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-[#6B7280]">
              © {new Date().getFullYear()} Agnitia. MIT License. Not a legal certificate of authenticity.
            </p>
            <div className="flex gap-6">
              <Link to="/verify" className="text-[14px] text-[#4B0FC4] font-semibold hover:underline">Verify a Document</Link>
              <Link to="/login"  className="text-[14px] font-medium text-[#4B5563] hover:text-[#4B0FC4] transition-colors">Log in</Link>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
