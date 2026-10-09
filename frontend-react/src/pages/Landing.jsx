import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useVelocity, useAnimationFrame, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import { ArrowRight, ShieldCheck, Menu, X, Activity, Scan, Network } from 'lucide-react';
import Logo from '../components/Logo.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const [loading, setLoading] = useState(!sessionStorage.getItem('visited'));
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => {
        setLoading(false);
        sessionStorage.setItem('visited', '1');
      }, 1500); 
      return () => clearTimeout(t);
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0, 0);

    const onMouseMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      const target = e.target;
      if (target.closest('button') || target.closest('a') || target.closest('.magnetic') || target.closest('.hover-target')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [loading]);

  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="relative bg-bg min-h-screen text-ink overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100]" style={{ backgroundImage: 'url("/noise.svg")', backgroundRepeat: 'repeat' }} />
      <div className="fixed inset-0 bg-graph-paper bg-graph opacity-20 pointer-events-none z-[-1]" />
      
      <motion.div style={{ y: useTransform(scrollY, [0, 1000], [0, 200]) }} className="fixed top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <motion.div style={{ y: useTransform(scrollY, [0, 1000], [0, -300]) }} className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-amber-500 origin-left z-[999]" style={{ scaleX }} />

      <motion.div 
        animate={{ x: cursorPos.x - 12, y: cursorPos.y - 12, scale: isHovering ? 2 : 1, opacity: cursorPos.x < 0 ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
        className="fixed top-0 left-0 w-6 h-6 border border-ink/40 rounded-full pointer-events-none z-[1000] mix-blend-difference hidden md:block"
      />
      <motion.div 
        animate={{ x: cursorPos.x - 2, y: cursorPos.y - 2, opacity: isHovering ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 1000, damping: 40, mass: 0.1 }}
        className="fixed top-0 left-0 w-1 h-1 bg-ink rounded-full pointer-events-none z-[1000] mix-blend-difference hidden md:block"
      />

      <AnimatePresence>
        {loading && <Preloader />}
      </AnimatePresence>

      <Navbar />

      {!loading && (
        <>
          <Hero />
          <InfiniteMarquee scrollY={scrollY} />
          
          <ForensicEvidencePinned />
          
          <HowItWorksPinned />
          
          <BigStatementScrub />
          
          <NumbersSection />

          <section className="text-center py-32 relative z-10 border-t border-line">
            <Logo size={48} className="mx-auto text-ink mb-8" />
            <h2 className="font-display text-4xl sm:text-5xl text-ink tracking-tight mb-6">Ready to establish provenance?</h2>
            <p className="font-mono text-[12px] text-ink-muted mb-10">Issue documents securely or verify instantly without an account.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton><Link to="/verify" className="px-8 py-4 bg-ink text-bg font-mono font-bold text-[11px] uppercase tracking-wider shadow-hard hover:-translate-y-1 transition-transform inline-block">Start Verification</Link></MagneticButton>
              <MagneticButton><Link to="/register" className="px-8 py-4 bg-transparent text-ink border border-ink font-mono font-bold text-[11px] uppercase tracking-wider hover:bg-surface transition-colors inline-block">Register Institution</Link></MagneticButton>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Preloader() {
  return (
    <motion.div 
      initial={{ opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[2000] bg-ink flex items-center justify-center flex-col"
    >
      <div className="relative">
        <motion.div
           initial={{ pathLength: 0, opacity: 0 }}
           animate={{ pathLength: 1, opacity: 1 }}
           transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <Logo size={80} className="text-bg/80" />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, duration: 0.4 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-display text-bg text-xl tracking-[0.2em] whitespace-nowrap"
        >
          EVIDENTIA
        </motion.div>
      </div>
    </motion.div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y > 200 && y > lastY.current && !mobileOpen) setHidden(true);
      else setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpen]);

  return (
    <>
      <motion.nav 
        animate={{ y: hidden ? -100 : 0, padding: scrolled ? '16px 32px' : '24px 48px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 right-0 z-[90] flex items-center justify-between transition-colors duration-300 ${scrolled ? 'bg-surface/80 backdrop-blur-md border-b border-line shadow-sm' : 'bg-transparent'}`}
      >
        <Link to="/" className="flex items-center gap-2 magnetic">
          <Logo size={24} withWord={false} />
          <span className="font-display text-2xl text-ink tracking-wide">EVIDENTIA</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase tracking-widest font-bold text-ink-muted">
          <Link to="/verify" className="hover:text-ink magnetic">Verify Document</Link>
          <Link to="/issuer" className="hover:text-ink magnetic">Issuer Portal</Link>
          <Link to="/login" className="px-5 py-2 border border-line hover:border-ink hover:text-ink hover:bg-surface-2 transition-all magnetic">Login</Link>
        </div>
        <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-ink">
          <Menu size={24} />
        </button>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, y: '-100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[150] bg-surface flex flex-col p-8"
          >
            <div className="flex justify-between items-center mb-16">
               <span className="font-display text-2xl text-ink">EVIDENTIA</span>
               <button onClick={() => setMobileOpen(false)} className="p-2 text-ink"><X size={24} /></button>
            </div>
            <div className="flex flex-col gap-8 font-display text-4xl text-ink">
              <Link onClick={() => setMobileOpen(false)} to="/verify" className="border-b border-line pb-4">Verify Document</Link>
              <Link onClick={() => setMobileOpen(false)} to="/issuer" className="border-b border-line pb-4">Issuer Portal</Link>
              <Link onClick={() => setMobileOpen(false)} to="/login" className="border-b border-line pb-4">Login</Link>
              <Link onClick={() => setMobileOpen(false)} to="/register" className="border-b border-line pb-4">Register</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Hero() {
  const heroRef = useRef(null);
  const certRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
        pin: certRef.current,
        animation: gsap.to(certRef.current, { scale: 0.6, y: '50vh', rotationX: 10, ease: 'none' })
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-[150vh]">
      <section ref={heroRef} className="h-screen flex items-center px-4 sm:px-8 lg:px-16 pt-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full max-w-7xl mx-auto">
          <div className="space-y-8 z-20">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="inline-flex items-center gap-2 border border-ink/20 bg-surface-2 px-3 py-1">
               <ShieldCheck size={14} className="text-amber-600" />
               <span className="font-mono text-[9px] uppercase tracking-widest text-ink font-bold">ECDSA P-256 &middot; SHA-256 &middot; Tamper-Evident Registry</span>
             </motion.div>
             
             <h1 className="font-display text-5xl sm:text-7xl lg:text-[5rem] leading-[1.05] tracking-tight text-ink">
                <div className="overflow-hidden"><motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} className="block">Verify Any</motion.span></div>
                <div className="overflow-hidden"><motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.76, 0, 0.24, 1] }} className="block">Document.</motion.span></div>
                <div className="overflow-hidden relative inline-block">
                  <motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.76, 0, 0.24, 1] }} className="block text-amber-500">Trust Every Verdict.</motion.span>
                  <motion.div 
                     initial={{ x: '-100%' }} animate={{ x: '200%' }} transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
                     className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-overlay"
                  />
                </div>
             </h1>

             <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1 }} className="font-mono text-[11px] sm:text-xs text-ink-muted max-w-lg leading-relaxed">
               Certificates, offer letters and invoices get forwarded around until nobody knows where they came from. Evidentia lets an issuer sign a document once, then lets anyone check it — and explains exactly why it passed or failed.
             </motion.p>

             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex items-center gap-4">
                <MagneticButton>
                  <Link to="/verify" className="px-8 py-4 bg-ink text-bg font-mono font-bold text-[10px] uppercase tracking-wider shadow-hard flex items-center gap-2 hover:-translate-y-1 transition-transform inline-block">
                    Start Verification <ArrowRight size={14} />
                  </Link>
                </MagneticButton>
                <MagneticButton>
                  <Link to="/login" className="px-8 py-4 bg-surface-2 text-ink border border-line font-mono font-bold text-[10px] uppercase tracking-wider hover:bg-surface hover:border-ink transition-colors inline-block">
                    Issuer Login
                  </Link>
                </MagneticButton>
             </motion.div>
          </div>

          <div className="relative w-full h-full min-h-[500px] flex items-center justify-center perspective-[1200px] z-10">
             <div ref={certRef} className="relative w-full max-w-[400px]">
                <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -right-8 top-12 z-20 px-3 py-1.5 border border-verdict-genuine bg-verdict-genuine-bg text-verdict-genuine font-mono text-[9px] uppercase font-bold shadow-hard">GENUINE</motion.div>
                <motion.div animate={{ y: [10, -15, 10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -left-12 bottom-24 z-20 px-3 py-1.5 border border-verdict-forged bg-verdict-forged-bg text-verdict-forged font-mono text-[9px] uppercase font-bold shadow-hard">ALTERED (12%)</motion.div>
                <InteractiveCertificate />
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InteractiveCertificate() {
  const [rotateX, setRotateX] = useState(10);
  const [rotateY, setRotateY] = useState(-15);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRotateX(-((y - rect.height/2) / rect.height) * 20);
    setRotateY(((x - rect.width/2) / rect.width) * 20);
  };

  return (
    <motion.div 
      onMouseMove={handleMouseMove} onMouseLeave={() => { setRotateX(10); setRotateY(-15); }}
      animate={{ rotateX, rotateY }} transition={{ type: "spring", stiffness: 100, damping: 30 }}
      style={{ transformStyle: 'preserve-3d' }}
      className="w-full aspect-[1/1.4] bg-[#FBFAF6] border border-line relative shadow-2xl overflow-hidden cursor-crosshair"
    >
      <div className="absolute inset-2 border-[3px] border-double border-amber-600/30" />
      <motion.div 
        animate={{ y: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent border-b border-amber-500 mix-blend-overlay z-10"
      />
      <div className="relative h-full flex flex-col items-center p-8 text-center">
         <div className="w-16 h-px bg-amber-500 mb-6" />
         <p className="font-display text-2xl text-ink tracking-[0.2em] mb-8">EVIDENTIA</p>
         <div className="w-full h-12 bg-surface-2 border border-line mb-6" />
         <div className="w-3/4 h-4 bg-surface-2 border border-line mb-4" />
         <div className="w-1/2 h-4 bg-surface-2 border border-line mb-12" />
         <motion.div 
            initial={{ scale: 3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ delay: 1.5, type: "spring", stiffness: 200, damping: 15 }}
            className="absolute bottom-16 right-16 w-32 h-32 border-4 border-amber-600 rounded-full flex flex-col items-center justify-center mix-blend-multiply opacity-80 z-20"
         >
           <span className="font-display text-2xl text-amber-600 font-bold uppercase -mb-1">VERIFIED</span>
           <span className="font-mono text-[8px] text-amber-700 tracking-widest uppercase">SECURE REGISTRY</span>
         </motion.div>
      </div>
    </motion.div>
  );
}

function MagneticButton({ children }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width/2);
    const middleY = clientY - (top + height/2);
    setPosition({ x: middleX * 0.1, y: middleY * 0.1 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div 
      ref={ref} onMouseMove={handleMouse} onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }} transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className="magnetic inline-block"
    >
      {children}
    </motion.div>
  );
}

function InfiniteMarquee({ scrollY }) {
  const velocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(velocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });
  const [x, setX] = useState(0);

  useAnimationFrame((t, delta) => {
    let moveBy = -0.5 * (delta / 10);
    moveBy += moveBy * velocityFactor.get();
    let nextX = x + moveBy;
    if (nextX <= -50) nextX = 0; 
    setX(nextX);
  });

  return (
    <div className="border-y border-line bg-surface py-6 overflow-hidden flex whitespace-nowrap relative z-10">
      <motion.div style={{ x: useTransform(() => `${x}%`) }} className="flex items-center gap-16 px-8">
        {[...Array(4)].map((_, i) => (
          <React.Fragment key={i}>
            <span className="font-display text-2xl text-ink">Cryptographic Precision</span>
            <span className="text-amber-500">◆</span>
            <span className="font-mono text-sm text-ink-muted uppercase tracking-widest">Zero-Trust Architecture</span>
            <span className="text-amber-500">◆</span>
            <span className="font-display text-2xl text-ink">Visual Forensics Engine</span>
            <span className="text-amber-500">◆</span>
            <span className="font-mono text-sm text-ink-muted uppercase tracking-widest">Tamper-Evident Ledger</span>
            <span className="text-amber-500">◆</span>
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------
// FORENSIC EVIDENCE (Pinned)
// ----------------------------------------------------
function ForensicEvidencePinned() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=3000",
          scrub: 1,
          pin: true,
        }
      });

      // TEXT SWAPS (3 states)
      tl.to(".f-text-1", { opacity: 0, y: -20, duration: 1 }, 1)
        .fromTo(".f-text-2", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 1)
        .to(".f-text-2", { opacity: 0, y: -20, duration: 1 }, 3)
        .fromTo(".f-text-3", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 3);

      // VISUALS
      tl.to(".f-vis-1", { opacity: 0, scale: 0.95, duration: 1 }, 1)
        .fromTo(".f-vis-2", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1 }, 1)
        .to(".f-vis-2", { opacity: 0, scale: 0.95, duration: 1 }, 3)
        .fromTo(".f-vis-3", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1 }, 3);
        
      // NUMBER
      tl.to(".f-num", { innerHTML: "02/03", duration: 0.1 }, 1.5)
        .to(".f-num", { innerHTML: "03/03", duration: 0.1 }, 3.5);

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="h-screen flex items-center justify-center bg-bg relative z-10 overflow-hidden">
       <div className="absolute top-8 left-8 lg:left-16">
         <span className="font-mono text-xl text-ink font-bold f-num">01/03</span>
       </div>
       <div className="grid lg:grid-cols-2 gap-16 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 items-center">
          {/* TEXT SIDE */}
          <div className="relative h-[200px]">
             <div className="absolute inset-0 f-text-1">
               <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">Verdict Engine</h2>
               <p className="font-mono text-xs text-ink-muted leading-relaxed">We execute a deterministic cryptographic pipeline. File hashes are compared byte-for-byte against the registry. Signatures are verified mathematically. Zero false positives.</p>
             </div>
             <div className="absolute inset-0 f-text-2 opacity-0">
               <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">Live Pipeline</h2>
               <p className="font-mono text-xs text-ink-muted leading-relaxed">Watch the analysis unfold in real time. Our forensic lab console exposes the internal event stream so you understand exactly what checks were run and why they passed.</p>
             </div>
             <div className="absolute inset-0 f-text-3 opacity-0">
               <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">Tamper Heatmap</h2>
               <p className="font-mono text-xs text-ink-muted leading-relaxed">When the cryptographic signature fails, we don't just say "invalid". Our OCR diff engine generates a heatmap showing exactly which pixels and fields were manipulated.</p>
             </div>
          </div>
          
          {/* VISUAL SIDE */}
          <div className="relative h-[400px] bg-surface border border-line shadow-2xl overflow-hidden p-6">
             {/* VISUAL 1: PipelineBars Mock */}
             <div className="absolute inset-0 f-vis-1 p-6 flex flex-col justify-center gap-4">
                <span className="font-mono text-[10px] uppercase text-ink-muted tracking-widest border-b border-line pb-2">Pipeline Diagnostics</span>
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[9px] uppercase">
                       <span>Check {i}</span>
                       <span className="text-verdict-genuine">PASSED</span>
                    </div>
                    <div className="w-full h-1 bg-surface-2"><div className="w-full h-full bg-verdict-genuine" /></div>
                  </div>
                ))}
             </div>
             {/* VISUAL 2: LiveLog Mock */}
             <div className="absolute inset-0 f-vis-2 p-6 bg-ink flex flex-col opacity-0">
                <span className="font-mono text-[10px] uppercase text-bg/50 tracking-widest border-b border-bg/10 pb-2 mb-4">Live Audit Stream</span>
                <div className="flex-1 overflow-hidden space-y-2 font-mono text-[9px] text-amber-500">
                   <p>&gt; initializing verification protocol...</p>
                   <p>&gt; fetching registry manifest 0x4821...</p>
                   <p>&gt; computing SHA-256 baseline... MATCH</p>
                   <p>&gt; verifying ECDSA P-256 signature... OK</p>
                   <p className="animate-pulse">&gt; waiting for heuristics _</p>
                </div>
             </div>
             {/* VISUAL 3: HeatmapOverlay Mock */}
             <div className="absolute inset-0 f-vis-3 opacity-0">
                <div className="absolute inset-0 bg-graph-paper bg-graph opacity-50" />
                <div className="absolute inset-8 border border-line bg-surface flex items-center justify-center">
                   <div className="relative w-3/4 aspect-[1/1.4] bg-bg border border-line shadow-lg p-4">
                      <div className="absolute top-8 left-4 w-32 h-6 bg-rose-500/30 border border-rose-500 animate-pulse" />
                      <div className="absolute bottom-16 right-8 w-16 h-4 bg-rose-500/30 border border-rose-500 animate-pulse" />
                      <div className="absolute top-2 right-2 bg-rose-500 text-bg px-2 py-1 font-mono text-[8px] uppercase">Altered Zones Detected</div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

