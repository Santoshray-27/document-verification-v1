import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ShieldAlert, ScanSearch, CheckCircle2, RotateCcw } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import Logo from '../../components/Logo.jsx';
import { VERDICT_META } from '../../lib/format';

export default function PublicVerify() {
  const { docId } = useParams();
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/public/verify/${docId}`);
        if (alive) setRec(data);
      } catch (e) {
        if (alive) setError(errMsg(e, 'Record not found in the registry.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [docId]);

  const start = async () => {
    if (!file) return setError('Please select a file to cross-check.');
    setError('');
    setRunning(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/verify/start', fd);
      for (let i = 0; i < 300; i++) {
        const { data: j } = await api.get(`/verify/jobs/${data.job_id}`);
        if (j.status === 'done') {
          const { data: res } = await api.get(`/verify/jobs/${data.job_id}/result`);
          setResult(res);
          setRunning(false);
          return;
        }
        if (j.status === 'failed') {
          setError(j.error || 'Verification failed');
          setRunning(false);
          return;
        }
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      setError(errMsg(e));
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans relative overflow-x-hidden">
      {/* Background grain */}
      <div className="fixed inset-0 bg-graph-paper bg-graph opacity-20 pointer-events-none" />

      {/* Top Bar */}
      <header className="border-b border-line bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={20} withWord={false} />
            <span className="font-display text-lg tracking-wide">EVIDENTIA</span>
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted hidden sm:block">Public Verification Terminal</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6 relative z-10">
        
        {loading && (
           <div className="animate-pulse space-y-4">
             <div className="h-32 bg-surface-2 border border-line" />
             <div className="h-64 bg-surface-2 border border-line" />
           </div>
        )}

        {!loading && error && !rec && (
          <div className="bg-surface border border-rose-500/30 p-8 text-center shadow-hard">
            <ShieldAlert size={32} className="mx-auto text-rose-600 mb-4" />
            <h1 className="font-display text-2xl mb-2">Record Unavailable</h1>
            <p className="font-mono text-[10px] text-ink-muted">{error}</p>
          </div>
        )}

        {!loading && rec && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-line shadow-hard relative p-6 sm:p-8">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ink -translate-x-[2px] -translate-y-[2px]" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ink translate-x-[2px] -translate-y-[2px]" />
            
            <div className="flex items-start gap-4 border-b border-line pb-6 mb-6">
              <div className={`w-12 h-12 flex items-center justify-center shrink-0 border ${rec.status === 'active' ? 'border-verdict-genuine bg-verdict-genuine-bg text-verdict-genuine' : 'border-verdict-forged bg-verdict-forged-bg text-verdict-forged'}`}>
                {rec.status === 'active' ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Cryptographic Ledger Record</span>
                <h1 className="font-display text-2xl sm:text-3xl mt-1">{rec.issuer_name || 'Unknown Issuer'}</h1>
                <p className="font-mono text-[10px] mt-2 bg-surface-2 border border-line px-2 py-1 truncate">{rec.doc_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-[10px] mb-8">
               <div><p className="text-ink-muted uppercase tracking-widest mb-1">Status</p><p className={rec.status === 'active' ? 'text-verdict-genuine' : 'text-verdict-forged'}>{rec.status}</p></div>
               <div><p className="text-ink-muted uppercase tracking-widest mb-1">Issued</p><p>{new Date(rec.issued_at).toLocaleDateString()}</p></div>
               <div><p className="text-ink-muted uppercase tracking-widest mb-1">Checks</p><p>{rec.verification_count}</p></div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex gap-3 text-amber-800 text-xs font-mono">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <div>
                <strong>A QR scan is not cryptographic proof.</strong>
                <p className="mt-1 opacity-80 text-[10px]">This page only proves a record exists. To prove the document in your hand is exactly the original, run the deterministic check below.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action / Results Phase */}
        <AnimatePresence mode="wait">
          {!loading && rec && !result && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="bg-surface border border-line shadow-hard p-6 sm:p-8">
              <h2 className="font-display text-xl mb-4">Run Deterministic Check</h2>
              <div className="border border-dashed border-ink/20 bg-surface-2 p-8 flex flex-col items-center justify-center text-center cursor-pointer relative group">
                <input type="file" onChange={e => {setFile(e.target.files[0]); setError('');}} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <ScanSearch size={32} className="text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
                <p className="font-mono text-xs font-bold uppercase tracking-wider mb-2">{file ? file.name : 'Tap or drop file here'}</p>
                <p className="font-mono text-[9px] text-ink-muted">Validates SHA-256 Hash & ECDSA Signature</p>
              </div>
              
              {error && <p className="font-mono text-[10px] text-rose-600 mt-4 bg-rose-500/10 p-2 border border-rose-500/20">{error}</p>}
              
              <button 
                onClick={start} 
                disabled={!file || running} 
                className="mt-6 w-full py-4 bg-ink text-bg font-mono font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-ink/90 transition-colors"
              >
                {running ? 'ANALYZING...' : <>RUN VERIFICATION <ArrowRight size={14} /></>}
              </button>
            </motion.div>
          )}

          {result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-line shadow-hard p-6 sm:p-8 text-center relative overflow-hidden">
               <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('/noise.svg')]" />
               
               {/* Verdict Seal */}
               <div className={`mx-auto w-32 h-32 border-4 rounded-full flex flex-col items-center justify-center mix-blend-multiply mb-6 ${VERDICT_META[result.verdict]?.color ? `border-${VERDICT_META[result.verdict].color} text-${VERDICT_META[result.verdict].color}` : 'border-ink text-ink'}`} style={{ borderColor: VERDICT_META[result.verdict]?.color, color: VERDICT_META[result.verdict]?.color }}>
                 <span className="font-display text-2xl font-bold uppercase -mb-1">{VERDICT_META[result.verdict]?.label || result.verdict}</span>
                 <span className="font-mono text-[8px] tracking-widest uppercase">CRYPTOGRAPHIC SEAL</span>
               </div>
               
               <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-6">Confidence: {result.confidence_level}</p>
               
               <div className="text-left space-y-2 mb-8">
                 {result.reasons?.map((r, i) => (
                   <div key={i} className="border border-line bg-surface-2 p-3 flex items-start gap-3">
                     <span className="font-mono text-[8px] border border-ink px-1 mt-0.5">{r.code}</span>
                     <div>
                       <p className="font-mono text-[10px] font-bold text-ink uppercase">{r.title}</p>
                       <p className="font-mono text-[9px] text-ink-muted">{r.detail}</p>
                     </div>
                   </div>
                 ))}
               </div>

               <button onClick={() => { setResult(null); setFile(null); }} className="mx-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest hover:text-amber-600 transition-colors">
                 <RotateCcw size={14} /> Verify Another Document
               </button>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="text-center py-6 border-t border-line mt-8">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
            Verified by Evidentia · ECDSA P-256 + SHA-256 Cryptographic Verification
          </p>
        </footer>
      </main>
    </div>
  );
}
