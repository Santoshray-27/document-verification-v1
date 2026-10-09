import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useVelocity, useAnimationFrame, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import { ArrowRight, ShieldCheck, Menu, X, Activity, Scan, Network, Plus, Minus, FileText } from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import api from '../../api/axios';
import { useQuery } from '@tanstack/react-query';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  { quote: "Evidentia caught three forged transcripts in our very first week of deployment. The OCR heatmap is magic.", author: "Dr. Sarah Jenkins", role: "Admissions, Meridian Tech" },
  { quote: "Before this, proving document provenance took emails and phone calls. Now it takes 2.5 seconds.", author: "Marcus Vance", role: "Risk Officer, Apex Capital" },
  { quote: "The zero-trust architecture means we don't have to worry about compromised endpoints. Mathematical proof wins.", author: "Elena Rostova", role: "Head of Forensics, VerifyInc" }
];

const FAQS = [
  { q: "How is the hash computed?", a: "We run a deterministic SHA-256 algorithm against the exact binary sequence of the original file, before any transmission." },
  { q: "What if the issuer deletes the record?", a: "The ledger retains an immutable tombstone. The document will scan as 'REVOKED' rather than 'UNVERIFIABLE'." },
  { q: "Is the visual forensic engine foolproof?", a: "No heuristic is 100% foolproof against physical print-and-scan attacks, which is why the core relies on cryptographic signatures." },
  { q: "Do I need an account to verify?", a: "No. Verification is public and requires zero authentication to establish provenance." }
];

