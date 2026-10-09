import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  FileCheck,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Logo from './Logo.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';

const NAV = {
  issuer: [
    { to: '/issuer', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/issuer/issue', label: 'Issue Document', icon: FileCheck },
    { to: '/issuer/documents', label: 'My Documents', icon: ScrollText },
    { to: '/verify', label: 'Verify Portal', icon: FileSearch },
  ],
  admin: [
    { to: '/admin/audit', label: 'Audit Log Ledger', icon: ScrollText },
    { to: '/verify', label: 'Verify Portal', icon: FileSearch },
  ],
  verifier: [
    { to: '/verify', label: 'Verify Document', icon: FileSearch },
  ],
};

const BREADCRUMB_MAP = {
  '/issuer': ['Issuer Portal', 'Dashboard'],
  '/issuer/issue': ['Issuer Portal', 'Issue Document'],
  '/issuer/documents': ['Issuer Portal', 'Registry Documents'],
  '/admin/audit': ['Admin Console', 'Audit Log Ledger'],
  '/verify': ['Verification', 'Verify Document'],
};

export default function Layout() {
  const { user, logout, workerOnline } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isPortal = user && (user.role === 'issuer' || user.role === 'admin');
  const links = user ? NAV[user.role] || [] : [];
  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Agnitia', 'Portal'];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200">
      {/* Forensic offline notification */}
      {!workerOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:text-amber-200">
          <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Forensics pipeline is offline (OCR / visual diff). Cryptographic verification (ECDSA signature & SHA-256 hash) remains active.</span>
        </div>
      )}

      {isPortal ? (
        /* PORTAL SHELL (Issuer / Admin with desktop sidebar + top bar) */
        <div className="flex flex-1">
          {/* Desktop Left Sidebar */}
          <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 lg:flex">
            <div className="flex h-16 items-center px-6 border-b border-border">
              <NavLink to="/" className="flex items-center gap-2.5">
                <Logo size={28} withWord={false} />
                <span className="font-display text-base font-bold text-foreground">Agnitia</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                  {user.role}
                </Badge>
              </NavLink>
            </div>

            <nav className="flex-1 space-y-1 p-4" aria-label="Portal Navigation">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/issuer'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <Icon size={18} className="shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Sidebar User Footer */}
            <div className="border-t border-border p-4 bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Portal View */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Top Bar with Breadcrumbs & Theme Switch */}
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{crumbs[0]}</span>
                  <ChevronRight size={13} />
                  <span className="font-semibold text-foreground">{crumbs[1]}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold text-xs border border-amber-500/20">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{user.name}</span>
                </div>
              </div>
            </header>

            {/* Mobile Sheet Nav */}
            <AnimatePresence>
              {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                  />
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    className="relative flex h-full w-72 flex-col bg-card border-r border-border p-5 shadow-2xl"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Logo size={28} withWord={false} />
                        <span className="font-display font-bold text-base">Agnitia</span>
                      </div>
                      <button
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <nav className="flex-1 space-y-1.5 py-4">
                      {links.map((link) => {
                        const Icon = link.icon;
                        return (
                          <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/issuer'}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                                isActive
                                  ? 'bg-primary text-primary-foreground font-semibold'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`
                            }
                          >
                            <Icon size={18} />
                            <span>{link.label}</span>
                          </NavLink>
                        );
                      })}
                    </nav>

                    <div className="border-t border-border pt-4">
                      <div className="mb-3 px-1">
                        <p className="text-xs font-semibold text-foreground">{user.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{user.role}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={logout} className="w-full justify-center">
                        <LogOut size={14} className="mr-2" /> Log out
                      </Button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Portal Page Content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              <Outlet />
            </main>
          </div>
        </div>
      ) : (
        /* PUBLIC / VERIFIER SHELL (Clean solid top navbar) */
        <>
          <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-6">
                <NavLink to="/" className="shrink-0 flex items-center">
                  <Logo size={30} />
                </NavLink>
                <nav className="hidden items-center gap-1 md:flex">
                  <NavLink
                    to="/verify"
                    className={({ isActive }) =>
                      `rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-muted text-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`
                    }
                  >
                    Verify Document
                  </NavLink>
                  <NavLink
                    to="/issuers"
                    className={({ isActive }) =>
                      `rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-muted text-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`
                    }
                  >
                    Issuer Directory
                  </NavLink>
                  {user && (
                    <NavLink
                      to={user.role === 'issuer' ? '/issuer' : user.role === 'admin' ? '/admin/audit' : '/verify'}
                      className={({ isActive }) =>
                        `rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-muted text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`
                      }
                    >
                      {user.role === 'issuer' ? 'Issuer Portal' : user.role === 'admin' ? 'Admin Ledger' : 'Dashboard'}
                    </NavLink>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-3">
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-right">
                      <span className="block text-xs font-semibold text-foreground">{user.name}</span>
                      <span className="block text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400">
                        {user.role}
                      </span>
                    </span>
                    <Button variant="outline" size="sm" onClick={logout} title="Log out">
                      <LogOut size={14} className="sm:mr-1.5" />
                      <span className="hidden sm:inline">Log out</span>
                    </Button>
                  </div>
                ) : (
                  <NavLink to="/login">
                    <Button variant="default" size="sm">
                      Log in
                    </Button>
                  </NavLink>
                )}

                <button
                  onClick={() => setMobileOpen((o) => !o)}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted md:hidden"
                  aria-label="Toggle navigation menu"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </div>

            {/* Mobile Nav Drawer */}
            <AnimatePresence>
              {mobileOpen && (
                <motion.nav
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border bg-card px-4 py-3 md:hidden space-y-1"
                >
                  <NavLink
                    to="/verify"
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Verify Document
                  </NavLink>
                  {user && (
                    <NavLink
                      to={user.role === 'issuer' ? '/issuer' : user.role === 'admin' ? '/admin/audit' : '/verify'}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {user.role === 'issuer' ? 'Issuer Portal' : user.role === 'admin' ? 'Admin Ledger' : 'Dashboard'}
                    </NavLink>
                  )}
                  {!user && (
                    <NavLink
                      to="/login"
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-muted"
                    >
                      Log in
                    </NavLink>
                  )}
                </motion.nav>
              )}
            </AnimatePresence>
          </header>

          <main className="flex-1">
            <Outlet />
          </main>
        </>
      )}

      {/* Global institutional footer */}
      <footer className="border-t border-border bg-muted/30 mt-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <span className="font-semibold text-foreground">Agnitia</span> · Secure Digital Document Verification Platform · ECDSA P-256 + SHA-256
          </div>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Verdicts are determined through cryptographic proofs, digital signatures, and OCR multi-layer heuristics.
          </p>
        </div>
      </footer>
    </div>
  );
}
