import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Ban,
  ChevronDown,
  Download,
  ExternalLink,
  FilePlus2,
  Search,
} from 'lucide-react';
import api, { assetUrl, errMsg } from '../../api/axios';
import Modal from '../../components/Modal.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Spinner } from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { fmtDate, shortHash } from '../../lib/format';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Textarea } from '../../components/ui/textarea.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Label } from '../../components/ui/label.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.jsx';

const FILTERS = [
  { id: '', label: 'All Documents' },
  { id: 'active', label: 'Active Registry' },
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
      const { data } = await api.get('/issuer/documents', {
        params: { status: status || undefined, search: search || undefined, limit: 50 },
      });
      setRows(data.documents);
      setTotal(data.total);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const doRevoke = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await api.post(`/issuer/documents/${revoking.doc_id}/revoke`, { reason: reason.trim() });
      toast.success('Document revoked — future verifications will report REVOKED');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Registry Ledger
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Documents
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {total} registered cryptographic credential(s) under your issuer account.
          </p>
        </div>
        <Link to="/issuer/issue">
          <Button variant="default">
            <FilePlus2 size={16} /> Issue New Document
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                status === f.id
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] sm:max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search recipient, ID, or hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="No documents found"
          body={search || status ? 'No documents match your query or filter.' : 'Issue your first certificate to establish the cryptographic registry.'}
          action={
            <Link to="/issuer/issue">
              <Button variant="default">Issue Certificate</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Certificate ID</TableHead>
                  <TableHead>File SHA-256</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => {
                  const expanded = open === d.doc_id;
                  return (
                    <React.Fragment key={d.doc_id}>
                      <TableRow className="transition-colors hover:bg-muted/40">
                        <TableCell className="font-medium text-foreground">
                          {d.fields?.name || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {d.fields?.certificate_number || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {shortHash(d.file_hash, 10, 6)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(d.issued_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'active' ? 'genuine' : 'revoked'}>
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setOpen(expanded ? null : d.doc_id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                              aria-label="Toggle details"
                              aria-expanded={expanded}
                              title="Details"
                            >
                              <ChevronDown
                                size={16}
                                className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                            <a
                              href={assetUrl(`/static/issued/${d.doc_id}.pdf`)}
                              download
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                              aria-label="Download PDF"
                              title="Download PDF"
                            >
                              <Download size={16} />
                            </a>
                            {d.status === 'active' && (
                              <button
                                onClick={() => {
                                  setRevoking(d);
                                  setReason('');
                                }}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                aria-label="Revoke document"
                                title="Revoke document"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      <AnimatePresence initial={false}>
                        {expanded && (
                          <TableRow key={`${d.doc_id}-detail`}>
                            <TableCell colSpan={6} className="bg-muted/30 p-5">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden space-y-4"
                              >
                                <dl className="grid gap-x-8 gap-y-2.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                  <DocDetail label="Document ID" value={d.doc_id} mono />
                                  <DocDetail label="Signing Key" value={d.kid} mono />
                                  <DocDetail label="Fields Hash" value={d.fields_hash} mono />
                                  <DocDetail label="File Hash" value={d.file_hash} mono />
                                  <DocDetail label="Course" value={d.fields?.course} />
                                  <DocDetail label="Grade" value={d.fields?.grade} />
                                  <DocDetail label="Expires" value={d.expires_at ? fmtDate(d.expires_at) : 'Never'} />
                                  {d.revoke_reason && (
                                    <DocDetail label="Revoke Reason" value={d.revoke_reason} highlight />
                                  )}
                                </dl>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                                  <a
                                    href={`${window.location.origin}/public/verify/${d.doc_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                                  >
                                    Open Public Verification Page <ExternalLink size={13} />
                                  </a>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    Signed with ECDSA P-256
                                  </span>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden space-y-3">
            {rows.map((d) => (
              <div
                key={d.doc_id}
                className="rounded-2xl border border-border bg-card p-4 space-y-3 text-card-foreground shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-sm text-foreground">
                      {d.fields?.name || '—'}
                    </h3>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                      {d.fields?.certificate_number || '—'}
                    </p>
                  </div>
                  <Badge variant={d.status === 'active' ? 'genuine' : 'revoked'}>
                    {d.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Issued: {fmtDate(d.issued_at)}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={assetUrl(`/static/issued/${d.doc_id}.pdf`)}
                      download
                      className="p-1.5 rounded-lg border border-border bg-muted/40 text-foreground"
                    >
                      <Download size={14} />
                    </a>
                    {d.status === 'active' && (
                      <button
                        onClick={() => {
                          setRevoking(d);
                          setReason('');
                        }}
                        className="p-1.5 rounded-lg border border-border bg-muted/40 text-rose-600 dark:text-rose-400"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Revocation Confirmation Dialog */}
      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        title="Revoke Registry Document?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={doRevoke}
              disabled={!reason.trim() || busy}
              loading={busy}
            >
              <Ban size={14} /> Revoke Document
            </Button>
          </>
        }
      >
        {revoking && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Revoking{' '}
              <span className="font-semibold text-foreground">{revoking.fields?.name}</span> (ID:{' '}
              <span className="font-mono text-foreground">{revoking.fields?.certificate_number}</span>)
              will permanently set its registry status to{' '}
              <span className="font-semibold text-rose-600 dark:text-rose-400">REVOKED</span>. Even if an authentic signed file is uploaded, verification will report it as withdrawn.
            </p>

            <div>
              <Label htmlFor="revoke-reason" className="mb-1.5 block">
                Revocation Reason (Recorded in Immutable Audit Log)
              </Label>
              <Textarea
                id="revoke-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Credential withdrawn due to academic correction..."
                required
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DocDetail({ label, value, mono, highlight }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-all text-foreground ${mono ? 'font-mono text-[11px]' : ''} ${
          highlight ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''
        }`}
      >
        {value || '—'}
      </dd>
    </div>
  );
}
