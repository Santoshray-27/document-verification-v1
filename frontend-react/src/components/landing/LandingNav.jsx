/**
 * Agnitia Landing — Floating Pill Navbar
 * Solid white pill with soft shadow, active link highlighting via IntersectionObserver.
 * Includes a thin scroll progress bar at the top.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, ArrowRight } from 'lucide-react';
import { NAV_LINKS } from './content.js';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { scrollYProgress } = useScroll();

  // Scroll threshold for pill shrinking
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for active links
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' } // trigger when section is in upper middle
    );

    const sections = NAV_LINKS.map(link => document.querySelector(link.href)).filter(Boolean);
    sections.forEach(s => observer.observe(s));
    
    return () => sections.forEach(s => observer.unobserve(s));
  }, []);

  function scrollTo(href) {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      {/* Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-[#4B0FC4] z-[60] origin-left"
        style={{ scaleX: scrollYProgress, willChange: 'transform' }}
      />
      
      <div className="fixed top-0 left-0 w-full z-50 px-4 transition-all duration-300" style={{ paddingTop: scrolled ? '1rem' : '1.5rem' }}>
        <nav
          className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-full px-5 py-3 transition-all duration-300"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}
          aria-label="Main Navigation"
        >
          {/* Logo */}
          <button onClick={() => scrollTo('#landing-top')} className="flex items-center gap-2 outline-none rounded-md focus-visible:ring-2 focus-visible:ring-[#4B0FC4]">
            <ShieldCheck size={24} className="text-[#4B0FC4]" />
            <span className="landing-font font-bold text-[#0A0A0A] text-lg tracking-tight">Agnitia</span>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1 bg-[#F4F4F5] rounded-full p-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className={`relative px-4 py-1.5 text-sm font-semibold rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#4B0FC4] ${isActive ? 'text-[#0A0A0A]' : 'text-[#4B5563] hover:text-[#0A0A0A]'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-white rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Login / CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-[#4B5563] hover:text-[#0A0A0A] px-3 py-2 outline-none rounded-md focus-visible:ring-2 focus-visible:ring-[#4B0FC4]">
              Log in
            </Link>
            <Link to="/verify" className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#4B0FC4] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4B0FC4]">
              Verify Document
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-[#0A0A0A] outline-none rounded-md focus-visible:ring-2 focus-visible:ring-[#4B0FC4]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="absolute left-4 right-4 top-full mt-2 rounded-[24px] bg-white border border-[#E5E7EB] shadow-xl p-5 md:hidden">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className={`text-left text-base font-medium px-2 py-1 ${activeSection === link.href ? 'text-[#4B0FC4]' : 'text-[#4B5563]'}`}
                >
                  {link.label}
                </button>
              ))}
              <div className="h-[1px] bg-[#E5E7EB] w-full my-2" />
              <Link to="/login" className="text-center font-semibold text-[#4B5563] py-2">
                Log in
              </Link>
              <Link to="/verify" className="flex min-h-[44px] justify-center items-center rounded-full bg-[#4B0FC4] py-3 text-sm font-semibold text-white">
                Verify Document
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