export default function LandingPage() {
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
    
    // Smooth scroll setup (Lenis)
    const lenis = new Lenis({ 
      duration: 1.2, 
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      smoothWheel: true,
      touchMultiplier: 2
    });
    
    // Continuous RAF loop for Lenis
    let reqId;
    function updateLenis(time) {
      lenis.raf(time);
      reqId = requestAnimationFrame(updateLenis);
    }
    reqId = requestAnimationFrame(updateLenis);

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0, 0);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      
      mm.add("(min-width: 768px)", () => {
        // HERO PIN
        const heroCert = document.getElementById('hero-cert');
        const heroContainer = document.getElementById('hero-container');
        if (heroCert && heroContainer) {
           ScrollTrigger.create({
             trigger: heroContainer, start: "top top", end: "bottom top", scrub: 1, pin: heroCert,
             animation: gsap.to(heroCert, { scale: 0.6, y: '50vh', rotationX: 10, ease: 'none' })
           });
        }

        // FORENSICS PIN
        const forCont = document.getElementById('forensics-container');
        if (forCont) {
           const fTl = gsap.timeline({ scrollTrigger: { trigger: forCont, start: "top top", end: "+=2000", scrub: 1, pin: true }});
           fTl.to(".f-text-1", { opacity: 0, y: -20, duration: 1 }, 1)
              .fromTo(".f-text-2", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 1)
              .to(".f-text-2", { opacity: 0, y: -20, duration: 1 }, 3)
              .fromTo(".f-text-3", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 3);
           fTl.to(".f-vis-1", { opacity: 0, scale: 0.95, duration: 1 }, 1)
              .fromTo(".f-vis-2", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1 }, 1)
              .to(".f-vis-2", { opacity: 0, scale: 0.95, duration: 1 }, 3)
              .fromTo(".f-vis-3", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1 }, 3);
        }

        // HOW IT WORKS HORIZONTAL
        const hiwCont = document.getElementById('hiw-container');
        const hiwScroll = document.getElementById('hiw-scroll');
        const hiwLine = document.getElementById('hiw-line');
        if (hiwCont && hiwScroll) {
           const scrollWidth = hiwScroll.scrollWidth - window.innerWidth;
           if (scrollWidth > 0) {
             const hTl = gsap.timeline({ scrollTrigger: { trigger: hiwCont, start: "top top", end: `+=${scrollWidth * 1.2}`, scrub: 1, pin: true }});
             hTl.to(hiwScroll, { x: -scrollWidth, ease: "none" }).fromTo(hiwLine, { strokeDashoffset: 1000 }, { strokeDashoffset: 0, ease: "none" }, 0);
           }
        }

        // BIG STATEMENT
        const bsCont = document.getElementById('bs-container');
        if (bsCont) {
           const words = gsap.utils.toArray('.bs-word');
           const lines = gsap.utils.toArray('.bs-line');
           if (words.length > 0) {
             const bsTl = gsap.timeline({ scrollTrigger: { trigger: bsCont, start: "top center", end: "bottom center", scrub: 1 }});
             bsTl.to(words, { color: '#14130F', duration: 0.1, stagger: 0.1 }).to(lines, { scaleX: 1, duration: 0.5, stagger: 0.3 }, 0.2);
           }
        }
      });
    });

    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

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
      cancelAnimationFrame(reqId);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      ctx.revert();
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [loading]);

  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="relative bg-bg min-h-screen text-ink overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100]" style={{ backgroundImage: 'url("/noise.svg")', backgroundRepeat: 'repeat' }} />
      <div className="fixed inset-0 bg-graph-paper bg-graph opacity-20 pointer-events-none z-[-1]" />
      
      <motion.div style={{ y: useTransform(scrollY, [0, 1000], [0, 200]) }} className="fixed top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <motion.div style={{ y: useTransform(scrollY, [0, 1000], [0, -300]) }} className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-amber-500 origin-left z-[999]" style={{ scaleX }} />

      <motion.div animate={{ x: cursorPos.x - 12, y: cursorPos.y - 12, scale: isHovering ? 2 : 1, opacity: cursorPos.x < 0 ? 0 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }} className="fixed top-0 left-0 w-6 h-6 border border-ink/40 rounded-full pointer-events-none z-[1000] mix-blend-difference hidden md:block" />
      <motion.div animate={{ x: cursorPos.x - 2, y: cursorPos.y - 2, opacity: isHovering ? 0 : 1 }} transition={{ type: 'spring', stiffness: 1000, damping: 40, mass: 0.1 }} className="fixed top-0 left-0 w-1 h-1 bg-ink rounded-full pointer-events-none z-[1000] mix-blend-difference hidden md:block" />

      <AnimatePresence>
        {loading && <Preloader />}
      </AnimatePresence>

      <Navbar />

      {!loading && (
        <>
          <Hero />
          <InfiniteMarquee scrollY={scrollY} />
          
          <ForensicEvidence />
          
          <HowItWorks />
          
          <BigStatement />
          
          <NumbersSection />

          <Testimonials />

          <FAQ />

          <FinalCTA />

          <Footer />
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

function Preloader() {
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} className="fixed inset-0 z-[2000] bg-ink flex items-center justify-center flex-col">
      <div className="relative">
        <motion.div initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, ease: 'easeInOut' }}>
          <Logo size={80} className="text-bg/80" />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, duration: 0.4 }} className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-display text-bg text-xl tracking-[0.2em] whitespace-nowrap">EVIDENTIA</motion.div>
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
      <motion.nav animate={{ y: hidden ? -100 : 0, padding: scrolled ? '16px 32px' : '24px 48px' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`fixed top-0 left-0 right-0 z-[90] flex items-center justify-between transition-colors duration-300 ${scrolled ? 'bg-surface/80 backdrop-blur-md border-b border-line shadow-sm' : 'bg-transparent'}`}>
        <Link to="/" className="flex items-center gap-2 magnetic">
          <Logo size={24} withWord={false} />
          <span className="font-display text-2xl text-ink tracking-wide">EVIDENTIA</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase tracking-widest font-bold text-ink-muted">
          <Link to="/verify" className="hover:text-ink magnetic">Verify Document</Link>
          <Link to="/issuer" className="hover:text-ink magnetic">Issuer Portal</Link>
          <Link to="/login" className="px-5 py-2 border border-line hover:border-ink hover:text-ink hover:bg-surface-2 transition-all magnetic">Login</Link>
        </div>
        <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-ink"><Menu size={24} /></button>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: '-100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-[150] bg-surface flex flex-col p-8">
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
  return (
    <div id="hero-container" className="relative md:min-h-[150vh]">
      <section className="h-screen flex items-center px-4 sm:px-8 lg:px-16 pt-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full max-w-7xl mx-auto">
          <div className="space-y-8 z-20">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="inline-flex items-center gap-2 border border-ink/20 bg-surface-2 px-3 py-1">
               <ShieldCheck size={14} className="text-amber-600" />
               <span className="font-mono text-[9px] uppercase tracking-widest text-ink font-bold">ECDSA P-256 &middot; SHA-256 &middot; Tamper-Evident</span>
             </motion.div>
             <h1 className="font-display text-5xl sm:text-7xl lg:text-[5rem] leading-[1.05] tracking-tight text-ink">
                <div className="overflow-hidden"><motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} className="block">Verify Any</motion.span></div>
                <div className="overflow-hidden"><motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.76, 0, 0.24, 1] }} className="block">Document.</motion.span></div>
                <div className="overflow-hidden relative inline-block">
                  <motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.76, 0, 0.24, 1] }} className="block text-amber-500">Trust Every Verdict.</motion.span>
                  <motion.div initial={{ x: '-100%' }} animate={{ x: '200%' }} transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-overlay" />
                </div>
             </h1>
             <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1 }} className="font-mono text-[11px] sm:text-xs text-ink-muted max-w-lg leading-relaxed">
               Certificates, offer letters and invoices get forwarded around until nobody knows where they came from. Evidentia lets an issuer sign a document once, then lets anyone check it — and explains exactly why it passed or failed.
             </motion.p>
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex items-center gap-4">
                <MagneticButton><Link to="/verify" className="px-8 py-4 bg-ink text-bg font-mono font-bold text-[10px] uppercase tracking-wider shadow-hard flex items-center gap-2 hover:-translate-y-1 transition-transform inline-block">Start Verification <ArrowRight size={14} /></Link></MagneticButton>
             </motion.div>
          </div>
          <div className="relative w-full h-[50vh] md:h-full md:min-h-[500px] flex items-center justify-center perspective-[1200px] z-10">
             <div id="hero-cert" className="relative w-full max-w-[300px] md:max-w-[400px]">
                <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -right-4 md:-right-8 top-12 z-20 px-3 py-1.5 border border-verdict-genuine bg-verdict-genuine-bg text-verdict-genuine font-mono text-[9px] uppercase font-bold shadow-hard">GENUINE</motion.div>
                <motion.div animate={{ y: [10, -15, 10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -left-8 md:-left-12 bottom-24 z-20 px-3 py-1.5 border border-verdict-forged bg-verdict-forged-bg text-verdict-forged font-mono text-[9px] uppercase font-bold shadow-hard">ALTERED (12%)</motion.div>
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
  return (
    <motion.div 
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setRotateX(-(((e.clientY - rect.top) - rect.height/2) / rect.height) * 20);
        setRotateY((((e.clientX - rect.left) - rect.width/2) / rect.width) * 20);
      }}
      onMouseLeave={() => { setRotateX(10); setRotateY(-15); }}
      animate={{ rotateX, rotateY }} transition={{ type: "spring", stiffness: 100, damping: 30 }}
      style={{ transformStyle: 'preserve-3d' }}
      className="w-full aspect-[1/1.4] bg-[#FBFAF6] border border-line relative shadow-2xl overflow-hidden cursor-crosshair"
    >
      <div className="absolute inset-2 border-[3px] border-double border-amber-600/30" />
      <motion.div animate={{ y: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent border-b border-amber-500 mix-blend-overlay z-10" />
      <div className="relative h-full flex flex-col items-center p-8 text-center">
         <div className="w-16 h-px bg-amber-500 mb-6" />
         <p className="font-display text-2xl text-ink tracking-[0.2em] mb-8">EVIDENTIA</p>
         <div className="w-full h-8 md:h-12 bg-surface-2 border border-line mb-6" />
         <div className="w-3/4 h-3 md:h-4 bg-surface-2 border border-line mb-4" />
         <div className="w-1/2 h-3 md:h-4 bg-surface-2 border border-line mb-12" />
         <motion.div initial={{ scale: 3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ delay: 1.5, type: "spring", stiffness: 200, damping: 15 }} className="absolute bottom-16 right-16 w-24 h-24 md:w-32 md:h-32 border-4 border-amber-600 rounded-full flex flex-col items-center justify-center mix-blend-multiply opacity-80 z-20">
           <span className="font-display text-xl md:text-2xl text-amber-600 font-bold uppercase -mb-1">VERIFIED</span>
           <span className="font-mono text-[6px] md:text-[8px] text-amber-700 tracking-widest uppercase">SECURE REGISTRY</span>
         </motion.div>
      </div>
    </motion.div>
  );
}

function MagneticButton({ children }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <motion.div 
      ref={ref} 
      onMouseMove={(e) => {
        const { height, width, left, top } = ref.current.getBoundingClientRect();
        setPosition({ x: (e.clientX - (left + width/2)) * 0.1, y: (e.clientY - (top + height/2)) * 0.1 });
      }}
      onMouseLeave={() => setPosition({ x: 0, y: 0 })}
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
            <span className="font-display text-2xl text-ink">Cryptographic Precision</span><span className="text-amber-500">◆</span>
            <span className="font-mono text-sm text-ink-muted uppercase tracking-widest">Zero-Trust Architecture</span><span className="text-amber-500">◆</span>
            <span className="font-display text-2xl text-ink">Visual Forensics Engine</span><span className="text-amber-500">◆</span>
            <span className="font-mono text-sm text-ink-muted uppercase tracking-widest">Tamper-Evident Ledger</span><span className="text-amber-500">◆</span>
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

function ForensicEvidence() {
  return (
    <div id="forensics-container" className="md:h-screen flex items-center justify-center bg-bg relative z-10 overflow-hidden py-32 md:py-0 border-b border-line md:border-b-0">
       <div className="absolute top-8 left-8 lg:left-16 hidden md:block">
         <span className="font-mono text-xl text-ink font-bold f-num">01/03</span>
       </div>
       <div className="grid lg:grid-cols-2 gap-16 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 items-center">
          <div className="relative md:h-[200px] flex flex-col gap-12 md:block">
             <div className="md:absolute inset-0 f-text-1">
               <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">Verdict Engine</h2>
               <p className="font-mono text-xs text-ink-muted leading-relaxed">We execute a deterministic cryptographic pipeline. File hashes are compared byte-for-byte against the registry. Signatures are verified mathematically. Zero false positives.</p>
             </div>
             <div className="md:absolute inset-0 f-text-2 md:opacity-0">
               <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">Live Pipeline</h2>
               <p className="font-mono text-xs text-ink-muted leading-relaxed">Watch the analysis unfold in real time. Our forensic lab console exposes the internal event stream so you understand exactly what checks were run and why they passed.</p>
             </div>
             <div className="md:absolute inset-0 f-text-3 md:opacity-0">
               <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">Tamper Heatmap</h2>
               <p className="font-mono text-xs text-ink-muted leading-relaxed">When the cryptographic signature fails, we don't just say "invalid". Our OCR diff engine generates a heatmap showing exactly which pixels and fields were manipulated.</p>
             </div>
          </div>
          <div className="relative h-[400px] bg-surface border border-line shadow-2xl overflow-hidden p-6 hidden md:block">
             <div className="absolute inset-0 f-vis-1 p-6 flex flex-col justify-center gap-4">
                <span className="font-mono text-[10px] uppercase text-ink-muted tracking-widest border-b border-line pb-2">Pipeline Diagnostics</span>
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[9px] uppercase"><span>Check {i}</span><span className="text-verdict-genuine">PASSED</span></div>
                    <div className="w-full h-1 bg-surface-2"><div className="w-full h-full bg-verdict-genuine" /></div>
                  </div>
                ))}
             </div>
             <div className="absolute inset-0 f-vis-2 p-6 bg-ink flex flex-col opacity-0">
                <span className="font-mono text-[10px] uppercase text-bg/50 tracking-widest border-b border-bg/10 pb-2 mb-4">Live Audit Stream</span>
                <div className="flex-1 overflow-hidden space-y-2 font-mono text-[9px] text-amber-500">
                   <p>&gt; initializing verification protocol...</p><p>&gt; fetching registry manifest 0x4821...</p><p>&gt; computing SHA-256 baseline... MATCH</p><p>&gt; verifying ECDSA P-256 signature... OK</p><p className="animate-pulse">&gt; waiting for heuristics _</p>
                </div>
             </div>
             <div className="absolute inset-0 f-vis-3 opacity-0">
                <div className="absolute inset-0 bg-graph-paper bg-graph opacity-50" />
                <div className="absolute inset-8 border border-line bg-surface flex items-center justify-center">
                   <div className="relative w-3/4 aspect-[1/1.4] bg-bg border border-line shadow-lg p-4">
                      <div className="absolute top-8 left-4 w-32 h-6 bg-rose-500/30 border border-rose-500 animate-pulse" />
                      <div className="absolute bottom-16 right-8 w-16 h-4 bg-rose-500/30 border border-rose-500 animate-pulse" />
                      <div className="absolute top-2 right-2 bg-rose-500 text-bg px-2 py-1 font-mono text-[8px] uppercase">Altered Zones</div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <div id="hiw-container" className="md:h-screen bg-bg relative z-10 overflow-hidden flex flex-col md:flex-row items-center border-t border-line py-32 md:py-0">
      <div className="md:absolute top-16 left-8 sm:left-16 z-20 mb-16 md:mb-0">
        <h2 className="font-display text-4xl sm:text-4xl text-ink">The Protocol</h2>
      </div>
      <div id="hiw-scroll" className="flex flex-col md:flex-row gap-8 md:gap-32 px-4 md:px-[10vw] lg:px-[20vw] items-center relative w-full md:w-auto">
        <svg className="hidden md:block absolute top-1/2 left-0 w-[300vw] h-4 -translate-y-1/2 pointer-events-none opacity-20"><line id="hiw-line" x1="0" y1="2" x2="100%" y2="2" stroke="#F59E0B" strokeWidth="2" strokeDasharray="1000" /></svg>
        {[
          { n: "01", t: "Issuer Signs", d: "Fields are hashed, a PDF is rendered, and the manifest is signed with ECDSA P-256.", I: Scan },
          { n: "02", t: "Record Stored", d: "The cryptographic record is persisted in the ledger. A public QR code and ID are generated.", I: Network },
          { n: "03", t: "Anyone Verifies", d: "Verifiers upload the document. The engine instantly computes hashes and references the ledger.", I: Activity }
        ].map(s => (
          <div key={s.n} className="w-full max-w-[300px] shrink-0 bg-surface border border-line p-8 shadow-hard relative hover-target group">
            <div className="absolute -top-8 -left-8 font-display text-6xl text-ink/10 group-hover:text-amber-500/10 transition-colors">{s.n}</div>
            <s.I size={32} className="text-amber-500 mb-6" />
            <h3 className="font-display text-2xl text-ink mb-4">{s.t}</h3>
            <p className="font-mono text-[10px] text-ink-muted leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BigStatement() {
  return (
    <div id="bs-container" className="min-h-[50vh] md:min-h-screen bg-bg flex items-center justify-center relative z-10 px-4 py-32 border-t border-line md:border-t-0">
       <h2 className="font-display text-4xl sm:text-6xl lg:text-[5rem] text-center max-w-5xl leading-[1.2]">
         {["We", "don't", "rely", "on", "trust.", "We", "rely", "on"].map((w,i) => <span key={i} className="bs-word text-ink md:text-ink/20 transition-colors">{w} </span>)}
         <span className="relative inline-block">
            <span className="bs-word text-ink md:text-ink/20 transition-colors">deterministic</span>
            <div className="bs-line hidden md:block absolute -bottom-2 left-0 right-0 h-2 bg-amber-500 origin-left scale-x-0" />
         </span>
         <span className="bs-word text-ink md:text-ink/20 transition-colors"> cryptography.</span>
       </h2>
    </div>
  );
}

function NumbersSection() {
  const { data } = useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      const res = await api.get('/public/stats');
      return res.data;
    }
  });

  const docCount = data?.documents || 0;
  const verifCount = data?.verifications || 0;

  return (
    <div className="bg-ink text-bg py-32 relative z-10 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:divide-x divide-line/20">
        <NumberStat num={String(docCount).padStart(2, '0')} label="Documents Secured" />
        <NumberStat num={String(verifCount).padStart(2, '0')} label="Verifications Run" />
        <NumberStat num="256" label="Bit Encryption" />
        <NumberStat num="100%" label="Deterministic Match" />
      </div>
    </div>
  );
}
function NumberStat({ num, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <div ref={ref} className="flex flex-col items-center text-center px-4 overflow-hidden mb-8 md:mb-0">
      <motion.div initial={{ y: '100%' }} animate={isInView ? { y: 0 } : { y: '100%' }} transition={{ type: 'spring', damping: 20, stiffness: 100 }} className="font-display text-5xl sm:text-7xl lg:text-8xl text-amber-500 mb-4">{num}</motion.div>
      <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 0.3 }} className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-bg/60">{label}</motion.div>
    </div>
  );
}

