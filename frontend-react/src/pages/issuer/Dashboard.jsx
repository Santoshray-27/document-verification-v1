import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Ban, FileCheck2, FilePlus2, ScanSearch, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import StatCard from '../../components/StatCard.jsx';
import { SkeletonStatCards, SkeletonTable } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { VerdictPill } from '../../components/VerdictBadge.jsx';
import { fmtDate } from '../../lib/format';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.jsx';

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
      <div className="space-y-6">
        <SkeletonStatCards />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <EmptyState
          icon={AlertCircle}
          title="Could not load your dashboard"
          body={error}
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const s = data.stats;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Issuer Portal Overview
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {data.issuer?.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono bg-muted px-2 py-0.5 rounded border border-border">
              {data.issuer?.issuer_id}
            </span>
            <span>·</span>
            <span>{data.issuer?.org_type || 'Accredited Institution'}</span>
          </div>
        </div>
        <Link to="/issuer/issue">
          <Button variant="default" size="default">
            <FilePlus2 size={16} />
            Issue New Document
          </Button>
        </Link>
      </motion.div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Documents issued" value={s.total} icon={FileCheck2} tone="#F59E0B" />
        <StatCard label="Active registry" value={s.active} icon={ShieldCheck} tone="#10B981" />
        <StatCard label="Revoked" value={s.revoked} icon={Ban} tone="#EA580C" />
        <StatCard
          label="Verifications run"
          value={s.verifications}
          icon={ScanSearch}
          tone="#0D9488"
          hint={`${s.expired} expired`}
        />
      </div>

      {/* Verifications by verdict breakdown */}
      {data.by_verdict?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Verifications of your documents, by verdict
          </p>
          <div className="flex flex-wrap gap-2.5">
            {data.by_verdict.map((v) => (
              <span
                key={v.verdict}
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 shadow-2xs"
              >
                <VerdictPill verdict={v.verdict} />
                <span className="font-mono text-xs font-semibold text-foreground">{v.n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recently issued section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recently Issued Documents
          </h2>
          <Link
            to="/issuer/documents"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline underline-offset-2"
          >
            View all documents <ArrowRight size={13} />
          </Link>
        </div>

        {data.recent.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title="No documents issued yet"
            body="Issue your first verifiable credential. The platform stamps the QR manifest, signs it with your cryptographic key, and registers the SHA-256 hash."
            action={
              <Link to="/issuer/issue">
                <Button variant="default">Issue Certificate</Button>
              </Link>
            }
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Certificate ID</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead className="text-right">Registry Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((d, i) => (
                  <TableRow key={d.doc_id}>
                    <TableCell className="font-medium text-foreground">
                      {d.fields?.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {d.fields?.certificate_number || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {fmtDate(d.issued_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={d.status === 'active' ? 'genuine' : 'revoked'}>
                        {d.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
