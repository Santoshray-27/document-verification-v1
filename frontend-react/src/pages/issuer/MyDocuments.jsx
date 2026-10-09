import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AlertCircle, Ban, Check, ChevronRight, ChevronLeft, Copy, Download, FilePlus2, Grid, LayoutList, Search, X, ShieldAlert, FileText, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { assetUrl, errMsg } from '../../api/axios';
import { queries } from '../../api/queries';
import { copyText, fmtDate } from '../../lib/format';
import { useToast } from '../../components/Toast';

const TABS = [
  { id: '', label: 'ALL DOCUMENTS' },
  { id: 'active', label: 'ACTIVE' },
  { id: 'revoked', label: 'REVOKED' },
];

const LIMIT = 25;

export default function MyDocuments() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { docId } = useParams();
  
  // URL sync state
  const params = new URLSearchParams(location.search);
  const status = params.get('status') || '';
  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '0', 10);
  
  // UI view state
  const [view, setView] = useState('table'); // 'table' | 'grid'
  
  // Selection & Details
  const [selected, setSelected] = useState(new Set());
  const [slideOverId, setSlideOverId] = useState(docId || null);

  useEffect(() => {
    if (docId && docId !== slideOverId) {
      setSlideOverId(docId);
    }
  }, [docId]);

  const closeSlideOver = () => {
    setSlideOverId(null);
    if (docId) navigate('/issuer/documents', { replace: true });
  };
  
  // Revocation
  const [revoking, setRevoking] = useState(null);
  const [reason, setReason] = useState('');

  const searchRef = useRef(null);

  // Sync state to URL
  const updateParams = (newParams) => {
    const p = new URLSearchParams(location.search);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === '' || v === 0 || v === null) p.delete(k);
      else p.set(k, v);
    });
    navigate({ search: p.toString() }, { replace: true });
  };

  const setStatus = (s) => updateParams({ status: s, page: 0 });
  const setSearch = (s) => updateParams({ search: s, page: 0 });
  const setPage = (p) => updateParams({ page: p });

  // Global hotkey for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Documents
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['documents', { status, search, page }],
    queryFn: async () => {
      const { data } = await api.get('/issuer/documents', {
        params: { status: status || undefined, search: search || undefined, limit: LIMIT, offset: page * LIMIT },
      });
      return data;
    },
    keepPreviousData: true,
  });

  const rows = data?.documents || [];
  const total = data?.total || 0;
  const maxPage = Math.max(0, Math.ceil(total / LIMIT) - 1);

  // Revoke Mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ docId, reason }) => {
      const { data } = await api.post(`/issuer/documents/${docId}/revoke`, { reason });
      return data;
    },
    onSuccess: () => {
      toast.show('Document successfully revoked', 'success');
      setRevoking(null);
      setReason('');
      setSlideOverId(null);
      queryClient.invalidateQueries(['documents']);
      queryClient.invalidateQueries(queries.issuer.dashboard()); // also refresh dashboard stats
    },
    onError: (err) => {
      toast.show(errMsg(err), 'error');
    }
  });

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.doc_id)));
  };

  const isNoResults = !isLoading && rows.length === 0 && (search || status);
  const isEmpty = !isLoading && rows.length === 0 && !search && !status;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 relative z-10 flex flex-col h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-6 shrink-0">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Registry Ledger</span>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-ink tracking-tight">
            My Documents
          </h1>
        </div>
        
        {/* TABS */}
        <div className="flex bg-surface-2 border border-line p-1">
          {TABS.map(t => {
            const isActive = status === t.id;
            return (
              <button 
                key={t.id} 
                onClick={() => setStatus(t.id)}
                className={`relative px-6 py-2 font-mono text-[10px] uppercase tracking-wider outline-none transition-colors ${isActive ? 'text-bg' : 'text-ink-muted hover:text-ink'}`}
              >
                {isActive && <motion.div layoutId="docTabs" className="absolute inset-0 bg-ink" />}
                <span className="relative z-10 flex items-center gap-2">
                  {t.label} 
                  {isActive && !isLoading && <span className="bg-bg text-ink px-1.5 py-0.5 rounded-sm">{total}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div className="relative w-full sm:max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipient, ID, or hash..."
            className="w-full pl-9 pr-12 py-2.5 bg-surface border border-line font-mono text-[11px] text-ink outline-none focus:border-ink placeholder:text-ink-muted/50"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] px-1.5 border border-line bg-surface-2 text-ink-muted rounded-sm hidden sm:block">/</kbd>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link to="/issuer/issue">
            <button className="px-4 py-2.5 bg-amber-500 text-ink font-mono font-bold text-[10px] uppercase border border-ink shadow-hard-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all flex items-center gap-2">
              <FilePlus2 size={14} /> NEW DOCUMENT
            </button>
          </Link>
          <div className="flex border border-line bg-surface ml-2">
            <button onClick={() => setView('table')} className={`p-2 transition-colors ${view === 'table' ? 'bg-ink text-bg' : 'text-ink-muted hover:text-ink'}`}>
              <LayoutList size={16} />
            </button>
            <button onClick={() => setView('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-ink text-bg' : 'text-ink-muted hover:text-ink'}`}>
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>

      {isError && (
        <div className="p-4 border border-verdict-forged bg-verdict-forged-bg flex gap-3 text-verdict-forged text-xs items-center font-mono">
          <AlertCircle size={16} className="shrink-0" /> {errMsg(error)}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 relative min-h-[400px]">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-surface-2 border border-line w-full" />)}
          </div>
        ) : isEmpty ? (
          // EMPTY STATE
          <div className="absolute inset-0 flex flex-col items-center justify-center border border-dashed border-line bg-surface/50 text-center p-8 overflow-hidden">
            <div className="text-[120px] font-display text-ink opacity-[0.03] rotate-[-15deg] whitespace-nowrap select-none mix-blend-multiply border-[8px] border-ink p-8 absolute z-0 pointer-events-none">
              NO ENTRIES YET
            </div>
            <div className="relative z-10">
              <FilePlus2 size={48} className="text-ink-muted mx-auto mb-6" />
              <h2 className="font-display text-3xl text-ink mb-2">The Ledger is Empty</h2>
              <p className="font-mono text-xs text-ink-muted mb-8 max-w-md mx-auto">
                No documents have been issued under this account yet. Issue your first certificate to establish the cryptographic registry.
              </p>
              <Link to="/issuer/issue">
                <button className="px-8 py-3 bg-ink text-bg font-mono font-bold text-[11px] uppercase border border-ink shadow-hard hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
                  Issue First Certificate
                </button>
              </Link>
            </div>
          </div>
        ) : isNoResults ? (
          // NO RESULTS
          <div className="absolute inset-0 flex flex-col items-center justify-center border border-dashed border-line bg-surface/50 text-center p-8">
            <Search size={32} className="text-ink-muted mb-4" />
            <h2 className="font-mono text-sm text-ink mb-4 uppercase tracking-widest">No Matches Found</h2>
            <button onClick={() => { setSearch(''); setStatus(''); }} className="font-mono text-[10px] text-amber-600 uppercase hover:underline">
              Clear Filters
            </button>
          </div>
        ) : (
          // DATA VIEWS
          <AnimatePresence mode="wait">
            <motion.div 
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pb-16"
            >
              {view === 'table' ? (
                <div className="border border-line bg-surface overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap border-collapse">
                    <thead className="bg-surface-2 border-b border-line font-mono text-[9px] uppercase tracking-wider text-ink-muted sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={selectAll} className="accent-amber-500" />
                        </th>
                        <th className="px-4 py-3 font-normal">#</th>
                        <th className="px-4 py-3 font-normal">RECIPIENT</th>
                        <th className="px-4 py-3 font-normal">CERT ID</th>
                        <th className="px-4 py-3 font-normal">ISSUED DATE</th>
                        <th className="px-4 py-3 font-normal text-right">STATUS</th>
                        <th className="px-4 py-3 font-normal text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[11px]">
                      {rows.map((r, i) => {
                        const isSelected = selected.has(r.doc_id);
                        return (
                          <tr 
                            key={r.doc_id} 
                            onClick={() => setSlideOverId(r.doc_id)}
                            className={`border-b border-line/50 transition-colors cursor-pointer group ${isSelected ? 'bg-amber-50' : 'hover:bg-surface-2'}`}
                          >
                            <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.doc_id)} className="accent-amber-500" />
                            </td>
                            <td className="px-4 py-4 text-ink-muted">{String(page * LIMIT + i + 1).padStart(3, '0')}</td>
                            <td className="px-4 py-4 text-ink font-sans text-sm font-medium">{r.fields?.name || '—'}</td>
                            <td className="px-4 py-4">
                              <span className="bg-bg border border-line px-1.5 py-0.5 rounded-sm text-ink-muted cursor-copy group-hover:border-ink transition-colors" onClick={e => { e.stopPropagation(); copyText(r.fields?.certificate_number); }}>
                                {r.fields?.certificate_number || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-ink-muted">{fmtDate(r.issued_at)}</td>
                            <td className="px-4 py-4 text-right">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider ${r.status === 'active' ? 'bg-verdict-genuine-bg text-verdict-genuine-text border border-verdict-genuine-border' : 'bg-verdict-revoked-bg text-verdict-revoked-text border border-verdict-revoked-border'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <a href={assetUrl(`/static/issued/${r.doc_id}.pdf`)} download title="Download PDF" className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-2 rounded">
                                  <Download size={14} />
                                </a>
                                <button title="Copy Verification Link" onClick={() => copyText(`${window.location.origin}/public/verify/${r.doc_id}`)} className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-2 rounded">
                                  <Copy size={14} />
                                </button>
                                {r.status === 'active' && (
                                  <button title="Revoke" onClick={() => setRevoking(r)} className="p-1.5 text-verdict-forged/60 hover:text-verdict-forged hover:bg-verdict-forged-bg rounded">
                                    <Ban size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {rows.map(r => (
                    <div 
                      key={r.doc_id}
                      onClick={() => setSlideOverId(r.doc_id)}
                      className="border border-line bg-surface p-4 flex flex-col group hover:-translate-y-1 hover:shadow-hard transition-all cursor-pointer relative"
                    >
                      <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(r.doc_id)} onChange={() => toggleSelect(r.doc_id)} className="accent-amber-500 w-4 h-4" />
                      </div>
                      
                      <div className="w-full aspect-[1/1.4] bg-bg border border-line/50 p-4 relative mb-4 flex flex-col justify-between overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-center font-display text-sm tracking-widest text-ink/40">EVIDENTIA</div>
                        <div className="text-center font-display text-xl text-ink leading-tight">{r.fields?.name}</div>
                        <div className="flex justify-between items-end border-t border-line/50 pt-2">
                           <span className="font-mono text-[6px] text-ink-muted">ID: {r.fields?.certificate_number}</span>
                           <span className="w-6 h-6 border border-line bg-surface-2 flex items-center justify-center text-ink-muted"><FileText size={12}/></span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-mono text-[11px] text-ink font-bold truncate max-w-[150px]">{r.fields?.certificate_number}</h3>
                          <span className={`px-1 text-[8px] uppercase border ${r.status === 'active' ? 'bg-verdict-genuine-bg text-verdict-genuine border-verdict-genuine' : 'bg-verdict-revoked-bg text-verdict-revoked border-verdict-revoked'}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="font-mono text-[9px] text-ink-muted mb-4">{fmtDate(r.issued_at)}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-line pt-3" onClick={e => e.stopPropagation()}>
                        <a href={assetUrl(`/static/issued/${r.doc_id}.pdf`)} download className="font-mono text-[9px] text-ink-muted hover:text-ink uppercase tracking-wider flex items-center gap-1">
                          <Download size={10} /> PDF
                        </a>
                        <button className="font-mono text-[9px] text-amber-600 hover:underline uppercase tracking-wider flex items-center gap-1">
                          VIEW DETAILS <ChevronRight size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination Controls */}
              {total > LIMIT && (
                <div className="flex items-center justify-between border-t border-line mt-6 pt-6">
                  <span className="font-mono text-[10px] text-ink-muted">
                    SHOWING {page * LIMIT + 1} - {Math.min((page + 1) * LIMIT, total)} OF {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPage(page - 1)} 
                      disabled={page === 0}
                      className="p-2 bg-surface border border-line hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed text-ink-muted hover:text-ink transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button 
                      onClick={() => setPage(page + 1)} 
                      disabled={page >= maxPage}
                      className="p-2 bg-surface border border-line hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed text-ink-muted hover:text-ink transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* FLOATING ACTION BAR (Bulk Select) */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-bg px-6 py-3 border border-line shadow-hard flex items-center gap-6 z-40"
          >
            <span className="font-mono text-[11px] font-bold">
              {selected.size} SELECTED
            </span>
            <div className="w-px h-4 bg-line/30" />
            <button className="font-mono text-[10px] uppercase text-bg/80 hover:text-bg flex items-center gap-2">
              <Download size={12} /> BULK DOWNLOAD
            </button>
            <button className="font-mono text-[10px] uppercase text-verdict-forged hover:text-rose-400 flex items-center gap-2">
              <Ban size={12} /> BULK REVOKE
            </button>
            <button onClick={() => setSelected(new Set())} className="ml-4 font-mono text-[10px] text-bg/50 hover:text-bg">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SLIDEOVER (Document Details) */}
      <AnimatePresence>
        {slideOverId && (
          <SlideOver docId={slideOverId} onClose={closeSlideOver} onRevoke={(doc) => setRevoking(doc)} />
        )}
      </AnimatePresence>

      {/* REVOKE MODAL */}
      <AnimatePresence>
        {revoking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg bg-surface border border-line shadow-hard p-6">
              <div className="flex items-center gap-3 mb-4 border-b border-line pb-4">
                 <div className="w-10 h-10 bg-verdict-forged-bg border border-verdict-forged rounded flex items-center justify-center text-verdict-forged">
                   <ShieldAlert size={20} />
                 </div>
                 <div>
                   <h2 className="font-display text-2xl text-ink">Revoke Registry Document</h2>
                   <p className="font-mono text-[9px] text-ink-muted uppercase">Irreversible Cryptographic Action</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                <p className="font-mono text-[11px] text-ink leading-relaxed">
                  Revoking <strong className="font-sans text-sm">{revoking.fields?.name}</strong> (ID: {revoking.fields?.certificate_number}) will permanently invalidate its registry status. Future verifications will flag the document as <span className="text-verdict-forged bg-verdict-forged-bg px-1 font-bold">REVOKED</span>.
                </p>
                <div>
                  <label className="font-mono text-[10px] uppercase text-ink-muted mb-2 block">Revocation Reason (Publicly Visible Audit Log)</label>
                  <textarea 
                    rows={3} 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Withdrawn due to academic correction..." 
                    className="w-full bg-surface-2 border border-line p-3 font-mono text-xs text-ink outline-none focus:border-verdict-forged focus:ring-1 focus:ring-verdict-forged resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-line">
                <button onClick={() => { setRevoking(null); setReason(''); }} className="px-4 py-2 font-mono text-[10px] uppercase text-ink-muted hover:text-ink">Cancel</button>
                <button 
                  onClick={() => revokeMutation.mutate({ docId: revoking.doc_id, reason })}
                  disabled={!reason.trim() || revokeMutation.isLoading}
                  className="px-6 py-2 bg-verdict-forged text-bg font-mono font-bold text-[10px] uppercase border border-verdict-forged shadow-hard-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {revokeMutation.isLoading ? 'REVOKING...' : 'CONFIRM REVOCATION'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlideOver({ docId, onClose, onRevoke }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['document', docId],
    queryFn: async () => {
      const { data } = await api.get(`/issuer/documents/${docId}`);
      return data.document;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
        onClick={onClose}
        className="absolute inset-0 bg-bg/50 backdrop-blur-sm cursor-pointer" 
      />
      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-surface border-l border-line h-full shadow-2xl flex flex-col"
      >
        <div className="h-14 border-b border-line bg-surface-2 flex items-center justify-between px-6 shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">DOCUMENT DETAILS</span>
          <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink bg-bg border border-line rounded-sm">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative">
          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-8 bg-surface-2 w-3/4 rounded-sm" />
              <div className="h-4 bg-surface-2 w-1/2 rounded-sm" />
              <div className="h-32 bg-surface-2 w-full mt-8 rounded-sm" />
            </div>
          ) : isError ? (
            <div className="text-verdict-forged font-mono text-sm">Failed to load document details.</div>
          ) : data ? (
            <>
              {/* Meta Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-2xl text-ink">{data.fields?.name}</h2>
                  <span className={`px-2 py-1 text-[9px] uppercase border font-mono ${data.status === 'active' ? 'bg-verdict-genuine-bg text-verdict-genuine border-verdict-genuine' : 'bg-verdict-revoked-bg text-verdict-revoked border-verdict-revoked'}`}>
                    {data.status}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-ink-muted">ID: {data.fields?.certificate_number}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-line bg-surface-2 p-3 flex flex-col gap-1">
                  <span className="font-mono text-[9px] uppercase text-ink-muted flex items-center gap-1.5"><Activity size={12}/> CHECKS</span>
                  <span className="font-display text-2xl text-ink">{data.verifications || 0}</span>
                </div>
                <div className="border border-line bg-surface-2 p-3 flex flex-col gap-1">
                  <span className="font-mono text-[9px] uppercase text-ink-muted flex items-center gap-1.5"><FileText size={12}/> TYPE</span>
                  <span className="font-display text-lg text-ink truncate mt-1" title={data.doc_type}>{data.doc_type?.replace('_', ' ') || 'CERTIFICATE'}</span>
                </div>
              </div>

              {/* Audit Timeline */}
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted border-b border-line pb-2 mb-4">AUDIT TRAIL</h3>
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-line">
                  <div className="relative pl-6">
                    <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-verdict-genuine border-2 border-surface" />
                    <p className="font-mono text-[10px] text-ink">Document Issued & Signed</p>
                    <p className="font-mono text-[9px] text-ink-muted">{fmtDate(data.issued_at, true)}</p>
                  </div>
                  {data.status === 'revoked' && (
                    <div className="relative pl-6">
                      <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-verdict-forged border-2 border-surface" />
                      <p className="font-mono text-[10px] text-verdict-forged font-bold">Document Revoked</p>
                      <p className="font-mono text-[9px] text-ink-muted bg-surface-2 p-2 mt-1 border border-line">{data.revoke_reason || 'Administrative action'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cryptographic Details */}
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted border-b border-line pb-2 mb-4">CRYPTOGRAPHY</h3>
                <div className="space-y-3 font-mono text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-ink-muted mb-1">DOCUMENT ID (UUID)</span>
                    <span className="bg-surface-2 border border-line p-1.5 break-all text-ink cursor-copy" onClick={() => copyText(data.doc_id)}>{data.doc_id}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-ink-muted mb-1">FILE SHA-256 HASH</span>
                    <span className="bg-surface-2 border border-line p-1.5 break-all text-ink cursor-copy" onClick={() => copyText(data.file_hash)}>{data.file_hash}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-ink-muted mb-1">SIGNING KEY (KID)</span>
                    <span className="text-ink break-all">{data.kid}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {data && (
          <div className="border-t border-line p-4 shrink-0 grid grid-cols-2 gap-2 bg-surface">
            <a href={assetUrl(data.pdf_url)} download className="col-span-2 text-center py-2 bg-ink text-bg font-mono text-[10px] uppercase font-bold hover:bg-ink-muted transition-colors border border-ink">
              DOWNLOAD PDF
            </a>
            <button onClick={() => copyText(`${window.location.origin}/public/verify/${data.doc_id}`)} className="text-center py-2 bg-surface-2 text-ink font-mono text-[10px] uppercase border border-line hover:bg-surface-2/50 transition-colors">
              COPY LINK
            </button>
            <button 
              disabled={data.status === 'revoked'}
              onClick={() => onRevoke(data)}
              className={`text-center py-2 font-mono text-[10px] uppercase border transition-colors ${data.status === 'revoked' ? 'bg-bg text-ink-muted border-line opacity-50 cursor-not-allowed' : 'bg-verdict-forged-bg text-verdict-forged border-verdict-forged hover:bg-verdict-forged hover:text-bg'}`}
            >
              REVOKE
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
