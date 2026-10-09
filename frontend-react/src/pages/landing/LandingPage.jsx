/**
 * Agnitia — Premium Scroll-Animated Marketing Landing Page
 * ─────────────────────────────────────────────────────────
 * Mounted at "/" (outside the existing <Layout> wrapper).
 * If user is already logged in, redirects to their dashboard.
 *
 * Theme-aware (bKsEuMcK preset: stone base, amber accent, large radius).
 */
import { Suspense, lazy, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Components loaded immediately (above the fold)
import LandingNav   from '../../components/landing/LandingNav.jsx';
import HeroSection  from '../../components/landing/HeroSection.jsx';

// Below-the-fold sections — lazy loaded
const ForensicsSection   = lazy(() => import('../../components/landing/ForensicsSection.jsx'));
const HowItWorksSection  = lazy(() => import('../../components/landing/HowItWorksSection.jsx'));
const StatementSection   = lazy(() => import('../../components/landing/StatementSection.jsx'));
const BigNumbersSection  = lazy(() => import('../../components/landing/BigNumbersSection.jsx'));
const UseCasesSection    = lazy(() => import('../../components/landing/UseCasesSection.jsx'));
const FAQSection         = lazy(() => import('../../components/landing/FAQSection.jsx'));
const CTAFooter          = lazy(() => import('../../components/landing/CTAFooter.jsx'));

/** Simple spinner shown while lazy sections load */
function SectionLoader() {
  return (
    <div className="flex justify-center items-center py-24 bg-background" aria-label="Loading section">
      <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // While session is restoring, don't flash the wrong page
  if (loading) {
    return (
      <div className="landing-root min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  // Redirect logged-in users straight to their dashboard
  if (user) {
    if (user.role === 'issuer') return <Navigate to="/issuer"      replace />;
    if (user.role === 'admin')  return <Navigate to="/admin/audit" replace />;
    return                             <Navigate to="/verify"      replace />;
  }

  return (
    <div className="landing-root bg-background text-foreground transition-colors duration-200" id="landing-top">
      {/* ① Fixed navbar — always visible */}
      <LandingNav />

      {/* Main landing container */}
      <div className="min-h-screen bg-background text-foreground">
        {/* ② Hero */}
        <HeroSection />

        {/* ③ Forensics */}
        <Suspense fallback={<SectionLoader />}>
          <ForensicsSection />
        </Suspense>

        {/* ④ How it works */}
        <Suspense fallback={<SectionLoader />}>
          <HowItWorksSection />
        </Suspense>

        {/* ⑤ Statement */}
        <Suspense fallback={<SectionLoader />}>
          <StatementSection />
        </Suspense>

        {/* ⑥ Big numbers */}
        <Suspense fallback={<SectionLoader />}>
          <BigNumbersSection />
        </Suspense>

        {/* ⑦ Use cases */}
        <Suspense fallback={<SectionLoader />}>
          <UseCasesSection />
        </Suspense>

        {/* ⑧ FAQ */}
        <Suspense fallback={<SectionLoader />}>
          <FAQSection />
        </Suspense>

        {/* ⑨ CTA + Footer */}
        <Suspense fallback={<SectionLoader />}>
          <CTAFooter />
        </Suspense>
      </div>
    </div>
  );
}