// ----------------------------------------------------
// HOW IT WORKS (Horizontal Pinned Scroll)
// ----------------------------------------------------
function HowItWorksPinned() {
  const containerRef = useRef(null);
  const scrollWrapperRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const scrollWidth = scrollWrapperRef.current.scrollWidth - window.innerWidth;
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: `+=${scrollWidth * 1.5}`,
          scrub: 1,
          pin: true,
        }
      });

      tl.to(scrollWrapperRef.current, { x: -scrollWidth, ease: "none" })
        .fromTo(lineRef.current, { strokeDashoffset: 1000 }, { strokeDashoffset: 0, ease: "none" }, 0);
        
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="h-screen bg-bg relative z-10 overflow-hidden flex items-center border-t border-line">
      <div className="absolute top-16 left-8 sm:left-16 z-20">
        <h2 className="font-display text-3xl sm:text-4xl text-ink">The Protocol</h2>
      </div>

      <div ref={scrollWrapperRef} className="flex gap-32 px-[10vw] lg:px-[20vw] items-center relative">
        <svg className="absolute top-1/2 left-0 w-[300vw] h-4 -translate-y-1/2 pointer-events-none opacity-20">
          <line ref={lineRef} x1="0" y1="2" x2="100%" y2="2" stroke="#F59E0B" strokeWidth="2" strokeDasharray="1000" />
        </svg>

        <div className="w-[300px] shrink-0 bg-surface border border-line p-8 shadow-hard relative hover-target">
          <div className="absolute -top-8 -left-8 font-display text-6xl text-ink/10">01</div>
          <Scan size={32} className="text-amber-500 mb-6" />
          <h3 className="font-display text-2xl text-ink mb-4">Issuer Signs</h3>
          <p className="font-mono text-[10px] text-ink-muted leading-relaxed">Fields are hashed, a PDF is rendered, and the manifest is signed with ECDSA P-256 within a secure enclave.</p>
        </div>

        <div className="w-[300px] shrink-0 bg-surface border border-line p-8 shadow-hard relative hover-target">
          <div className="absolute -top-8 -left-8 font-display text-6xl text-ink/10">02</div>
          <Network size={32} className="text-amber-500 mb-6" />
          <h3 className="font-display text-2xl text-ink mb-4">Record Stored</h3>
          <p className="font-mono text-[10px] text-ink-muted leading-relaxed">The cryptographic record is persisted in the ledger. A public QR code and unique ID are generated.</p>
        </div>

        <div className="w-[300px] shrink-0 bg-surface border border-line p-8 shadow-hard relative hover-target">
          <div className="absolute -top-8 -left-8 font-display text-6xl text-ink/10">03</div>
          <Activity size={32} className="text-amber-500 mb-6" />
          <h3 className="font-display text-2xl text-ink mb-4">Anyone Verifies</h3>
          <p className="font-mono text-[10px] text-ink-muted leading-relaxed">Verifiers upload the document. The engine instantly computes the hashes and cross-references the ledger.</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// BIG STATEMENT SCRUB
