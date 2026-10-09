import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Check, Copy, Download, FileText, QrCode, Sparkles, Wand2 } from 'lucide-react';
import api, { assetUrl, errMsg } from '../../api/axios';
import Stepper from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { copyText, DOC_TYPES, fmtDate, shortHash } from '../../lib/format';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';
import { Select } from '../../components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.jsx';

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
  { key: 'name', label: 'Recipient Name', placeholder: 'e.g. Aarav Sharma', required: true },
  { key: 'certificate_number', label: 'Certificate / Credential ID', placeholder: 'e.g. AGN-2026-001', required: true, mono: true },
  { key: 'course', label: 'Course / Degree Title', placeholder: 'e.g. B.Tech Computer Science', required: true },
  { key: 'grade', label: 'Grade / Classification', placeholder: 'e.g. First Class Honours / A+', required: true },
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
      if (f.required && !String(form[f.key] || '').trim()) e[f.key] = 'Required field';
    });
    if (form.issue_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.issue_date)) e.issue_date = 'Use format YYYY-MM-DD';
    if (form.expires_at && form.expires_at <= form.issue_date) e.expires_at = 'Expiry must be after issue date';
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
    if (!valid) return setError('Please complete the required fields correctly.');
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
          toast.success('Certificate issued, stamped and registered');
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
    setError('Issuing operation timed out');
    setPolling(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Issuer Portal
        </span>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Issue a New Verifiable Document
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Complete recipient details to render the certificate, stamp the deterministic verification QR, sign the manifest via ECDSA P-256, and register the cryptographic SHA-256 record.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Form Column */}
        <form onSubmit={submit} className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Document Type & Category</CardTitle>
              <CardDescription>Select the template to generate and sign</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="doc_type" className="mb-2 block">Document Type</Label>
              <Select
                id="doc_type"
                value={form.doc_type}
                onChange={(e) => set('doc_type', e.target.value)}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipient & Certificate Details</CardTitle>
              <CardDescription>Core cryptographic metadata embedded in the manifest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    {f.key === 'certificate_number' && (
                      <button
                        type="button"
                        onClick={suggestId}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        <Wand2 size={12} /> Suggest ID
                      </button>
                    )}
                  </div>
                  <Input
                    id={f.key}
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    className={f.mono ? 'font-mono' : ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, [f.key]: 1 }))}
                  />
                  {touched[f.key] && errors[f.key] && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors[f.key]}</p>
                  )}
                </div>
              ))}

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <Label htmlFor="issue_date" className="mb-1.5 block">Issue Date</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => set('issue_date', e.target.value)}
                  />
                  {touched.issue_date && errors.issue_date && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.issue_date}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="expires_at" className="mb-1.5 block">Expiry Date (Optional)</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => set('expires_at', e.target.value)}
                  />
                  {touched.expires_at && errors.expires_at && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.expires_at}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your organization's private key never leaves the secure signing enclave.
            </p>
            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={!valid || polling}
              loading={polling}
              className="shrink-0"
            >
              Issue & Sign Document
            </Button>
          </div>
        </form>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Document Rendering Preview
          </span>
          <Preview form={form} />
        </div>
      </div>

      {/* Live Stepper overlay during polling */}
      <AnimatePresence>
        {job && !result && (
          <Stepper
            overlay
            steps={job.steps}
            progress={job.progress}
            title="Issuing and Signing Document"
            subtitle="Executing deterministic cryptographic pipeline..."
            error={job.error}
          />
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {result && (
          <SuccessCard
            result={result}
            onClose={() => {
              setResult(null);
              setJob(null);
              setForm(BLANK);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SuccessCard({ result, onClose }) {
  const toast = useToast();
  const copy = async (text, what) => {
    if (await copyText(text)) toast.success(`${what} copied to clipboard`);
    else toast.error('Could not copy');
  };

  return (
    <motion.div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.94, y: 14, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-8 text-card-foreground shadow-2xl"
      >
        <div className="flex items-center gap-3.5 border-b border-border pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <Check size={24} strokeWidth={2.6} />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
              Document Successfully Issued
            </h2>
            <p className="text-xs text-muted-foreground">
              Cryptographically signed with ECDSA P-256 and committed to the registry ledger.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_200px]">
          <div className="space-y-2.5">
            <SuccessRow label="Recipient" value={result.fields?.name} />
            <SuccessRow label="Certificate ID" value={result.fields?.certificate_number} mono />
            <SuccessRow label="Issuer" value={result.issuer_name} />
            <SuccessRow label="Issued On" value={fmtDate(result.issued_at, true)} />
            <SuccessRow
              label="Document ID"
              value={result.doc_id}
              mono
              onCopy={() => copy(result.doc_id, 'Document ID')}
            />
            <SuccessRow
              label="File SHA-256"
              value={shortHash(result.file_hash, 14, 8)}
              mono
              onCopy={() => copy(result.file_hash, 'File hash')}
            />
            <SuccessRow label="Signing Key" value={result.kid} mono />
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-center">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <QrCode size={22} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Verification QR
            </p>
            <code className="font-mono text-[9px] break-all text-muted-foreground max-w-[160px] leading-tight bg-background/80 p-1.5 rounded border border-border">
              {result.verify_url}
            </code>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <a href={assetUrl(result.pdf_url)} download>
            <Button variant="default">
              <Download size={16} /> Download Signed PDF
            </Button>
          </a>
          <Button variant="outline" onClick={() => copy(result.verify_url, 'Verification URL')}>
            <Copy size={15} /> Copy Verification Link
          </Button>
          <Link to="/issuer/documents">
            <Button variant="ghost">
              <FileText size={15} /> My Documents
            </Button>
          </Link>
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Issue Another
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            The embedded QR encodes the public URL pointing to this document's registry manifest. External verifiers can scan the paper or digital PDF to immediately verify provenance.
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SuccessRow({ label, value, mono, onCopy }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2">
      <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`min-w-0 flex-1 truncate text-xs font-medium text-foreground ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
      {onCopy && (
        <button
          onClick={onCopy}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}

/** Certificate preview */
function Preview({ form }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-[#FCFCFD] dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm">
      <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-stone-800/20 dark:border-stone-700/40" />
      <div className="pointer-events-none absolute inset-[18px] rounded border border-amber-500/40" />
      <div className="relative px-7 py-9 text-center">
        <p className="font-display text-base font-bold tracking-[0.25em] text-stone-900 dark:text-stone-100">
          AGNITIA
        </p>
        <p className="mt-1 text-[8px] font-semibold tracking-[0.2em] text-amber-600 dark:text-amber-400">
          PROOF IN EVERY PIXEL
        </p>
        <div className="mx-auto mt-2 h-px w-28 bg-amber-500/50" />
        <p className="mt-3 text-xs font-semibold text-stone-800 dark:text-stone-200">
          Meridian Institute of Technology
        </p>
        <p className="text-[9px] italic text-muted-foreground">Digitally signed credential</p>

        <p className="mt-7 text-xs font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase">
          CERTIFICATE OF COMPLETION
        </p>
        <p className="mt-3 text-[10px] text-muted-foreground">This is to certify that</p>
        <p className="mt-1.5 font-display text-xl font-bold text-stone-900 dark:text-stone-100">
          {form.name || 'Recipient Name'}
        </p>
        <div className="mx-auto mt-1 h-px w-44 bg-stone-300 dark:bg-stone-700" />
        {form.course && <p className="mt-3 text-[11px] text-stone-700 dark:text-stone-300">has completed {form.course}</p>}
        {form.grade && <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">Grade: {form.grade}</p>}
        {form.issue_date && <p className="mt-1 text-[10px] text-muted-foreground">Issued on {form.issue_date}</p>}

        <div className="mx-auto mt-6 flex w-full max-w-xs items-end justify-between gap-3 rounded-xl bg-stone-100 dark:bg-stone-800/60 px-3 py-2 text-left border border-border">
          <div className="space-y-1">
            <div className="flex gap-2 text-[8px]">
              <span className="font-semibold text-muted-foreground">CREDENTIAL ID:</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">{form.certificate_number || '—'}</span>
            </div>
            <div className="flex gap-2 text-[8px]">
              <span className="font-semibold text-muted-foreground">ISSUE DATE:</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">{form.issue_date || '—'}</span>
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
            <QrCode size={20} />
          </div>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[8px] text-muted-foreground">
          <CalendarDays size={9} /> Agnitia Platform · Signed ECDSA-P256
        </p>
      </div>
    </div>
  );
}
