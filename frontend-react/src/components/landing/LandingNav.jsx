/**
 * Evidentia Landing — Floating Pill Navbar
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 * Features active link highlighting, scroll progress, and theme switcher (light/dark).
 */
import { useEffect, useState } from 'react';
import { motion, useScroll } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';
import { NAV_LINKS } from './content.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Button } from '../ui/button.jsx';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { scrollYProgress } = useScroll();
  const { theme, toggleTheme } = useTheme();

  // Scroll threshold for pill shrinking
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
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
      { rootMargin: '-20% 0px -60% 0px' }
    );

    const sections = NAV_LINKS.map(link => document.querySelector(link.href)).filter(Boolean);
    sections.forEach(s => observer.observe(s));
    
    return () => sections.forEach(s => observer.unobserve(s));
  }, []);

  function scrollTo(href) {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      const yOffset = -95;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }

  return (
    <>
      {/* Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-[60] origin-left"
        style={{ scaleX: scrollYProgress, willChange: 'transform' }}
      />
      
      <header
        className={`fixed top-0 left-0 w-full z-50 px-4 transition-all duration-300 ${
          scrolled
            ? 'py-2.5 bg-background/85 dark:bg-stone-950/85 backdrop-blur-md border-b border-border/40 shadow-xs'
            : 'pt-4 pb-2 bg-transparent'
        }`}
      >
        <nav
          className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-full px-5 py-2 transition-all duration-300 border border-border/80 bg-card/95 dark:bg-stone-900/95 shadow-sm"
          aria-label="Main Navigation"
        >
          {/* Logo */}
          <button
            onClick={() => scrollTo('#landing-top')}
            className="flex items-center gap-2.5 outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/25">
              <ShieldCheck size={18} />
            </div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight">Evidentia</span>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1 bg-muted/60 dark:bg-muted/40 rounded-full p-1 border border-border/40">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-background dark:bg-card rounded-full shadow-xs border border-border/50"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Theme toggle & CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>
            <Link
              to="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary transition"
            >
              Log in
            </Link>
            <Button asChild size="sm" className="rounded-full shadow-xs">
              <Link to="/verify" className="gap-1.5 font-semibold">
                Verify Document
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>

          {/* Mobile buttons */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground transition rounded-lg"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
            </button>
            <button
              className="p-2 text-foreground outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="absolute left-4 right-4 top-full mt-2 rounded-2xl bg-card border border-border shadow-xl p-5 md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className={`text-left text-sm font-medium px-2 py-1.5 rounded-lg ${
                    activeSection === link.href ? 'text-primary font-semibold bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <div className="h-[1px] bg-border w-full my-1" />
              <Link
                to="/login"
                className="text-center font-semibold text-sm text-foreground py-2 hover:bg-muted rounded-lg"
              >
                Log in
              </Link>
              <Button asChild className="rounded-full w-full justify-center">
                <Link to="/verify" className="gap-1.5">
                  Verify Document
                  <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
