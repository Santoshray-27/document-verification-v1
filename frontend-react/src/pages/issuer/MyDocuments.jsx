import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Ban, ChevronDown, Download, ExternalLink, FilePlus2, Search } from 'lucide-react';
import api, { assetUrl, errMsg } from '../../api/axios';
import Modal from '../../components/Modal.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Spinner } from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { fmtDate, shortHash } from '../../lib/format';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'revoked', label: 'Revoked' },
];

export default function MyDocuments() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/issuer/documents', { params: { status: status || undefined, search: search || undefined, limit: 50 } });
      setRows(data.documents);
      setTotal(data.total);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const doRevoke = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await api.post(`/issuer/documents/${revoking.doc_id}/revoke`, { reason: reason.trim() });
      toast.success('Document revoked — future verifications will say REVOKED');
      setRevoking(null);
      setReason('');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-title">Issuer</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">My documents</h1>
          <p className="mt-1.5 text-sm text-slate-400">{total} record(s) under your issuer account.</p>
        </div>
        <Link to="/issuer/issue" className="btn-primary">
          <FilePlus2 size={16} />
          Issue new
        </Link>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${status === f.id ? 'bg-gold-500 text-navy-900' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search by name, certificate ID or doc_id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="Nothing here yet"
          body={search || status ? 'No document matches this filter.' : 'Issue your first certificate to see it listed here.'}
          action={<Link to="/issuer/issue" className="btn-primary">Issue a certificate</Link>}
        />
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-semibold">Recipient</th>
                  <th className="px-3 py-3 font-semibold">Certificate ID</th>
                  <th className="px-3 py-3 font-semibold">File hash</th>
                  <th className="px-3 py-3 font-semibold">Issued</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((d) => {
                  const expanded = open === d.doc_id;
                  return (
                    <>
                      <motion.tr key={d.doc_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5 font-medium text-slate-200">{d.fields?.name || '—'}</td>
                        <td className="mono px-3 py-3.5 text-xs text-slate-400">{d.fields?.certificate_number || '—'}</td>
                        <td className="mono px-3 py-3.5 text-[11px] text-slate-500">{shortHash(d.file_hash, 10, 6)}</td>
                        <td className="px-3 py-3.5 text-slate-400">{fmtDate(d.issued_at)}</td>
                        <td className="px-3 py-3.5">
                          <StatusPill status={d.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setOpen(expanded ? null : d.doc_id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                              aria-label="Show details"
                              aria-expanded={expanded}
                            >
                              <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                            <a href={assetUrl(`/static/issued/${d.doc_id}.pdf`)} download className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Download PDF">
                              <Download size={16} />
                            </a>
                            {d.status === 'active' && (
                              <button
                                onClick={() => { setRevoking(d); setReason(''); }}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                                aria-label="Revoke document"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <tr key={`${d.doc_id}-detail`}>
                            <td colSpan={6} className="bg-navy-950/40 px-5 py-4">
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <dl className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
                                  <Detail label="Document ID" value={d.doc_id} mono />
                                  <Detail label="Signing key" value={d.kid} mono />
                                  <Detail label="Fields hash" value={d.fields_hash} mono />
                                  <Detail label="File hash" value={d.file_hash} mono />
                                  <Detail label="Expires" value={d.expires_at ? fmtDate(d.expires_at) : 'never'} />
                                  <Detail label="Course" value={d.fields?.course} />
                                  <Detail label="Grade" value={d.fields?.grade} />
                                  {d.revoke_reason && <Detail label="Revoked because" value={d.revoke_reason} />}
                                </dl>
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                                    Signed manifest
                                  </summary>
                                  <pre className="mono mt-2 overflow-x-auto rounded-lg border border-white/[0.07] bg-navy-950/60 p-3 text-[10px] leading-relaxed text-slate-400">
                                    {JSON.stringify(d.manifest ?? JSON.parse('{}'), null, 2)}
                                  </pre>
                                </details>
                                <a
                                  href={`${window.location.origin}/public/verify/${d.doc_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-400 hover:text-gold-300"
                                >
                                  Open public verification page <ExternalLink size={12} />
                                </a>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        title="Revoke this document?"
        footer={
          <>
            <button onClick={() => setRevoking(null)} className="btn-ghost">Cancel</button>
            <button onClick={doRevoke} disabled={!reason.trim() || busy} className="btn-danger">
              {busy ? <Spinner /> : <><Ban size={14} /> Revoke</>}
            </button>
          </>
        }
      >
        {revoking && (
          <>
            <p className="text-sm leading-relaxed text-slate-400">
              Revoking <span className="font-semibold text-slate-200">{revoking.fields?.name}</span> ({revoking.fields?.certificate_number})
              means every future verification returns <span className="font-semibold text-orange-300">REVOKED</span> — even if the file is
              byte-for-byte the original. This cannot be undone from the UI.
            </p>
            <label className="label mt-5" htmlFor="reason">Reason (stored in the audit log)</label>
            <textarea id="reason" rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Issued with an incorrect grade" />
          </>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-all text-slate-300 ${mono ? 'mono text-[11px]' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    active: { c: '#10B981', t: 'Active' },
    revoked: { c: '#F97316', t: 'Revoked' },
    expired: { c: '#64748B', t: 'Expired' },
  };
  const m = map[status] || map.active;
  return (
    <span className="chip border" style={{ borderColor: `${m.c}44`, background: `${m.c}12`, color: m.c }}>
      {m.t}
    </span>
  );
}
