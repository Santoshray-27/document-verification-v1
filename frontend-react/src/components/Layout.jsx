import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileCheck, ScrollText, FileSearch, ShieldCheck, 
  BarChart, Settings, Search, Bell, LogOut, MoreHorizontal, ChevronRight, Files
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

const GROUPS = [
  {
    title: 'WORKSPACE',
    items: [
      { to: '/issuer', label: 'DASHBOARD', icon: LayoutDashboard, roles: ['issuer'] },
      { to: '/issuer/issue', label: 'ISSUE', icon: FileCheck, roles: ['issuer'] },
      { to: '/issuer/bulk', label: 'BULK ISSUANCE', icon: Files, roles: ['issuer'] },
      { to: '/issuer/documents', label: 'DOCUMENTS', icon: ScrollText, roles: ['issuer'] }
    ]
  },
  {
    title: 'TOOLS',
    items: [
      { to: '/verify', label: 'VERIFY', icon: FileSearch, roles: ['issuer', 'admin', 'verifier'] },
      { to: '/admin/audit', label: 'AUDIT', icon: ShieldCheck, roles: ['admin'] },
      { to: '/issuer/reports', label: 'REPORTS', icon: BarChart, roles: ['issuer', 'admin'] }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { to: '/issuer/settings', label: 'SETTINGS', icon: Settings, roles: ['issuer', 'admin'] }
    ]
  }
];

