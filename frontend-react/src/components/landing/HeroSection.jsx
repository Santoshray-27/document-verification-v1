/**
 * Agnitia Landing — Hero Section
 * Optimized for performance: no blurred filters, simplified animations, smaller scroll height.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, FileCheck2, ShieldCheck, Fingerprint } from 'lucide-react';
import { HERO } from './content.js';

export default function HeroSection() {
  const containerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Scale from 0.85 to 1.0, and clip-path inset to reveal full bleed
  const cardScale = useTransform(scrollYProgress, [0, 0.6], [0.85, 1]);
  
  // Clip path animates from a rounded inset card to a full bleed rectangle
  const cardClipPath = useTransform(
    scrollYProgress, 
    [0, 0.6], 
    ['inset(0% 5% 0% 5% round 32px)', 'inset(0% 0% 0% 0% round 0px)']
  );

  const heroContentOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroContentY = useTransform(scrollYProgress, [0, 0.15], [0, -40]);

  // If reduced motion, just use normal static layout without pinned scroll
  if (prefersReducedMotion || window.innerWidth < 768) {
    return (
      <section className="relative pt-32 pb-24 px-4 bg-[#FAFAFA]" style={{ contain: 'layout paint' }}>
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="landing-headline text-[#0A0A0A] mb-6">
            {HERO.headline[0]}
            <span className="block mt-2 text-[#4B0FC4]">{HERO.headline[1]}</span>
          </h1>
          <p className="text-lg md:text-xl text-[#4B5563] max-w-2xl mx-auto mb-10">
            {HERO.sub}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={HERO.ctaPrimary.to} className="w-full sm:w-auto px-8 py-3.5 bg-[#4B0FC4] hover:bg-[#5B14F0] text-white rounded-full font-semibold transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg min-h-[44px]">
              {HERO.ctaPrimary.label} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden aspect-video bg-[#4B0FC4] p-8 flex items-center justify-center">
             <div className="text-white text-center">
               <h2 className="text-3xl font-bold mb-4">Secured by Agnitia</h2>
               <p className="text-white/80">Premium cryptographic document verification</p>
             </div>
        </div>
      </section>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ height: '220vh', contain: 'layout paint' }}>
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col items-center justify-between pt-24 md:pt-32" style={{ willChange: 'transform' }}>
        
        {/* Main Headline (fades out as you scroll) */}
        <motion.div 
          className="relative z-10 text-center w-full max-w-5xl px-4 shrink-0"
          style={{ opacity: heroContentOpacity, y: heroContentY }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="landing-headline text-[#0A0A0A] mb-6">
              {HERO.headline[0]}
              <span className="block mt-2 text-[#4B0FC4]">{HERO.headline[1]}</span>
            </h1>
            <p className="text-lg md:text-xl text-[#4B5563] max-w-2xl mx-auto mb-8">
              {HERO.sub}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={HERO.ctaPrimary.to} className="w-full sm:w-auto px-8 py-3.5 bg-[#4B0FC4] hover:bg-[#5B14F0] text-white rounded-full font-semibold transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg min-h-[44px]">
                {HERO.ctaPrimary.label} <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Violet expanding card */}
        <motion.div 
          className="relative w-full h-[55vh] md:h-[60vh] bg-[#4B0FC4] origin-bottom overflow-hidden flex items-center justify-center shrink-0 mt-8"
          style={{ 
            scale: cardScale,
            clipPath: cardClipPath
          }}
        >
           {/* Abstract shapes inside card */}
           <StaticFloatBox icon={ShieldCheck} top="15%" left="15%" size={80} delay="0s" />
           <StaticFloatBox icon={FileCheck2} top="60%" left="80%" size={100} delay="2s" />
           <StaticFloatBox icon={Fingerprint} top="20%" left="75%" size={70} delay="1s" />
           
           <div className="relative z-10 text-white text-center px-4 max-w-3xl">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">Proof in Every Pixel</h2>
              <p className="text-lg md:text-xl text-white/80">Experience military-grade document authentication.</p>
           </div>
        </motion.div>
      </div>
    </div>
  );
}

// Float box using pure CSS keyframes if in view
function StaticFloatBox({ icon: Icon, top, left, size, delay }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "0px" });
  
  return (
    <div 
      ref={ref}
      className="absolute rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/50"
      style={{ 
        top, left, width: size, height: size,
        animation: isInView ? `float 6s ease-in-out infinite alternate ${delay}` : 'none'
      }}
    >
      <Icon size={size * 0.4} />
    </div>
  );
}
