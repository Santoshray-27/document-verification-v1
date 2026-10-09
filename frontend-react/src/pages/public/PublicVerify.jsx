import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileUp,
  Info,
  ScanSearch,
  ShieldAlert,
} from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import Logo from '../../components/Logo.jsx';
import UploadBox from '../../components/UploadBox.jsx';
import Stepper, { useElapsed } from '../../components/Stepper.jsx';
import { SkeletonCard } from '../../components/Skeleton.jsx';
import { fmtDate, fmtMs, verdictMeta } from '../../lib/format';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';

/**
 * Public page reached by scanning the QR. NO login, MINIMAL data, and a clear warning that
 * a registry record alone is not proof the held file is unchanged.
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
        if (alive) setError(errMsg(e, 'This document ID could not be looked up in the registry.'));
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Public Top Navbar */}
      <header className="border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <Logo size={28} />
          </Link>
          <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            About Agnitia
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 space-y-5">
        {loading && <SkeletonCard lines={4} />}

        {!loading && error && !rec && (
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
              <ShieldAlert size={26} />
            </span>
            <h1 className="font-display text-xl font-bold text-foreground">Record Unavailable</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error}</p>
          </div>
        )}

        {rec && !rec.found && (
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
              <ShieldAlert size={26} />
            </span>
            <h1 className="font-display text-xl font-bold text-foreground">No Registry Record Found</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{rec.message}</p>
            <p className="font-mono mt-4 break-all text-xs text-muted-foreground bg-muted p-2 rounded-lg border border-border">
              {rec.doc_id}
            </p>
          </div>
        )}

        {rec?.found && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-lg"
            >
              <div className="flex items-start gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-2xs"
                  style={{
                    borderColor: rec.status === 'active' ? '#10B98150' : '#EA580C50',
                    background: rec.status === 'active' ? '#10B98115' : '#EA580C15',
                    color: rec.status === 'active' ? '#10B981' : '#EA580C',
                  }}
                >
                  {rec.status === 'active' ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Public Registry Record Found
                  </span>
                  <h1 className="mt-0.5 font-display text-xl font-bold text-foreground">{rec.issuer_name}</h1>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rec.message}</p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-3">
                <Fact icon={CalendarDays} label="Issued" value={fmtDate(rec.issued_at)} />
                <Fact label="Document Type" value={(rec.doc_type || '').replace(/_/g, ' ')} />
                <Fact
                  label="Registry Status"
                  value={rec.status}
                  tone={rec.status === 'active' ? '#10B981' : '#EA580C'}
                />
                <Fact label="Verifications" value={String(rec.verification_count ?? 0)} />
              </dl>

              <p className="font-mono mt-4 break-all text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border">
                {rec.doc_id}
              </p>
            </motion.div>

            {/* Critical Trust Warning */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold">A QR record is not proof your file is unchanged</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{rec.warning}</p>
                </div>
              </div>
            </motion.div>

            {!result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm"
              >
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <FileUp size={18} className="text-amber-700 dark:text-amber-400" />
                  Upload your file to perform forensic cross-check
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  We check file hash, ECDSA signature, and OCR text against the signed registry to confirm whether your copy is pristine.
                </p>
                <div className="mt-4">
                  <UploadBox file={file} onFile={(f) => { setFile(f); setError(''); }} onError={setError} disabled={running} />
                </div>
                {error && <p className="mt-3 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
                <Button
                  onClick={start}
                  disabled={!file || running}
                  loading={running}
                  variant="default"
                  size="lg"
                  className="mt-4 w-full"
                >
                  {running ? `Executing Verification… (${fmtMs(elapsed)})` : <>Run Exact Verification <ArrowRight size={16} /></>}
                </Button>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-7 text-center shadow-lg"
              >
                <span
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-xs"
                  style={{
                    borderColor: verdictMeta(result.verdict).color,
                    background: `${verdictMeta(result.verdict).color}15`,
                    color: verdictMeta(result.verdict).color,
                  }}
                >
                  <ScanSearch size={30} />
                </span>
                <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
                  {verdictMeta(result.verdict).label}
                </h2>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge variant="outline">Confidence: {result.confidence_level}</Badge>
                </div>
                <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
                  {verdictMeta(result.verdict).blurb}
                </p>
                <ul className="mx-auto mt-5 max-w-md space-y-2 text-left">
                  {result.reasons?.slice(0, 3).map((x) => (
                    <li key={x.code} className="rounded-xl border border-border bg-muted/30 p-3.5">
                      <p className="text-xs font-semibold text-foreground">{x.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{x.detail}</p>
                    </li>
                  ))}
                </ul>
                {result.report_url && (
                  <a href={result.report_url} download className="inline-block mt-6">
                    <Button variant="default">Download Full Audit Report</Button>
                  </a>
                )}
              </motion.div>
            )}
          </>
        )}

        <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground text-center justify-center">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Agnitia is a cryptographic verification system. Digital signatures confirm institutional authenticity.</span>
        </p>
      </main>

      {job && running && (
        <Stepper
          overlay
          steps={job.steps}
          progress={job.progress}
          title="Verifying Your Document"
          subtitle={`Running for ${fmtMs(elapsed)}`}
        />
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon size={12} />}
        {label}
      </dt>
      <dd className="mt-1 text-xs font-medium capitalize text-foreground" style={{ color: tone }}>
        {value || '—'}
      </dd>
    </div>
  );
}