export default function Layout() {
  const { user, logout, workerOnline } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed);
  }, [collapsed]);

  const isPortal = user && ['issuer', 'admin'].includes(user.role);

  if (!isPortal && !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1"><Outlet /></main>
        <footer className="border-t border-line bg-surface-2 mt-auto p-4 text-center font-mono text-[10px] text-ink-muted">
          EVIDENTIA · ECDSA P-256 + SHA-256
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-bg text-ink overflow-hidden font-sans">
      {/* DESKTOP SIDEBAR */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 56 : 240 }}
        className="hidden lg:flex flex-col border-r border-line bg-surface h-full z-20 shrink-0 relative"
      >
        {/* Header */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="h-14 flex items-center px-4 border-b border-line shrink-0 hover:bg-surface-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
        >
          <div className="w-6 flex justify-center shrink-0">
            <Logo size={24} withWord={false} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-3 font-display font-bold text-[22px] whitespace-nowrap">
                EVIDENTIA
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar">
          {GROUPS.map(group => {
            const validItems = group.items.filter(item => !user || item.roles.includes(user.role));
            if (validItems.length === 0) return null;
            return (
              <div key={group.title} className="px-2">
                {!collapsed && <p className="px-3 mb-2 font-mono text-[10px] text-ink-muted tracking-wider">{group.title}</p>}
                <div className="space-y-1">
                  {validItems.map(item => (
                    <NavItem key={item.to} item={item} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer (Worker Status + User) */}
        <div className="border-t border-line p-3 shrink-0 bg-surface flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1" title={`Worker is ${workerOnline ? 'Online' : 'Degraded'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${workerOnline ? 'bg-verdict-genuine animate-pulse' : 'bg-verdict-altered'}`} />
            {!collapsed && <span className="font-mono text-[10px] uppercase text-ink-muted tracking-wider">WORKER {workerOnline ? 'ONLINE' : 'DEGRADED'}</span>}
          </div>
          
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-sm bg-surface-2 border border-line flex items-center justify-center font-mono text-xs shrink-0 mt-1">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="text-[11px] font-bold truncate leading-tight tracking-wide">{user?.name}</p>
                <p className="text-[9px] font-mono text-ink-muted truncate mb-1">{user?.email}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[9px] bg-bg border border-line px-1.5 py-0.5 rounded-sm truncate max-w-[80px] text-ink-muted" title="Issuer ID">
                      {user?.issuerId || user?.issuer_id || user?.id || 'sys_000'}
                    </span>
                    {user?.orgType && (
                      <span className="font-mono text-[8px] uppercase text-amber-600 tracking-wider">
                        {user.orgType}
                      </span>
                    )}
                  </div>
                  <button onClick={logout} className="text-ink-muted hover:text-ink transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded">
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* TOPBAR */}
        <header className="h-14 border-b border-line bg-surface/90 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center font-mono text-[11px] text-ink-muted">
            <span className="hidden sm:inline">EVIDENTIA</span>
            <ChevronRight size={12} className="mx-1.5 hidden sm:block" />
            <span className="text-ink font-medium tracking-wide">{(location.pathname.split('/').pop() || 'PORTAL').toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-line bg-surface rounded-sm text-[11px] font-mono text-ink-muted hover:border-ink hover:text-ink hover:shadow-hard-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              <Search size={13} /> SEARCH... <kbd className="bg-bg px-1 rounded-sm border border-line ml-2">⌘K</kbd>
            </button>
            <button className="relative p-1.5 text-ink-muted hover:text-ink transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-verdict-altered rounded-full border border-surface" />
            </button>
            <button onClick={logout} className="p-1.5 text-ink-muted hover:text-ink lg:hidden outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm">
              <LogOut size={16}/>
            </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div key={location.pathname} className="min-h-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        <footer className="hidden lg:block border-t border-line bg-surface p-2.5 text-center font-mono text-[10px] text-ink-muted tracking-wide shrink-0">
          EVIDENTIA · ECDSA P-256 + SHA-256
        </footer>
      </div>

      {/* MOBILE BOTTOM TAB BAR (< 1024px) */}
      <nav className="lg:hidden flex items-center justify-around border-t border-line bg-surface pb-safe h-16 shrink-0 z-20 relative">
        {[
          { to: '/issuer', icon: LayoutDashboard, label: 'DASH' },
          { to: '/issuer/issue', icon: FileCheck, label: 'ISSUE' },
          { to: '/issuer/documents', icon: ScrollText, label: 'DOCS' },
          { to: '/verify', icon: FileSearch, label: 'VERIFY' }
        ].map(tab => (
          <NavLink key={tab.to} to={tab.to} className={({isActive}) => `flex flex-col items-center justify-center w-full h-full font-mono text-[9px] tracking-wider transition-colors outline-none ${isActive ? 'text-amber-600' : 'text-ink-muted hover:text-ink'}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.div layoutId="mobileTab" className="absolute top-0 w-8 h-[2px] bg-amber-500" />}
                <tab.icon size={20} className="mb-1" strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
        <button className="flex flex-col items-center justify-center w-full h-full font-mono text-[9px] tracking-wider text-ink-muted hover:text-ink outline-none">
          <MoreHorizontal size={20} className="mb-1" />
          MORE
        </button>
      </nav>
    </div>
  );
}

function NavItem({ item, collapsed }) {
  if (item.disabled) {
    return (
      <div className="flex items-center px-3 py-2 text-ink-muted opacity-50 cursor-not-allowed group">
        <div className="w-6 flex justify-center shrink-0">
          <item.icon size={18} className="shrink-0" />
        </div>
        {!collapsed && <span className="font-mono text-[11px] flex-1 ml-3 tracking-wide">{item.label}</span>}
        {!collapsed && <span className="font-mono text-[8px] border border-line px-1 rounded-sm bg-bg">SOON</span>}
      </div>
    );
  }

  return (
    <NavLink to={item.to} end={item.to === '/issuer'} className="relative block group outline-none">
      {({ isActive }) => (
        <div className={`flex items-center px-3 py-2 rounded-sm transition-all ${isActive ? 'text-ink bg-surface-2' : 'text-ink-muted hover:text-ink hover:bg-surface-2/50'}`}>
          {isActive && (
            <motion.div layoutId="activeNav" className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500 rounded-r-sm" />
          )}
          {isActive && <div className="absolute inset-0 border border-line rounded-sm pointer-events-none" />}
          
          <div className="w-6 flex justify-center shrink-0">
            <item.icon size={18} className="shrink-0 group-hover:translate-x-0.5 transition-transform relative z-10" />
          </div>
          
          {!collapsed && (
            <span className="font-mono text-[11px] truncate relative z-10 ml-3 tracking-wide group-hover:underline decoration-line-strong underline-offset-4 group-hover:translate-x-0.5 transition-transform">
              {item.label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
}
