import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, FilePlus2, ScanSearch, ShieldCheck, CheckCircle2, ChevronRight, Upload, QrCode } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api, { errMsg } from '../../api/axios';
import { queries } from '../../api/queries';
import { fmtDate } from '../../lib/format';

function useDashboard() {
  return useQuery({
    queryKey: queries.issuer.dashboard(),
    queryFn: async () => {
      const { data } = await api.get('/issuer/dashboard');
      return data;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  
  // Staggered variants
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12 relative">
      {/* HEADER */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Issuer Portal / Overview</span>
          {isLoading ? (
            <div className="h-10 bg-surface-2 rounded-sm w-64 mt-2 animate-pulse" />
          ) : isError ? (
            <div className="h-10 mt-2 text-verdict-forged font-mono text-sm">Failed to load profile</div>
          ) : (
            <>
              <h1 className="mt-2 font-display text-4xl sm:text-5xl text-ink tracking-tight">
                Good evening, <em className="text-amber-600 not-italic">{data?.issuer?.name || 'Issuer'}</em>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] bg-surface-2 px-2 py-1 rounded-sm border border-line text-ink-muted flex items-center gap-1.5 cursor-copy hover:bg-surface">
                  {data?.issuer?.issuer_id}
                </span>
                <span className="font-mono text-[10px] uppercase text-ink-muted px-2 py-1 border border-line border-dashed rounded-sm">
                  {data?.issuer?.org_type || 'Accredited Institution'}
                </span>
              </div>
            </>
          )}
        </div>
        <Link to="/issuer/issue" className="shrink-0">
          <button className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-ink font-mono font-bold text-[11px] uppercase tracking-wide border border-ink shadow-hard-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all rounded-sm">
            <FilePlus2 size={16} /> Issue New Document
          </button>
        </Link>
      </motion.div>

      {/* ROW 1: STAT TILES */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 relative z-10">
        <StatPanel label="ISSUED" dataKey="total" tone="emerald" fallbackSpark={[2,4,3,5,8,7,12]} />
        <StatPanel label="ACTIVE" dataKey="active" tone="ink" fallbackSpark={[1,3,3,4,6,6,10]} />
        <StatPanel label="REVOKED" dataKey="revoked" tone="amber" fallbackSpark={[0,0,1,0,1,0,2]} />
        <StatPanel label="CHECKS" dataKey="verifications" tone="emerald" fallbackSpark={[12,24,18,36,42,38,55]} />
      </motion.div>

      <div className="relative">

        {/* ROW 2: PIPELINE & LOG */}
        <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
          <div className="xl:col-span-7 border border-line bg-surface rounded-sm shadow-sm relative overflow-hidden group">
            <PanelHeader title="ANALYSIS PIPELINE" status="PROCESSING" />
            <div className="p-6 h-[220px] flex items-end justify-between gap-2 overflow-x-auto no-scrollbar">
              <PipelineBars />
            </div>
          </div>
          
          <div className="xl:col-span-5 border border-line bg-surface rounded-sm shadow-sm relative flex flex-col">
            <PanelHeader title="LIVE LOG" status="STREAMING" pulse />
            <div className="flex-1 p-4 font-mono text-[10px] sm:text-xs text-ink-muted bg-surface-2/50 overflow-y-auto h-[220px]">
              <div className="space-y-1.5">
                <p>2026-10-09 14:10:02 | <span className="text-amber-600">SYS</span> | Engine initialized (v1.4)</p>
                <p>2026-10-09 14:11:15 | <span className="text-verdict-genuine">ISSUE</span> | Document doc_8fx9a registered</p>
                <p>2026-10-09 14:15:33 | <span className="text-verdict-copy">VERIFY</span> | Incoming scan req_92msx</p>
                <p>2026-10-09 14:15:34 | <span className="text-verdict-copy">OCR</span> | Extracted 14 fields</p>
                <p>2026-10-09 14:15:35 | <span className="text-verdict-altered">DIFF</span> | Visual anomaly detected in region [x:142, y:388]</p>
                <p className="flex items-center gap-2">
                  <span>2026-10-09 14:15:36 | <span className="text-amber-600">AWAIT</span> | Listening</span>
                  <span className="w-1.5 h-3 bg-amber-500 animate-pulse inline-block" />
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ROW 3: SCANNER & HEATMAP */}
        <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div className="border border-line bg-surface rounded-sm shadow-sm flex flex-col">
            <PanelHeader title="DOCUMENT SCAN" />
            <div className="h-[300px] bg-bg relative p-8 flex flex-col items-center justify-center overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-verdict-genuine" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-verdict-genuine" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-verdict-genuine" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-verdict-genuine" />
              
              <div className="w-48 h-64 bg-surface border border-line shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent h-[150%] animate-[float_3s_linear_infinite]" />
                <div className="p-4 space-y-2 opacity-30">
                  <div className="h-4 bg-line w-3/4" />
                  <div className="h-2 bg-line w-1/2" />
                  <div className="h-24 bg-line w-full mt-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-line bg-surface rounded-sm shadow-sm flex flex-col">
            <PanelHeader title="HEATMAP ANALYSIS (OCR DELTA)" />
            <div className="h-[300px] bg-surface-2 p-4 relative flex items-center justify-center">
               <div className="w-full max-w-sm aspect-video bg-surface border border-line shadow-sm relative p-4 flex flex-col justify-between font-mono text-[10px]">
                 <div className="text-ink-muted">Original: B.Tech Computer Science</div>
                 <div className="relative inline-block mt-4">
                   <span className="text-lg font-serif">M.Tech</span>
                   <div className="absolute inset-0 bg-verdict-altered/20 border border-verdict-altered mix-blend-multiply" />
                   <div className="absolute -top-4 -left-4 text-verdict-altered text-[8px]">x142 y388</div>
                   <div className="absolute -bottom-4 -right-4 text-verdict-altered text-[8px]">x180 y410</div>
                 </div>
                 <div className="text-ink-muted mt-4">Issued: B.Tech / Found: M.Tech</div>
               </div>
            </div>
          </div>
        </motion.div>

        {/* ROW 4: RECENT LEDGER & ONBOARDING */}
        <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <RecentLedger />

          <QuickActions />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------
// LOCAL COMPONENTS (Instrument Panel Style)
// ------------------------------------------------------------------

function SampleDataOverlay() {
  const { data, isLoading } = useDashboard();
  if (isLoading || (data?.stats?.total ?? 0) > 0) return null;
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
      <div className="text-[120px] font-display text-ink opacity-[0.03] rotate-[-15deg] whitespace-nowrap select-none mix-blend-multiply border-[8px] border-ink p-8">
        SAMPLE DATA
      </div>
    </div>
  );
}

function PanelHeader({ title, status, pulse }) {
  return (
    <div className="h-8 border-b border-line bg-surface-2/50 flex items-center justify-between px-3">
      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">{title}</span>
      {status && (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase text-ink-muted">{status}</span>
          {pulse && <span className="w-1.5 h-1.5 rounded-full bg-verdict-genuine animate-pulse" />}
        </div>
      )}
    </div>
  );
}

function StatPanel({ label, dataKey, tone, fallbackSpark }) {
  const { data, isLoading, isError } = useDashboard();
  
  const tones = {
    emerald: 'text-verdict-genuine',
    amber: 'text-amber-500',
    ink: 'text-ink',
    rose: 'text-verdict-forged'
  };

  const stats = data?.stats || {};
  const value = stats[dataKey] !== undefined ? stats[dataKey] : 0;
  const isZero = value === 0;

  return (
    <div className="group border border-line bg-surface p-5 flex flex-col justify-between h-32 rounded-sm transition-all duration-300 hover:shadow-hard hover:-translate-y-1 hover:-rotate-1 relative overflow-hidden">
      <div className="absolute inset-0 bg-graph-paper bg-graph opacity-20 pointer-events-none" />
      <div className="relative z-10 flex justify-between items-start">
        <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest flex items-center gap-2">
          {label}
          {isLoading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          {isError && <AlertCircle size={10} className="text-red-500" />}
        </span>
        <div className="flex items-end gap-0.5 h-8 opacity-40 group-hover:opacity-100 transition-opacity">
          {(isZero ? [0, 0, 0, 0, 0, 0, 0] : fallbackSpark).map((val, i) => (
            <div key={i} className={`w-1.5 bg-current ${tones[tone]}`} style={{ height: `${Math.max(10, (val / Math.max(...fallbackSpark)) * 100)}%` }} />
          ))}
        </div>
      </div>
      <div className={`relative z-10 font-display text-4xl sm:text-5xl tracking-tighter ${tones[tone]}`}>
        {isLoading ? <span className="opacity-50 text-2xl font-mono">...</span> : value}
      </div>
    </div>
  );
}

function RecentLedger() {
  const { data, isLoading, isError } = useDashboard();
  const docs = data?.recent || [];

  return (
    <div className="xl:col-span-8 border border-line bg-surface rounded-sm shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-line">
        <h3 className="font-mono text-[11px] tracking-wide text-ink-muted uppercase flex items-center gap-2">
          Recent Documents Ledger
          {isLoading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        </h3>
        <Link to="/issuer/documents" className="font-mono text-[10px] text-amber-600 hover:underline">VIEW ALL &rarr;</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-surface-2/50 text-ink-muted border-b border-line">
              <th className="px-4 py-3 font-normal">RECIPIENT</th>
              <th className="px-4 py-3 font-normal">CERT ID</th>
              <th className="px-4 py-3 font-normal">ISSUED</th>
              <th className="px-4 py-3 font-normal text-right">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {isError ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-red-500">Failed to load recent documents.</td></tr>
            ) : docs.length > 0 ? docs.map((d, i) => (
              <tr key={i} className="border-b border-line/50 hover:bg-surface-2/30 transition-colors">
                <td className="px-4 py-3 text-ink font-sans text-xs">{d.fields?.name || d.name}</td>
                <td className="px-4 py-3 text-ink-muted">
                  <span className="bg-surface-2 px-1.5 py-0.5 rounded-sm border border-line cursor-copy">{d.fields?.certificate_number || d.cert_id || d.doc_id}</span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{d.issued_at ? fmtDate(d.issued_at) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider ${d.status === 'active' ? 'bg-verdict-genuine-bg text-verdict-genuine-text border border-verdict-genuine-border' : 'bg-verdict-revoked-bg text-verdict-revoked-text border border-verdict-revoked-border'}`}>
                    {d.status}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-ink-muted">
                  <p className="font-mono text-xs">No credentials issued yet.</p>
                  <Link to="/issuer/issue" className="inline-block mt-2 font-mono text-[10px] text-amber-700 bg-amber-500/10 px-3 py-1 border border-amber-500/30 font-bold hover:bg-amber-500/20">
                    + ISSUE YOUR FIRST CERTIFICATE
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuickActions() {
  const { data } = useDashboard();
  const isEmpty = (data?.stats?.total ?? 0) === 0;

  return (
    <div className="xl:col-span-4 space-y-6">
      {isEmpty ? (
        <div className="border border-line bg-amber-500/5 rounded-sm p-5 border-dashed">
          <h3 className="font-mono text-xs text-amber-700 mb-4 font-semibold uppercase tracking-wide">Onboarding Checklist</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-ink">Create Issuer Account</p>
            </div>
            <div className="flex items-start gap-3 opacity-60">
              <div className="w-4 h-4 rounded-full border border-ink-muted mt-0.5 shrink-0" />
              <p className="text-xs text-ink">Choose a certificate template</p>
            </div>
            <div className="flex items-start gap-3 opacity-60">
              <div className="w-4 h-4 rounded-full border border-ink-muted mt-0.5 shrink-0" />
              <p className="text-xs text-ink">Sign & register hash to blockchain/DB</p>
            </div>
          </div>
          <Link to="/issuer/issue" className="mt-5 block w-full text-center py-2 bg-amber-500 text-ink font-mono text-[11px] font-bold uppercase rounded-sm border border-ink shadow-hard-sm">
            ISSUE FIRST CERTIFICATE
          </Link>
        </div>
      ) : (
        <div className="border border-line bg-surface rounded-sm p-4">
          <h3 className="font-mono text-[11px] tracking-wide text-ink-muted uppercase mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/issuer/issue" className="flex items-center justify-between p-3 border border-line bg-surface-2 hover:bg-surface transition-colors rounded-sm group">
              <div className="flex items-center gap-3 text-xs text-ink font-medium"><Upload size={14} className="text-ink-muted group-hover:text-amber-600" /> Issue Document</div>
              <ChevronRight size={14} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/verify" className="flex items-center justify-between p-3 border border-line bg-surface-2 hover:bg-surface transition-colors rounded-sm group">
              <div className="flex items-center gap-3 text-xs text-ink font-medium"><QrCode size={14} className="text-ink-muted group-hover:text-amber-600" /> Verify External</div>
              <ChevronRight size={14} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineBars() {
  const stages = [
    { label: 'UPLOAD', state: 'done' },
    { label: 'SHA-256', state: 'done' },
    { label: 'QR', state: 'done' },
    { label: 'REGISTRY', state: 'done' },
    { label: 'SIGNATURE', state: 'active' },
    { label: 'STATUS', state: 'pending' },
    { label: 'OCR', state: 'pending' },
    { label: 'VERDICT', state: 'pending' },
  ];

  return (
    <div className="flex w-full h-full gap-1 sm:gap-2 items-end">
      {stages.map((s, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 relative group cursor-crosshair">
          <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-bg text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10">
             Stage {i+1}: {s.state.toUpperCase()}
          </div>
          <div className={`w-full max-w-[24px] rounded-t-sm transition-all duration-500 flex flex-col justify-end
            ${s.state === 'done' ? 'h-full bg-verdict-genuine' : ''}
            ${s.state === 'active' ? 'h-[60%] bg-amber-500 animate-pulse' : ''}
            ${s.state === 'pending' ? 'h-full border border-dashed border-line' : ''}
          `}>
             {s.state === 'active' && <div className="text-[8px] font-mono text-bg text-center pb-1 -rotate-90">60%</div>}
          </div>
          <span className="font-mono text-[9px] text-ink-muted -rotate-45 sm:rotate-0 origin-bottom-left sm:origin-center sm:text-center mt-2 w-full truncate">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const MOCK_DOCS = [
  { name: 'Robert Johnson', cert_id: 'cert_8fx9a', issued_at: '2026-10-09T14:10:00Z', status: 'active' },
  { name: 'Alice Smith', cert_id: 'cert_22mzx', issued_at: '2026-10-08T09:12:00Z', status: 'active' },
  { name: 'R. Chen', cert_id: 'cert_99abc', issued_at: '2026-10-05T11:45:00Z', status: 'revoked' },
];
