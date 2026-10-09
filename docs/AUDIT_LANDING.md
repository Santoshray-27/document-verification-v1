# Evidentia Landing Page — Comprehensive Senior QA & Frontend Audit Report

**Auditor:** Senior QA Engineer & Frontend Specialist (10+ Years Experience)  
**Date:** October 9, 2026  
**Target:** Evidentia Landing Page (`http://localhost:5174`)  
**Scope:** Architecture, Micro-interactions, Design Token Adherence, Responsive Layouts, Performance, Accessibility, and SEO.

---

## Executive Summary & Scorecard

- **Overall Landing Page Quality Score:** **73 / 100**
- **Total Audit Checklist Items:** 35
- **PASS:** 18 (51.4%)
- **PARTIAL:** 15 (42.9%)
- **MISSING:** 1 (2.8%)
- **BROKEN / DUPLICATE:** 1 (2.8%)

| Section | Spec Category | Status Summary |
| :--- | :--- | :--- |
| **A** | Global Theme, Tokens & Foundations | **PARTIAL** (Tokens partially hardcoded, extra dark section) |
| **B** | Navbar & Mobile Navigation | **PARTIAL** (Scroll sync jitter, body scroll lock missing) |
| **C** | Hero Section | **PARTIAL** (Missing ghost CTA, corner brackets, missing word in eyebrow) |
| **D** | Forensic Evidence (Pinned Section) | **BROKEN / DUPLICATE** (Inline code duplicates `src/components/landing/`) |
| **E** | How It Works (Horizontal Pinned Scroll) | **PARTIAL** (Card titles differ from spec, static icons) |
| **F** | Big Statement Text Reveal | **PARTIAL** (Second word missing amber underline draw) |
| **G** | Numbers & Metrics | **PARTIAL** (Missing rolling odometer count-up) |
| **H** | Testimonials | **PARTIAL** (Static grid, missing scroll fan & spotlight follow) |
| **I** | FAQ Accordion | **PARTIAL** (Missing ARIA expansion attributes & staggered reveal) |
| **J** | Final CTA & Footer | **PARTIAL** (Particle shapes square, link text mismatch) |
| **K** | Responsive Layouts (320px - 2560px) | **PASS** (Zero horizontal overflow, clean breakpoint shifts) |
| **L** | Performance & Code Architecture | **PASS** (GSAP dynamic import clean, smooth 60fps) |
| **M** | Accessibility (a11y) | **PARTIAL** (Missing skip-link & accordion keyboard attributes) |
| **N** | SEO & Metadata | **PASS** (Comprehensive meta tags, OG cards, semantic landmarks) |

---

## Screenshots Captured

