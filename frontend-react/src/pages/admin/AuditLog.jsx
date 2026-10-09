import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw, ScrollText, ShieldCheck, Download } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import { fmtDate, shortHash } from '../../lib/format';

const ACTION_COLOR = {
  ISSUE: 'border-amber-500 bg-amber-500/10 text-amber-700',
  VERIFY: 'border-verdict-genuine bg-verdict-genuine-bg text-verdict-genuine',
  REVOKE: 'border-rose-500 bg-rose-500/10 text-rose-700',
  LOGIN: 'border-ink bg-ink/5 text-ink',
  INTEGRITY_CHECK: 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
};

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [open, setOpen] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/audit', { params: { limit: 100, action: action || undefined } });
      setRows(data.entries);
      setTotal(data.total);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => { load(); }, [load]);

  const runIntegrity = async () => {
    setChecking(true);
    try {
      const { data } = await api.get('/admin/audit/integrity');
      setIntegrity(data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setChecking(false);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Time', 'Action', 'Actor', 'Document ID', 'Entry Hash'];
    const csvRows = rows.map(r => [r.id, r.time, r.action, r.actor_id || 'sys', r.doc_id || '', r.entry_hash].join(','));
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `evidentia_audit_${Date.now()}.csv`);
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Governance & Security</span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mt-2">Cryptographic Ledger</h1>
          <p className="font-mono text-[10px] text-ink-muted max-w-2xl mt-4 leading-relaxed">
            The append-only hash-chained ledger. Every event commits to the previous state. Tamper-evident by mathematical design.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 border border-line bg-surface-2 hover:bg-surface font-mono text-[9px] uppercase font-bold tracking-widest text-ink transition-colors flex items-center gap-2"><Download size={14} /> Export CSV</button>
          <button onClick={load} className="px-4 py-2 border border-line bg-surface-2 hover:bg-surface font-mono text-[9px] uppercase font-bold tracking-widest text-ink transition-colors"><RefreshCw size={14} /></button>
          <button onClick={runIntegrity} disabled={checking} className="px-4 py-2 bg-ink text-bg font-mono text-[9px] uppercase font-bold tracking-widest flex items-center gap-2 hover:-translate-y-[1px] shadow-hard transition-all disabled:opacity-50">
            {checking ? 'VERIFYING...' : <><ShieldCheck size={14} /> Check Integrity</>}
          </button>
        </div>
      </header>

      {/* Integrity Banner */}
      <AnimatePresence>
        {integrity && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <div className={`p-4 border shadow-sm flex items-start gap-4 ${integrity.valid ? 'bg-verdict-genuine-bg border-verdict-genuine text-verdict-genuine' : 'bg-rose-500/10 border-rose-500 text-rose-700'}`}>
               {integrity.valid ? <CheckCircle2 size={24} className="shrink-0" /> : <AlertTriangle size={24} className="shrink-0" />}
               <div>
                 <p className="font-display text-xl">{integrity.valid ? 'Cryptographic Chain Valid' : 'CHAIN COMPROMISED'}</p>
                 <p className="font-mono text-[10px] mt-1 opacity-80 uppercase tracking-widest">
                   {integrity.valid ? `${integrity.entries_checked} entries verified securely.` : `Broken at entry #${integrity.broken_at}. Reason: ${integrity.reason}`}
                 </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-ink-muted mr-4">Filter</span>
        {['', 'ISSUE', 'VERIFY', 'REVOKE'].map(a => (
          <button
            key={a || 'all'}
            onClick={() => setAction(a)}
            className={`px-3 py-1.5 border transition-colors ${action === a ? 'bg-ink text-bg border-ink' : 'bg-surface border-line text-ink-muted hover:text-ink'}`}
          >
            {a || 'All Events'}
          </button>
        ))}
        <span className="ml-auto text-ink-muted">{total} Entries</span>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/30 p-3 text-rose-600 font-mono text-[10px]">{error}</div>}

      {/* Table */}
      <div className="bg-surface border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left font-mono whitespace-nowrap">
          <thead className="text-[9px] uppercase tracking-widest text-ink-muted bg-surface-2 border-b border-line">
            <tr>
              <th className="px-4 py-3 font-normal">#ID</th>
              <th className="px-4 py-3 font-normal">Timestamp</th>
              <th className="px-4 py-3 font-normal">Action</th>
              <th className="px-4 py-3 font-normal">Actor</th>
              <th className="px-4 py-3 font-normal">Document</th>
              <th className="px-4 py-3 font-normal">Entry Hash</th>
              <th className="px-4 py-3 font-normal text-right">Raw</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-[10px] text-ink">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 bg-surface-2 animate-pulse w-8"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-surface-2 animate-pulse w-24"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-surface-2 animate-pulse w-16"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-surface-2 animate-pulse w-20"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-surface-2 animate-pulse w-32"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-surface-2 animate-pulse w-24"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-surface-2 animate-pulse w-6 ml-auto"></div></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-ink-muted"><ScrollText size={32} className="mx-auto mb-2 opacity-50" />No entries found.</td></tr>
            ) : rows.map((r, i) => (
              <React.Fragment key={r.id}>
                <tr className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3 text-ink-muted">{String(r.id).padStart(5, '0')}</td>
                  <td className="px-4 py-3">{fmtDate(r.time, true)}</td>
                  <td className="px-4 py-3">
                     <span className={`px-2 py-1 border text-[9px] uppercase font-bold tracking-widest ${ACTION_COLOR[r.action] || 'border-line bg-surface text-ink'}`}>
                        {r.action}
                     </span>
                  </td>
                  <td className="px-4 py-3">{r.actor_role === 'admin' ? 'SYSTEM' : (r.actor_id ? `iss_${r.actor_id}` : 'PUBLIC')}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.doc_id ? `${r.doc_id.slice(0, 8)}…` : '—'}</td>
                  <td className="px-4 py-3 text-ink-muted" title={r.entry_hash}>{shortHash(r.entry_hash, 8, 8)}</td>
                  <td className="px-4 py-3 text-right">
                     <button onClick={() => setOpen(open === r.id ? null : r.id)} className="p-1 hover:bg-line transition-colors inline-block">
                        <ChevronDown size={14} className={open === r.id ? 'rotate-180' : ''} />
                     </button>
                  </td>
                </tr>
                <AnimatePresence>
                  {open === r.id && (
                    <tr className="bg-surface-2 border-t-0">
                      <td colSpan={7} className="px-4 py-4">
                         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                               <div className="bg-bg border border-line p-3">
                                  <p className="text-[9px] text-ink-muted uppercase tracking-widest mb-1">Previous Hash Pointer</p>
                                  <code className="text-[10px] break-all text-ink">{r.prev_hash}</code>
                               </div>
                               <div className="bg-bg border border-line p-3">
                                  <p className="text-[9px] text-ink-muted uppercase tracking-widest mb-1">Current Entry Hash (SHA-256)</p>
                                  <code className="text-[10px] break-all text-ink">{r.entry_hash}</code>
                               </div>
                            </div>
                            <div className="bg-bg border border-line p-3">
                               <p className="text-[9px] text-ink-muted uppercase tracking-widest mb-1">Decoded Payload</p>
                               <pre className="text-[10px] text-ink overflow-x-auto">{JSON.stringify(r.detail, null, 2)}</pre>
                            </div>
                         </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
