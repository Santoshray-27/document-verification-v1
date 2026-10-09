import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, FileUp, Info, ScanSearch, ShieldAlert } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import Logo from '../../components/Logo.jsx';
import UploadBox from '../../components/UploadBox.jsx';
import Stepper, { useElapsed } from '../../components/Stepper.jsx';
import { SkeletonCard } from '../../components/Skeleton.jsx';
import { fmtDate, fmtMs, verdictMeta } from '../../lib/format';

/**
 * Public page reached by scanning the QR. NO login, MINIMAL data, and a loud warning that
 * a registry record is not proof the file is unchanged.
 */
export default function PublicVerify() {
  const { docId } = useParams();
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [job, setJob] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const elapsed = useElapsed(running);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/public/verify/${docId}`);
        if (alive) setRec(data);
      } catch (e) {
        if (alive) setError(errMsg(e, 'This document ID could not be looked up.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [docId]);

  const start = async () => {
    if (!file) return setError('Choose the file you hold first.');
    setError('');
    setRunning(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/verify/start', fd);
      for (let i = 0; i < 300; i++) {
        const { data: j } = await api.get(`/verify/jobs/${data.job_id}`);
        setJob(j);
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
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (e) {
      setError(errMsg(e));
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="border-b border-white/[0.07] bg-navy-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Logo size={28} />
          <a href="/" className="text-xs font-semibold text-slate-400 transition hover:text-slate-200">About Agnitia</a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {loading && <SkeletonCard lines={4} />}

        {!loading && error && !rec && (
          <div className="glass p-7 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-400">
              <ShieldAlert size={26} />
            </span>
            <h1 className="text-xl font-bold text-white">Could not look this up</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{error}</p>
          </div>
        )}

        {rec && !rec.found && (
          <div className="glass p-7 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-400">
              <ShieldAlert size={26} />
            </span>
            <h1 className="text-xl font-bold text-white">No registry record found</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{rec.message}</p>
            <p className="mono mt-4 break-all text-[11px] text-slate-500">{rec.doc_id}</p>
          </div>
        )}

        {rec?.found && (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-7">
              <div className="flex items-start gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor: rec.status === 'active' ? '#10B98155' : '#F9731655',
                    background: rec.status === 'active' ? '#10B98114' : '#F9731614',
                    color: rec.status === 'active' ? '#10B981' : '#F97316',
                  }}
                >
                  {rec.status === 'active' ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                </span>
                <div className="min-w-0">
                  <p className="section-title">Registry record found</p>
                  <h1 className="mt-1 text-xl font-bold text-white">{rec.issuer_name}</h1>
                  <p className="mt-0.5 text-sm text-slate-400">{rec.message}</p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-3">
                <Fact icon={CalendarDays} label="Issued" value={fmtDate(rec.issued_at)} />
                <Fact label="Document type" value={(rec.doc_type || '').replace(/_/g, ' ')} />
                <Fact label="Status" value={rec.status} tone={rec.status === 'active' ? '#10B981' : '#F97316'} />
                <Fact label="Checks so far" value={String(rec.verification_count ?? 0)} />
              </dl>

              <p className="mono mt-4 break-all text-[11px] text-slate-500">{rec.doc_id}</p>
            </motion.div>

            {/* the warning that matters most on this page */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] p-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">A QR record is not proof your file is unchanged</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-amber-100/80">{rec.warning}</p>
                </div>
              </div>
            </motion.div>

            {!result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="glass mt-4 p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                  <FileUp size={17} className="text-gold-400" />
                  Upload the file you hold
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  This runs the full check — hash, signature, revocation, OCR and visual comparison — and tells you whether your copy is
                  untouched.
                </p>
                <div className="mt-4">
                  <UploadBox file={file} onFile={(f) => { setFile(f); setError(''); }} onError={setError} disabled={running} />
                </div>
                {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
                <button onClick={start} disabled={!file || running} className="btn-primary mt-4 w-full py-3">
                  {running ? `Verifying… ${fmtMs(elapsed)}` : <>Run exact verification <ArrowRight size={16} /></>}
                </button>
              </motion.div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass mt-4 p-7 text-center">
                <span
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: `${verdictMeta(result.verdict).color}66`,
                    background: `${verdictMeta(result.verdict).color}14`,
                    color: verdictMeta(result.verdict).color,
                  }}
                >
                  <ScanSearch size={30} />
                </span>
                <h2 className="mt-4 text-2xl font-bold text-white">{verdictMeta(result.verdict).label}</h2>
                <p className="mt-1.5 text-sm text-slate-400">Confidence: {result.confidence_level}</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">{verdictMeta(result.verdict).blurb}</p>
                <ul className="mx-auto mt-5 max-w-md space-y-2 text-left">
                  {result.reasons.slice(0, 3).map((x) => (
                    <li key={x.code} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">{x.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{x.detail}</p>
                    </li>
                  ))}
                </ul>
                {result.report_url && (
                  <a href={result.report_url} className="btn-primary mt-6">Download the full report</a>
                )}
              </motion.div>
            )}
          </>
        )}

        <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
          <Info size={12} className="mt-0.5 shrink-0" />
          Agnitia is an automated verification aid, not a legal certificate of authenticity. Only the issuer's own records can confirm a
          document was issued.
        </p>
      </main>

      {job && running && (
        <Stepper overlay steps={job.steps} progress={job.progress} title="Verifying your document" subtitle={`Running for ${fmtMs(elapsed)}`} />
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon size={11} />}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium capitalize" style={{ color: tone || '#E2E8F0' }}>
        {value || '—'}
      </dd>
    </div>
  );
}
