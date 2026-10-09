import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw, ScrollText, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Spinner } from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { fmtDate, shortHash } from '../../lib/format';

const ACTION_COLOR = {
  ISSUE: '#D4AF37', VERIFY: '#14B8A6', REVOKE: '#F97316', LOGIN: '#93A3C8',
  LOGIN_FAILED: '#EF4444', ISSUER_CREATE: '#8B5CF6', KEY_GENERATE: '#8B5CF6',
  INTEGRITY_CHECK: '#10B981', SEED: '#64748B',
};

export default function AuditLog() {
  const toast = useToast();
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
      if (data.valid) toast.success(`Audit chain valid — ${data.entries_checked} entries verified`);
      else toast.error(`Chain broken at entry #${data.broken_at}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-title">Admin</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Audit log</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
            Append-only and hash-chained: every entry commits to the one before it. Tamper-<em className="not-italic text-slate-300">evident</em>,
            not immutable — an attacker with database access could rewrite the log, but not without breaking the chain.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={load} className="btn-ghost btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={runIntegrity} disabled={checking} className="btn-primary btn-sm">
            {checking ? <Spinner /> : <><ShieldCheck size={14} /> Verify integrity</>}
          </button>
        </div>
      </header>

      {integrity && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            integrity.valid ? 'border-emerald-400/30 bg-emerald-500/[0.08]' : 'border-rose-400/30 bg-rose-500/[0.08]'
          }`}
        >
          {integrity.valid ? (
            <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle size={19} className="mt-0.5 shrink-0 text-rose-400" />
          )}
          <div>
            <p className={`text-sm font-semibold ${integrity.valid ? 'text-emerald-200' : 'text-rose-200'}`}>
              {integrity.valid
                ? `Chain valid — ${integrity.entries_checked} entries verified`
                : `Chain BROKEN at entry #${integrity.broken_at}`}
            </p>
            <p className={`mt-0.5 text-xs ${integrity.valid ? 'text-emerald-200/70' : 'text-rose-200/70'}`}>
              {integrity.valid
                ? 'Every entry_hash recomputes from its predecessor. No entry has been altered since it was written.'
                : `Reason: ${integrity.reason}. Someone modified a stored entry without recomputing the chain.`}
            </p>
          </div>
        </motion.div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">Filter</span>
        {['', 'ISSUE', 'VERIFY', 'REVOKE', 'LOGIN', 'INTEGRITY_CHECK'].map((a) => (
          <button
            key={a || 'all'}
            onClick={() => setAction(a)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              action === a ? 'bg-gold-500 text-navy-900' : 'border border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
            }`}
          >
            {a || 'All'}
          </button>
        ))}
        <span className="ml-auto mono text-xs text-slate-500">{total} entries</span>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries" body="Nothing has happened yet under this filter." />
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Time</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                  <th className="px-3 py-3 font-semibold">Actor</th>
                  <th className="px-3 py-3 font-semibold">Document</th>
                  <th className="px-3 py-3 font-semibold">Entry hash</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((e, i) => {
                  const expanded = open === e.id;
                  return (
                    <>
                      <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.4) }} className="transition hover:bg-white/[0.02]">
                        <td className="mono px-5 py-3 text-xs text-slate-500">{e.id}</td>
                        <td className="px-3 py-3 text-xs text-slate-400">{fmtDate(e.time, true)}</td>
                        <td className="px-3 py-3">
                          <span
                            className="chip border"
                            style={{
                              borderColor: `${ACTION_COLOR[e.action] || '#94A3B8'}44`,
                              background: `${ACTION_COLOR[e.action] || '#94A3B8'}12`,
                              color: ACTION_COLOR[e.action] || '#94A3B8',
                            }}
                          >
                            {e.action}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-400">
                          {e.actor_role || 'anonymous'}
                          {e.actor_id ? <span className="mono ml-1 text-slate-600">#{e.actor_id}</span> : null}
                        </td>
                        <td className="mono px-3 py-3 text-[11px] text-slate-500">{e.doc_id ? `${e.doc_id.slice(0, 8)}…` : '—'}</td>
                        <td className="mono px-3 py-3 text-[11px] text-slate-500" title={e.entry_hash}>{shortHash(e.entry_hash, 10, 6)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setOpen(expanded ? null : e.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                            aria-label="Show detail"
                            aria-expanded={expanded}
                          >
                            <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </motion.tr>
                      {expanded && (
                        <tr key={`${e.id}-d`}>
                          <td colSpan={7} className="bg-navy-950/40 px-5 py-4">
                            <dl className="grid gap-3 text-xs sm:grid-cols-2">
                              <div>
                                <dt className="text-[10px] uppercase tracking-wider text-slate-500">prev_hash</dt>
                                <dd className="mono mt-0.5 break-all text-slate-400">{e.prev_hash}</dd>
                              </div>
                              <div>
                                <dt className="text-[10px] uppercase tracking-wider text-slate-500">entry_hash</dt>
                                <dd className="mono mt-0.5 break-all text-slate-300">{e.entry_hash}</dd>
                              </div>
                            </dl>
                            <dt className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">detail</dt>
                            <pre className="mono mt-1.5 overflow-x-auto rounded-lg border border-white/[0.07] bg-navy-950/60 p-3 text-[10px] leading-relaxed text-slate-400">
                              {JSON.stringify(e.detail, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
