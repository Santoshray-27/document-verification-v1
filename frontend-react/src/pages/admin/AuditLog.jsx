import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw, ScrollText, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Spinner } from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { fmtDate, shortHash } from '../../lib/format';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Card, CardContent } from '../../components/ui/card.jsx';

const ACTION_COLOR = {
  ISSUE: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  VERIFY: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  REVOKE: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  LOGIN: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30',
  LOGIN_FAILED: 'bg-destructive/15 text-destructive border-destructive/30',
  ISSUER_CREATE: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  KEY_GENERATE: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  INTEGRITY_CHECK: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  SEED: 'bg-stone-400/15 text-stone-600 dark:text-stone-400 border-stone-400/30',
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/30 text-primary font-mono text-[11px] uppercase tracking-wider">
            Governance & Audit
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display sm:text-3xl">Cryptographic Audit Log</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Append-only and hash-chained: every entry commits to the one before it. Tamper-
            <em className="not-italic font-semibold text-foreground">evident</em>, not immutable — an attacker with database access could rewrite the log, but not without breaking the chain.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button size="sm" onClick={runIntegrity} disabled={checking} className="gap-2">
            {checking ? <Spinner /> : <><ShieldCheck size={14} /> Verify Integrity</>}
          </Button>
        </div>
      </header>

      {integrity && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 flex items-start gap-3 rounded-xl border p-4.5 ${
            integrity.valid
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {integrity.valid ? (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {integrity.valid
                ? `Chain valid — ${integrity.entries_checked} entries verified`
                : `Chain BROKEN at entry #${integrity.broken_at}`}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              {integrity.valid
                ? 'Every entry_hash recomputes from its predecessor. No entry has been altered since it was written.'
                : `Reason: ${integrity.reason}. Someone modified a stored entry without recomputing the chain.`}
            </p>
          </div>
        </motion.div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Filter</span>
        {['', 'ISSUE', 'VERIFY', 'REVOKE', 'LOGIN', 'INTEGRITY_CHECK'].map((a) => (
          <button
            key={a || 'all'}
            onClick={() => setAction(a)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              action === a
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {a || 'All'}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-muted-foreground">{total} entries</span>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries" body="Nothing has happened yet under this filter." />
      ) : (
        <Card className="overflow-hidden border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-semibold">#</th>
                  <th className="px-3 py-3.5 font-semibold">Time</th>
                  <th className="px-3 py-3.5 font-semibold">Action</th>
                  <th className="px-3 py-3.5 font-semibold">Actor</th>
                  <th className="px-3 py-3.5 font-semibold">Document</th>
                  <th className="px-3 py-3.5 font-semibold">Entry hash</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((e, i) => {
                  const expanded = open === e.id;
                  const actionStyle = ACTION_COLOR[e.action] || 'bg-muted text-muted-foreground border-border';
                  return (
                    <tbody key={e.id} className="group">
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.4) }}
                        className="transition hover:bg-muted/40"
                      >
                        <td className="font-mono px-5 py-3.5 text-xs text-muted-foreground">{e.id}</td>
                        <td className="px-3 py-3.5 text-xs text-foreground/80">{fmtDate(e.time, true)}</td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${actionStyle}`}>
                            {e.action}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-xs text-foreground/80">
                          {e.actor_role || 'anonymous'}
                          {e.actor_id ? <span className="font-mono ml-1 text-muted-foreground">#{e.actor_id}</span> : null}
                        </td>
                        <td className="font-mono px-3 py-3.5 text-[11px] text-muted-foreground">{e.doc_id ? `${e.doc_id.slice(0, 8)}…` : '—'}</td>
                        <td className="font-mono px-3 py-3.5 text-[11px] text-muted-foreground" title={e.entry_hash}>{shortHash(e.entry_hash, 10, 6)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setOpen(expanded ? null : e.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                            aria-label="Show detail"
                            aria-expanded={expanded}
                          >
                            <ChevronDown size={15} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </motion.tr>
                      {expanded && (
                        <tr className="bg-muted/30">
                          <td colSpan={7} className="px-5 py-4">
                            <dl className="grid gap-3 text-xs sm:grid-cols-2">
                              <div className="rounded-lg border border-border bg-card p-3">
                                <dt className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">prev_hash</dt>
                                <dd className="font-mono mt-1 break-all text-xs text-muted-foreground">{e.prev_hash}</dd>
                              </div>
                              <div className="rounded-lg border border-border bg-card p-3">
                                <dt className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">entry_hash</dt>
                                <dd className="font-mono mt-1 break-all text-xs text-foreground">{e.entry_hash}</dd>
                              </div>
                            </dl>
                            <dt className="mt-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Payload detail</dt>
                            <pre className="font-mono mt-1.5 overflow-x-auto rounded-lg border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
                              {JSON.stringify(e.detail, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
