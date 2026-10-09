import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Check, Copy, Download, FileText, QrCode, Sparkles } from 'lucide-react';
import api, { assetUrl, errMsg } from '../../api/axios';
import Stepper from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { copyText, DOC_TYPES, fmtDate, shortHash } from '../../lib/format';

const BLANK = {
  doc_type: 'academic_certificate',
  name: '',
  certificate_number: '',
  course: '',
  grade: '',
  issue_date: new Date().toISOString().slice(0, 10),
  expires_at: '',
};

const FIELDS = [
  { key: 'name', label: 'Recipient name', placeholder: 'Aarav Sharma', required: true },
  { key: 'certificate_number', label: 'Certificate ID', placeholder: 'AGN-2026-001', required: true, mono: true },
  { key: 'course', label: 'Course / title', placeholder: 'B.Tech Computer Science', required: true },
  { key: 'grade', label: 'Grade', placeholder: 'A+', required: true },
];

export default function IssueDocument() {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [touched, setTouched] = useState({});
  const [job, setJob] = useState(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const errors = useMemo(() => {
    const e = {};
    FIELDS.forEach((f) => {
      if (f.required && !String(form[f.key] || '').trim()) e[f.key] = 'Required';
    });
    if (form.issue_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.issue_date)) e.issue_date = 'Use YYYY-MM-DD';
    if (form.expires_at && form.expires_at <= form.issue_date) e.expires_at = 'Must be after the issue date';
    return e;
  }, [form]);

  const valid = Object.keys(errors).length === 0;

  const suggestId = () => {
    const n = String(Math.floor(Math.random() * 900) + 100);
    set('certificate_number', `AGN-${new Date().getFullYear()}-${n}`);
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: 1, certificate_number: 1, course: 1, grade: 1, issue_date: 1, expires_at: 1 });
    if (!valid) return setError('Fix the highlighted fields first.');
    setError('');
    setPolling(true);
    setResult(null);
    try {
      const { data } = await api.post('/issue/start', {
        doc_type: form.doc_type,
        fields: {
          name: form.name.trim(),
          certificate_number: form.certificate_number.trim(),
          course: form.course.trim(),
          grade: form.grade.trim(),
          issue_date: form.issue_date,
        },
        expires_at: form.expires_at || null,
      });
      poll(data.job_id);
    } catch (err) {
      setError(errMsg(err));
      setPolling(false);
    }
  };

  const poll = async (jobId) => {
    for (let i = 0; i < 240; i++) {
      try {
        const { data } = await api.get(`/issue/jobs/${jobId}`);
        setJob(data);
        if (data.status === 'done') {
          setResult(data.result);
          setPolling(false);
          toast.success('Certificate issued and signed');
          return;
        }
        if (data.status === 'failed') {
          setError(data.error || 'Issuing failed');
          setPolling(false);
          toast.error(data.error || 'Issuing failed');
          return;
        }
      } catch (err) {
        setError(errMsg(err));
        setPolling(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    setError('Issuing timed out');
    setPolling(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="section-title">Issuer</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Issue a new document</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Fill the fields, watch every cryptographic step run, then download the signed PDF. The QR inside it points at a public verification
          page — it never contains the file hash, because the hash cannot exist before the PDF does.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* -------- form -------- */}
        <form onSubmit={submit} className="glass h-fit p-6">
          <label className="label" htmlFor="doc_type">Document type</label>
          <select id="doc_type" className="input mb-5" value={form.doc_type} onChange={(e) => set('doc_type', e.target.value)}>
            {DOC_TYPES.map((t) => (
              <option key={t.id} value={t.id} className="bg-navy-800">{t.label}</option>
            ))}
          </select>
          <p className="mb-5 -mt-3 text-[11px] text-slate-500">
            Only the academic certificate template is fully built; the others reuse the same signing pipeline.
          </p>

          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={f.key}>{f.label}</label>
                <div className="relative">
                  <input
                    id={f.key}
                    className={`input ${f.mono ? 'mono pr-24' : ''} ${touched[f.key] && errors[f.key] ? 'border-rose-400/60' : ''}`}
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, [f.key]: 1 }))}
                  />
                  {f.key === 'certificate_number' && (
                    <button type="button" onClick={suggestId} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold-400 transition hover:bg-white/10">
                      Suggest
                    </button>
                  )}
                </div>
                {touched[f.key] && errors[f.key] && <p className="mt-1.5 text-xs text-rose-300">{errors[f.key]}</p>}
              </div>
            ))}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="issue_date">Issue date</label>
                <input id="issue_date" type="date" className="input" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} />
                {touched.issue_date && errors.issue_date && <p className="mt-1.5 text-xs text-rose-300">{errors.issue_date}</p>}
              </div>
              <div>
                <label className="label" htmlFor="expires_at">Expiry (optional)</label>
                <input id="expires_at" type="date" className="input" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />
                {touched.expires_at && errors.expires_at && <p className="mt-1.5 text-xs text-rose-300">{errors.expires_at}</p>}
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={!valid || polling} className="btn-primary mt-6 w-full">
            {polling ? 'Issuing…' : 'Issue document'}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
            The private key never leaves the server. Only the signature is stored.
          </p>
        </form>

        {/* -------- live preview -------- */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <p className="section-title mb-3">Live preview</p>
          <Preview form={form} />
        </div>
      </div>

      {/* -------- stepper overlay -------- */}
      <AnimatePresence>
        {job && !result && (
          <Stepper
            overlay
            steps={job.steps}
            progress={job.progress}
            title="Issuing and signing your document"
            subtitle="Every step below actually ran — nothing is simulated."
            error={job.error}
          />
        )}
      </AnimatePresence>

      {/* -------- success -------- */}
      <AnimatePresence>
        {result && <SuccessCard result={result} onClose={() => { setResult(null); setJob(null); setForm(BLANK); }} />}
      </AnimatePresence>
    </div>
  );
}