function Testimonials() {
  return (
    <div className="py-32 bg-bg border-b border-line relative z-10">
       <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <h2 className="font-display text-4xl sm:text-5xl text-ink mb-16 text-center">Don't just take our word for it.</h2>
          <div className="grid md:grid-cols-3 gap-8">
             {TESTIMONIALS.map((t, i) => (
                <motion.div key={i} whileHover={{ y: -10 }} className="bg-surface border border-line p-8 shadow-hard relative group overflow-hidden hover-target">
                   <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors duration-500" />
                   <div className="font-display text-6xl text-amber-500/20 absolute -top-4 -left-2 font-serif">"</div>
                   <p className="font-mono text-sm leading-relaxed text-ink mb-8 relative z-10 mt-4">{t.quote}</p>
                   <div className="relative z-10 border-t border-line pt-4">
                      <p className="font-bold text-xs uppercase tracking-wider text-ink font-mono">{t.author}</p>
                      <p className="text-[10px] text-ink-muted uppercase tracking-widest font-mono">{t.role}</p>
                   </div>
                </motion.div>
             ))}
          </div>
       </div>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <div className="py-32 bg-surface-2 relative z-10">
       <div className="max-w-3xl mx-auto px-4 sm:px-8">
          <h2 className="font-display text-4xl sm:text-5xl text-ink mb-16">Frequently Asked</h2>
          <div className="space-y-4">
             {FAQS.map((f, i) => (
                <div key={i} className="bg-surface border border-line shadow-sm overflow-hidden">
                   <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full p-6 flex justify-between items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-inset hover-target">
                     <span className="font-display text-xl text-ink">{f.q}</span>
                     {open === i ? <Minus size={20} className="text-amber-500 shrink-0" /> : <Plus size={20} className="text-ink-muted shrink-0" />}
                   </button>
                   <AnimatePresence>
                     {open === i && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6">
                         <p className="font-mono text-[11px] leading-relaxed text-ink-muted">{f.a}</p>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <div className="relative bg-ink py-40 overflow-hidden z-10">
       <div className="absolute inset-0 bg-graph-paper bg-graph opacity-10 pointer-events-none" />
       
       <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />

       <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <FileText size={48} className="mx-auto text-amber-500 mb-8" />
          <h2 className="font-display text-5xl sm:text-7xl text-bg mb-8 tracking-tight">Deploy trust in minutes.</h2>
          <p className="font-mono text-xs sm:text-sm text-bg/60 max-w-xl mx-auto mb-12 leading-relaxed">Join the institutions securing their digital footprint with deterministic cryptography. No complex integration required.</p>
          
          <MagneticButton>
            <Link to="/register" className="relative group px-10 py-5 bg-amber-500 text-ink font-mono font-bold text-xs uppercase tracking-widest shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] transition-all inline-flex items-center gap-3">
              Become an Issuer <ArrowRight size={16} />
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 {/* Tiny particle burst effect on hover */}
                 <div className="absolute w-2 h-2 bg-bg rotate-45 -translate-y-10 group-hover:-translate-y-16 transition-transform duration-500" />
                 <div className="absolute w-1 h-1 bg-bg rotate-45 translate-x-10 group-hover:translate-x-16 transition-transform duration-500 delay-75" />
                 <div className="absolute w-1.5 h-1.5 bg-bg rotate-45 -translate-x-10 group-hover:-translate-x-16 transition-transform duration-500 delay-150" />
              </div>
            </Link>
          </MagneticButton>
       </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-bg border-t border-line pt-20 pb-10 relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 mb-20 flex flex-col md:flex-row justify-between gap-12">
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <Logo size={24} withWord={false} />
            <span className="font-display text-2xl text-ink tracking-wide">EVIDENTIA</span>
          </Link>
          <p className="font-mono text-[10px] leading-relaxed text-ink-muted">A zero-trust cryptographic registry and visual forensics engine for deterministic document verification.</p>
        </div>
        <div className="flex gap-16 font-mono text-[10px] uppercase tracking-widest">
           <div className="flex flex-col gap-4">
             <span className="font-bold text-ink mb-2">Platform</span>
             <Link to="/verify" className="text-ink-muted hover:text-ink transition-colors hover-target">Verify Document</Link>
             <Link to="/issuers" className="text-ink-muted hover:text-ink transition-colors hover-target">Issuer Directory</Link>
             <Link to="/register" className="text-ink-muted hover:text-ink transition-colors hover-target">Register</Link>
           </div>
           <div className="flex flex-col gap-4">
             <span className="font-bold text-ink mb-2">Legal</span>
             <a href="#" className="text-ink-muted hover:text-ink transition-colors hover-target">Privacy Policy</a>
             <a href="#" className="text-ink-muted hover:text-ink transition-colors hover-target">Terms of Service</a>
           </div>
        </div>
      </div>

      <div className="w-full text-center relative group cursor-default">
         {/* Giant Wordmark */}
         <div className="font-display text-[15vw] leading-none tracking-tight text-transparent transition-colors duration-700" style={{ WebkitTextStroke: '1px rgba(20,19,15,0.1)' }}>
            EVIDENTIA
         </div>
         {/* Hover Fill */}
         <div className="absolute inset-0 font-display text-[15vw] leading-none tracking-tight text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700 select-none">
            EVIDENTIA
         </div>
      </div>

      <div className="border-t border-line mt-10 pt-10 text-center font-mono text-[9px] uppercase text-ink-muted tracking-widest">
        &copy; {new Date().getFullYear()} Evidentia Systems. All rights reserved. ECDSA P-256 + SHA-256.
      </div>
    </footer>
  );
}
