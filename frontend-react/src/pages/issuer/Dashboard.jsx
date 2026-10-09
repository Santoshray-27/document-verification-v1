import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Ban, FileCheck2, FilePlus2, ScanSearch, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import StatCard from '../../components/StatCard.jsx';
import { SkeletonStatCards, SkeletonTable } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { VerdictPill } from '../../components/VerdictBadge.jsx';
import { fmtDate } from '../../lib/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/issuer/dashboard');
        if (alive) setData(data);
      } catch (e) {
        if (alive) setError(errMsg(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <SkeletonStatCards />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={AlertCircle} title="Could not load your dashboard" body={error} action={<Link to="/issuer" className="btn-ghost">Retry</Link>} />
      </div>
    );
  }

  const s = data.stats;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-title">Issuer dashboard</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{data.issuer?.name}</h1>
          <p className="mono mt-1 text-xs text-slate-500">{data.issuer?.issuer_id} · {data.issuer?.org_type}</p>
        </div>
        <Link to="/issuer/issue" className="btn-primary">
          <FilePlus2 size={16} />
          Issue new document
        </Link>
      </motion.header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Documents issued" value={s.total} icon={FileCheck2} tone="#D4AF37" />
        <StatCard label="Active" value={s.active} icon={ShieldCheck} tone="#10B981" />
        <StatCard label="Revoked" value={s.revoked} icon={Ban} tone="#F97316" />
        <StatCard label="Verifications run" value={s.verifications} icon={ScanSearch} tone="#14B8A6" hint={`${s.expired} expired`} />
      </div>

      {data.by_verdict?.length > 0 && (
        <div className="glass mt-6 p-5">
          <p className="section-title mb-3.5">Verifications of your documents, by verdict</p>
          <div className="flex flex-wrap gap-2.5">
            {data.by_verdict.map((v) => (
              <span key={v.verdict} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                <VerdictPill verdict={v.verdict} />
                <span className="mono text-xs text-slate-400">{v.n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="section-title">Recently issued</h2>
          <Link to="/issuer/documents" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-400 hover:text-gold-300">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {data.recent.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title="No documents yet"
            body="Issue your first certificate — the website renders the PDF, embeds the verification QR and signs the record."
            action={<Link to="/issuer/issue" className="btn-primary">Issue a certificate</Link>}
          />
        ) : (
          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">Recipient</th>
                    <th className="px-3 py-3 font-semibold">Certificate ID</th>
                    <th className="px-3 py-3 font-semibold">Issued</th>
                    <th className="px-5 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {data.recent.map((d, i) => (
                    <motion.tr key={d.doc_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-medium text-slate-200">{d.fields?.name || '—'}</td>
                      <td className="mono px-3 py-3.5 text-slate-400">{d.fields?.certificate_number || '—'}</td>
                      <td className="px-3 py-3.5 text-slate-400">{fmtDate(d.issued_at)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className="chip border"
                          style={{
                            borderColor: d.status === 'active' ? '#10B98144' : '#F9731644',
                            background: d.status === 'active' ? '#10B98112' : '#F9731612',
                            color: d.status === 'active' ? '#10B981' : '#F97316',
                          }}
                        >
                          {d.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