function SuccessCard({ result, onClose }) {
  const toast = useToast();
  const copy = async (text, what) => {
    if (await copyText(text)) toast.success(`${what} copied`);
    else toast.error('Could not copy');
  };

  return (
    <motion.div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-navy-950/85 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.94, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto p-7"
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/12 text-emerald-400">
            <Check size={22} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">Document issued</h2>
            <p className="text-sm text-slate-400">Signed with ECDSA P-256 and stored in the registry.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2.5">
            <Row label="Recipient" value={result.fields?.name} />
            <Row label="Certificate ID" value={result.fields?.certificate_number} mono />
            <Row label="Issuer" value={result.issuer_name} />
            <Row label="Issued" value={fmtDate(result.issued_at, true)} />
            <Row label="Document ID" value={result.doc_id} mono onCopy={() => copy(result.doc_id, 'Document ID')} />
            <Row label="File hash" value={shortHash(result.file_hash, 16, 10)} mono onCopy={() => copy(result.file_hash, 'File hash')} />
            <Row label="Fields hash" value={shortHash(result.fields_hash, 16, 10)} mono onCopy={() => copy(result.fields_hash, 'Fields hash')} />
            <Row label="Signing key" value={result.kid} mono />
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.07] bg-navy-950/50 p-4">
            <QrCode size={20} className="text-gold-400" />
            <p className="text-center text-[10px] uppercase tracking-wider text-slate-500">QR inside the PDF</p>
            <code className="mono max-w-[180px] break-all text-center text-[9px] leading-relaxed text-slate-400">{result.verify_url}</code>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <a href={assetUrl(result.pdf_url)} download className="btn-primary">
            <Download size={16} />
            Download PDF
          </a>
          <button onClick={() => copy(result.verify_url, 'Verification link')} className="btn-ghost">
            <Copy size={15} />
            Copy verification link
          </button>
          <Link to="/issuer/documents" className="btn-ghost">
            <FileText size={15} />
            My documents
          </Link>
          <button onClick={onClose} className="btn-ghost ml-auto">Issue another</button>
        </div>

        <p className="mt-5 flex items-start gap-2 rounded-xl border border-gold-400/20 bg-gold-500/[0.06] px-3.5 py-3 text-xs leading-relaxed text-gold-200/90">
          <Sparkles size={14} className="mt-0.5 shrink-0" />
          For a judge's phone to open the QR, set <code className="mono mx-1">PUBLIC_BASE_URL</code> to your tunnel URL and re-issue — a
          localhost link will not resolve off this machine.
        </p>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, mono, onCopy }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
      <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`min-w-0 flex-1 truncate text-sm text-slate-200 ${mono ? 'mono text-xs' : ''}`}>{value || '—'}</span>
      {onCopy && (
        <button onClick={onCopy} className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200" aria-label={`Copy ${label}`}>
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}

/** HTML/CSS mirror of the ReportLab template, so the preview matches the real PDF. */
function Preview({ form }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#FBFBFD] text-slate-900 shadow-glass">
      <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-navy-700" />
      <div className="pointer-events-none absolute inset-[18px] rounded border border-gold-600/70" />
      <div className="relative px-9 py-10 text-center">
        <p className="text-lg font-bold tracking-[0.28em] text-navy-700">AGNITIA</p>
        <p className="mt-1 text-[8px] tracking-[0.24em] text-gold-600">PROOF IN EVERY PIXEL</p>
        <div className="mx-auto mt-2.5 h-px w-32 bg-gold-600/70" />
        <p className="mt-3 text-[11px] font-semibold text-navy-600">Meridian Institute of Technology</p>
        <p className="text-[8px] italic text-slate-500">Digitally signed and registered document</p>

        <p className="mt-8 text-[13px] font-bold tracking-wide text-navy-700">CERTIFICATE OF COMPLETION</p>
        <p className="mt-4 text-[9px] text-slate-500">This is to certify that</p>
        <p className="mt-2 font-serif text-2xl font-bold text-slate-900">{form.name || 'Recipient Name'}</p>
        <div className="mx-auto mt-1 h-px w-52 bg-gold-600/80" />
        {form.course && <p className="mt-4 text-[10px] text-slate-700">has successfully completed {form.course}</p>}
        {form.grade && <p className="mt-1.5 text-[10px] font-bold text-navy-700">Grade: {form.grade}</p>}
        {form.issue_date && <p className="mt-1.5 text-[10px] text-slate-700">Issued on {form.issue_date}</p>}

        <div className="mx-auto mt-6 flex w-full max-w-sm items-end justify-between gap-3 rounded-md bg-slate-100/80 px-3 py-2.5 text-left">
          <div className="space-y-1">
            {[
              ['CERTIFICATE ID', form.certificate_number || '—'],
              ['ISSUE DATE', form.issue_date || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="w-20 text-[6px] font-bold tracking-wide text-slate-500">{k}</span>
                <span className="mono text-[7px] text-slate-800">{v}</span>
              </div>
            ))}
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-gold-600/60 bg-white text-center text-[6px] font-semibold leading-tight text-navy-700">
            <span>
              <QrCode size={22} className="mx-auto text-navy-700" />
              SCAN TO VERIFY
            </span>
          </span>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[7px] text-slate-500">
          <CalendarDays size={8} /> Agnitia · Proof in Every Pixel · signed ECDSA-P256
        </p>
      </div>
    </div>
  );
}
