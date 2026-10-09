import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertTriangle, FileSearch, LogOut, Menu, ScrollText, ShieldCheck, Palette, LayoutTemplate, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

const NAV = {
  issuer: [
    { to: '/issuer', label: 'Dashboard', icon: ShieldCheck },
    { to: '/issuer/issue', label: 'Issue document', icon: FileSearch },
    { to: '/issuer/documents', label: 'My documents', icon: ScrollText },
    { to: '/issuer/studio', label: 'Template Studio', icon: LayoutTemplate },
    { to: '/issuer/settings', label: 'Branding', icon: Palette },
  ],
  admin: [{ to: '/admin/audit', label: 'Audit log', icon: ScrollText }],
  verifier: [{ to: '/verify', label: 'Verify', icon: FileSearch }],
};

export default function Layout() {
  const { user, logout, workerOnline } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);

  const links = user ? NAV[user.role] || [] : [];

  return (
    <div className="flex min-h-screen flex-col">
      {!workerOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
          <AlertTriangle size={14} className="shrink-0" />
          Forensic analysis is offline (OCR / visual diff). Cryptographic verification — hash, signature and registry — still works.
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-navy-900/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" className="shrink-0">
            <Logo size={30} />
          </NavLink>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <NavLink
              to="/verify"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'}`
              }
            >
              Verify a document
            </NavLink>
            <NavLink
              to="/issuers"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'}`
              }
            >
              Issuer Directory
            </NavLink>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/issuer'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {user ? (
              <>
                <span className="hidden text-right sm:block">
                  <span className="block text-xs font-semibold text-slate-200">{user.name}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-gold-400/80">{user.role}</span>
                </span>
                <button onClick={logout} className="btn-ghost btn-sm" title="Log out">
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn-primary btn-sm">
                Log in
              </NavLink>
            )}
            <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 md:hidden" aria-label="Menu">
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/[0.07] md:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                <NavLink to="/verify" className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  Verify a document
                </NavLink>
                <NavLink to="/issuers" className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                  Issuer Directory
                </NavLink>
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.to === '/issuer'} className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/[0.07] bg-navy-950/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-semibold text-slate-400">Agnitia</span> · Proof in Every Pixel · ECDSA P-256 + SHA-256 signed registry
          </p>
          <p className="max-w-xl leading-relaxed">
            Automated verification aid. Not a legal certificate of authenticity. Verdicts come from deterministic cryptographic checks and
            rules — no AI model decides them.
          </p>
        </div>
      </footer>
    </div>
  );
}