// ----------------------------------------------------
function BigStatementScrub() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray('.bs-word');
      const lines = gsap.utils.toArray('.bs-line');
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top center",
          end: "bottom center",
          scrub: 1,
        }
      });

      tl.to(words, { color: '#14130F', duration: 0.1, stagger: 0.1 })
        .to(lines, { scaleX: 1, duration: 0.5, stagger: 0.3 }, 0.2);

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-bg flex items-center justify-center relative z-10 px-4 py-32">
       <h2 className="font-display text-4xl sm:text-6xl lg:text-[5rem] text-center max-w-5xl leading-[1.2]">
         <span className="bs-word text-ink/20 transition-colors">We </span>
         <span className="bs-word text-ink/20 transition-colors">don't </span>
         <span className="bs-word text-ink/20 transition-colors">rely </span>
         <span className="bs-word text-ink/20 transition-colors">on </span>
         <span className="bs-word text-ink/20 transition-colors">trust. </span>
         <br/>
         <span className="bs-word text-ink/20 transition-colors">We </span>
         <span className="bs-word text-ink/20 transition-colors">rely </span>
         <span className="bs-word text-ink/20 transition-colors">on </span>
         <span className="relative inline-block">
            <span className="bs-word text-ink/20 transition-colors">deterministic</span>
            <div className="bs-line absolute -bottom-2 left-0 right-0 h-2 bg-amber-500 origin-left scale-x-0" />
         </span>
         <span className="bs-word text-ink/20 transition-colors"> cryptography.</span>
       </h2>
    </div>
  );
}

// ----------------------------------------------------
// NUMBERS SECTION
// ----------------------------------------------------
function NumbersSection() {
  return (
    <div className="bg-ink text-bg py-32 relative z-10 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-line/20">
        <NumberStat num="06" label="Core Verifications" />
        <NumberStat num="2.5s" label="Avg. Pipeline Time" />
        <NumberStat num="256" label="Bit Encryption (ECDSA)" />
        <NumberStat num="100%" label="Deterministic Match" />
      </div>
    </div>
  );
}

function NumberStat({ num, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="flex flex-col items-center text-center px-4 overflow-hidden">
      <motion.div 
        initial={{ y: '100%' }} animate={isInView ? { y: 0 } : { y: '100%' }} transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="font-display text-5xl sm:text-7xl lg:text-8xl text-amber-500 mb-4"
      >
        {num}
      </motion.div>
      <motion.div 
        initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 0.3 }}
        className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-bg/60"
      >
        {label}
      </motion.div>
    </div>
  );
}