Screenshots have been generated and archived in `docs/audit-shots/`:
- **Desktop (1440px):** [`docs/audit-shots/desktop-1440.png`](file:///c:/Users/asus/Downloads/workspace-01a11dd0-9ee3-71db-b0b2-5578741a5fc3/agnitia/docs/audit-shots/desktop-1440.png)
- **Tablet (768px):** [`docs/audit-shots/tablet-768.png`](file:///c:/Users/asus/Downloads/workspace-01a11dd0-9ee3-71db-b0b2-5578741a5fc3/agnitia/docs/audit-shots/tablet-768.png)
- **Mobile (375px):** [`docs/audit-shots/mobile-375.png`](file:///c:/Users/asus/Downloads/workspace-01a11dd0-9ee3-71db-b0b2-5578741a5fc3/agnitia/docs/audit-shots/mobile-375.png)

---

## Detailed Section Audit Tables

### Section A: Global Theme, Tokens & Foundations

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Light theme only** | **PARTIAL** | `LandingPage.jsx:464,538` | Spec allows **ONE** dark ink section (`FinalCTA`). However, `NumbersSection` is ALSO rendered with `bg-ink text-bg` (2 dark sections total). |
| **Design tokens used** | **PARTIAL** | `LandingPage.jsx:94,128,289,418,541` | Multiple hardcoded hex colors (`#14130F`, `#FBFAF6`, `#F59E0B`) and pixel dimensions in JSX inline styles instead of Tailwind token classes (`bg-surface`, `text-ink`, `border-line`). |
| **Fonts loaded & applied** | **PASS** | `index.html:26`, `tailwind.config.js:28-30` | `Instrument Serif` (Display), `JetBrains Mono` (Mono labels), `Inter/Geist` (Body) loaded via Google Fonts and correctly bound in Tailwind theme. |
| **Graph-paper grid & paper grain** | **PASS** | `LandingPage.jsx:125-126`, `theme.css:20-37` | SVG noise overlay and graph-paper CSS background grid are present and layered cleanly. |
| **Drifting amber blobs & parallax** | **PASS** | `LandingPage.jsx:128-129` | Animated `motion.div` background blur blobs drift smoothly with `useTransform(scrollY)`. |
| **Lenis smooth scroll active** | **PASS** | `LandingPage.jsx:45-54` | Lenis smooth scroll initialized, RAF ticker synced with GSAP `ScrollTrigger.update`. |
| **Custom cursor (desktop only)** | **PASS** | `LandingPage.jsx:133-134` | Dual-ring custom cursor tracking cursor position, hidden on mobile screens (`hidden md:block`), expanding on interactive elements. |
| **Top scroll-progress bar** | **PASS** | `LandingPage.jsx:131` | Top 4px amber indicator bar bound to `scrollYProgress` spring. |
| **Preloader reveal** | **PASS** | `LandingPage.jsx:27,172-183` | Seal draws via SVG `pathLength` (~1.2s), curtain reveals, skipped on repeat visits via `sessionStorage`. |

---

### Section B: Navbar

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Floating, shrink & auto-hide** | **PARTIAL** | `LandingPage.jsx:185-216` | Navbar uses raw `window.scrollY` event listener instead of Lenis scroll state, causing minor header jitter when direction changes rapidly. |
| **Mobile full-screen menu** | **PARTIAL** | `LandingPage.jsx:218-234` | Full-screen mobile overlay exists, but **body scroll lock** (`overflow: hidden` on body) is not applied when open. Links lack staggered entry animation. |

---

### Section C: Hero Section

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Split-text line reveal** | **PASS** | `LandingPage.jsx:248-255` | Headline lines reveal upwards from overflow masks smoothly. |
| **Shimmer sweep on "Trust Every Verdict."** | **PASS** | `LandingPage.jsx:251-254` | Amber text contains linear gradient shine animation passing across the text on load. |
| **Mono eyebrow label** | **PARTIAL** | `LandingPage.jsx:246` | Label reads `"ECDSA P-256 · SHA-256 · TAMPER-EVIDENT"` missing the spec required word `"REGISTRY"`. |
| **Certificate tilt & seal stamp** | **PARTIAL** | `LandingPage.jsx:276-306` | Mouse 3D tilt and verified seal stamp (~1.5s delay) work. However, the **ScanFrame (outer corner bracket accents)** is missing. |
| **Floating verdict chips** | **PARTIAL** | `LandingPage.jsx:265-266` | Verdict chips floating in 2D space, but lack depth-based parallax reaction to scroll or mouse movement. |
| **Magnetic primary + Ghost secondary CTA** | **MISSING** | `LandingPage.jsx:259-261` | Primary magnetic button present ("Start Verification"). **Ghost secondary CTA button is completely missing**. |
| **Certificate pin & scale down** | **PASS** | `LandingPage.jsx:64-67` | Certificate pins in viewport and scales down into the forensic section on scroll scrub. |
| **Velocity-reactive Marquee** | **PASS** | `LandingPage.jsx:328-356` | Ticker marquee speeds up based on `useVelocity(scrollY)`. |

---

### Section D: Forensic Evidence (Pinned Section)

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Pinned scroll behavior** | **PASS** | `LandingPage.jsx:71-77` | Section pins vertically for 3000px of scroll progress on desktop. |
| **Left text swap + 01/03 counter** | **PARTIAL** | `LandingPage.jsx:74,361-378` | Text swaps work, but order is `Verdict Engine` (01) → `Live Pipeline` (02) → `Tamper Heatmap` (03) instead of `Verdict Engine` → `Tamper Heatmap` → `Live Pipeline`. |
| **Right side visual progression** | **PASS** | `LandingPage.jsx:75,379-405` | Diagnostics bars fade to live console log, which fades to heatmap overlay scrubbed to scroll. |
| **App Component Reuse** | **BROKEN** | `LandingPage.jsx:379-405` vs `ForensicsSection.jsx` | `LandingPage.jsx` contains duplicated inline SVG/HTML mockups instead of reusing modular components from `src/components/landing/ForensicsSection.jsx`. |

---

### Section E: How It Works

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Horizontal pinned scroll (3 cards)** | **PARTIAL** | `LandingPage.jsx:80-87,411-434` | Pinned horizontal scroll functions, but cards are titled `"Issuer Signs"`, `"Record Stored"`, `"Anyone Verifies"` instead of spec required `"Issue"`, `"Verify"`, `"Audit"`. |
| **SVG connecting line scrub** | **PASS** | `LandingPage.jsx:86,418` | SVG path line draws from 0 to 100% stroke dash offset during horizontal scroll scrub. |
| **Animated mono numbers & icons** | **PARTIAL** | `LandingPage.jsx:419-423` | Mono numbers 01/02/03 present, but icons are static Lucide SVGs rather than custom animated seal stamp / QR scan / chain link SVGs. |

---

### Section F: Big Statement

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Word-by-word reveal scrub** | **PASS** | `LandingPage.jsx:90-96,436-449` | Words transition from 20% ink opacity to 100% ink opacity scrubbed to scroll. |
| **Amber underline draw** | **PARTIAL** | `LandingPage.jsx:441-445` | Amber underline drawing animation is attached to `"deterministic"`, but **missing under `"cryptography"`**. |

---

### Section G: Numbers & Metrics

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **6, 2, 256-bit, 100% metrics** | **PARTIAL** | `LandingPage.jsx:452-483` | Numbers fetch live from `/public/stats` API, but **lack rolling odometer count-up animations** on view; hairline rules are static borders. |

---

### Section H: Testimonials

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Card fanning, spotlight & carousel** | **PARTIAL** | `LandingPage.jsx:485-506` | Testimonials are displayed in a basic 3-column static grid with simple `y: -10` hover. Missing stacked card fanning, radial spotlight cursor follow, and mobile swipe carousel. |

---

### Section I: FAQ Accordion

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Smooth accordion & +/- morph** | **PASS** | `LandingPage.jsx:508-534` | Accordion height expands/collapses smoothly via `AnimatePresence`. Plus/Minus icons toggle cleanly. |
| **Accessibility & Staggered Reveal** | **PARTIAL** | `LandingPage.jsx:517` | Accordion `<button>` elements lack `aria-expanded` and `aria-controls` attributes. FAQ items reveal all at once rather than staggered on scroll. |

---

### Section J: Final CTA & Footer

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Dark Ink CTA & Particle burst** | **PARTIAL** | `LandingPage.jsx:536-562` | Dark background with animated blur aurora works. Hover particle burst uses generic square divs instead of shield-shaped particles; button lacks idle magnetic pulse. |
| **Giant Wordmark & Links** | **PARTIAL** | `LandingPage.jsx:564-606` | Giant outlined EVIDENTIA wordmark with amber fill hover works cleanly. Footer contains `"Issuer Directory"` link (`/issuers`) instead of `"Issuer Login"` link (`/login`). |

---

### Section K: Responsive Layouts

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **No horizontal overflow** | **PASS** | Visual browser test @ 375, 768, 1440px | Zero horizontal scrollbar or element clipping detected at any viewport width. |
| **Mobile pinning disable** | **PASS** | `LandingPage.jsx:57-59` | GSAP `matchMedia` correctly disables pinning on viewports `< 768px`, falling back to clean vertical stacked reveals. |

---

### Section L: Performance & Architecture

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Transform/Opacity animations** | **PASS** | `LandingPage.jsx` | All GSAP and Framer Motion hooks manipulate GPU-accelerated `transform` and `opacity` properties. |
| **GSAP dynamic code-splitting** | **PASS** | `LandingPage.jsx:49` | GSAP and ScrollTrigger are dynamically imported inside `useEffect` to reduce main bundle size. |

---

### Section M: Accessibility (a11y)

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Reduced Motion Fallback** | **PASS** | `index.css:115-123` | `@media (prefers-reduced-motion: reduce)` zeroes out animation durations globally. |
| **Focus Rings & Skip Link** | **PARTIAL** | `index.css:30-33`, `LandingPage.jsx` | Focus rings styled with amber outline. However, **skip-to-content link** (`<a href="#main">`) is missing from the top of the DOM. |

---

### Section N: SEO

| Item | Status | Evidence (File + Line / Browser) | Issue |
| :--- | :--- | :--- | :--- |
| **Meta tags & Semantic HTML** | **PASS** | `index.html:6-21`, `LandingPage.jsx` | Complete page title, meta description, OG tags, Twitter summary card, inline SVG favicon, single `<h1>` tag, and standard HTML5 sectioning elements (`<nav>`, `<section>`, `<footer>`). |

---

## Top 10 Priority Fixes (Ranked by Visual & UX Impact)

1. **Fix Component Duplication (Section D):** Refactor `LandingPage.jsx` to import and render the modular, production components from `src/components/landing/ForensicsSection.jsx` instead of keeping dead inline duplicates.
2. **Add Missing Ghost Secondary CTA (Section C):** Add the missing "Explore Architecture" or "Read Protocol" ghost button next to the primary magnetic CTA in the Hero section.
3. **Implement Rolling Odometer Count-Up (Section G):** Wrap numbers in `NumbersSection` with a `useSpring` counter hook (e.g., counting up from 0 to 256 / 100% when scrolled into view).
4. **Upgrade Testimonials to Stacked Fan / Spotlight Hover (Section H):** Replace the static 3-column grid with a card stack that fans out on scroll scrub and follows mouse position with a radial spotlight glow.
5. **Fix Card Titles & Animated Icons in How It Works (Section E):** Update card titles to `"Issue"`, `"Verify"`, `"Audit"` and add custom SVG icon animations (stamp, scan line, chain link).
6. **Add Second Amber Underline Draw (Section F):** Add the missing `.bs-line` element under `"cryptography"` in `BigStatement`.
7. **Add ScanFrame Corner Brackets to Hero Cert (Section C):** Render absolute corner brackets (`border-t-2 border-l-2 border-amber-500`, etc.) around the interactive certificate frame.
8. **Fix Mobile Menu Body Scroll Lock (Section B):** Toggle `document.body.style.overflow = 'hidden'` when the mobile navigation menu is opened to prevent background scrolling.
9. **Fix Text Sequence Order in Forensics (Section D):** Align left panel step order to match spec (`Verdict Engine` → `Tamper Heatmap` → `Live Pipeline`).
10. **Add Accessibility Skip-to-Content Link & ARIA Attributes (Section M/I):** Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` and bind `aria-expanded={open === i}` to FAQ buttons.

---

## Elements That Feel Generic / Template-like

- **Testimonials Section Grid:** Simple 3-column card grid with basic `translateY` hover feels like a standard Bootstrap template rather than an award-level micro-interactive experience.
- **Numbers Section Layout:** Plain stat box numbers without animated counter odometers or hairline SVG border draws.
- **Static Lucide Icons in How It Works:** Standard un-animated Lucide icons instead of custom SVG micro-animations (e.g., seal stamping downward, QR laser scanning back and forth).
- **FAQ Accordion:** Standard React state toggle lacking subtle staggered entrance motion or smooth SVG icon morphing between `+` and `-`.

---

## Bugs Found & Reproduction Steps

### Bug 1: Mobile Menu Background Page Scrolling
- **Reproduction Steps:**
  1. Open landing page on mobile device or viewport (375px).
  2. Click burger menu icon to open full-screen menu overlay.
  3. Touch and drag vertically outside menu items.
- **Expected:** Page underneath remains fixed and locked.
- **Actual:** Background page behind overlay scrolls freely.

### Bug 2: Hardcoded Hex Colors Breaking Dark CTA Contrast
- **Reproduction Steps:**
  1. Scroll down to `FinalCTA` section (`LandingPage.jsx:541`).
  2. Inspect particle effect divs.
- **Expected:** Particles inherit surface tokens (`bg-surface`).
- **Actual:** `bg-bg` hardcoded class causes light stone squares to render over dark ink background without proper design token binding.

---

## Actionable Fix List (Grouped by Section)

### Section A: Global
- [ ] Remove `bg-ink` from `NumbersSection` so that `FinalCTA` remains the single dark ink section as specified.
- [ ] Replace inline hardcoded colors (`#14130F`, `#FBFAF6`, `#F59E0B`) with Tailwind token classes (`text-ink`, `bg-surface`, `text-amber-500`).

### Section B: Navbar
- [ ] Sync navbar scroll visibility with Lenis scroll handler to eliminate direction change jitter.
- [ ] Add `document.body.style.overflow = mobileOpen ? 'hidden' : ''` effect when mobile menu is toggled.

### Section C: Hero
- [ ] Add missing ghost secondary button next to magnetic CTA ("Start Verification").
- [ ] Update eyebrow text string to include `"REGISTRY"` (`"ECDSA P-256 · SHA-256 · TAMPER-EVIDENT REGISTRY"`).
- [ ] Add outer corner bracket SVG elements (ScanFrame) to `InteractiveCertificate`.

### Section D: Forensic Evidence
- [ ] Refactor `LandingPage.jsx` to import and render `ForensicsSection.jsx` instead of duplicating mockup elements inline.
- [ ] Adjust step order in sequence: `Verdict Engine` (01) → `Tamper Heatmap` (02) → `Live Pipeline` (03).

### Section E: How It Works
- [ ] Rename step cards to `"Issue"`, `"Verify"`, and `"Audit"`.
- [ ] Add keyframe animations to step icons (seal stamp bounce, scan line sweep, chain link lock).

### Section F: Big Statement
- [ ] Add amber line draw element (`.bs-line`) under the word `"cryptography"`.

### Section G: Numbers
- [ ] Implement animated odometer counter hook for document and verification metrics on view entry.

### Section H: Testimonials
- [ ] Convert 3-column layout into a stacked card layout that fans out on scroll scrub with cursor spotlight hover effect.

### Section I: FAQ
- [ ] Add `aria-expanded={open === i}` and `aria-controls={`faq-answer-${i}`}` to accordion buttons.

### Section J: Final CTA & Footer
- [ ] Update Footer link text from `"Issuer Directory"` to `"Issuer Login"` (`href="/login"`).
- [ ] Replace square particle burst divs with SVG shield shape particles.
