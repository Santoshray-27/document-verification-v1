import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  Clock,
  Download,
  FileSearch,
  Printer,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import VerdictBadge from '../../components/VerdictBadge.jsx';
import EvidenceList from '../../components/EvidenceList.jsx';
import FieldDiff from '../../components/FieldDiff.jsx';
import HashStrip from '../../components/HashStrip.jsx';
import HeatmapViewer from '../../components/HeatmapViewer.jsx';
import { SkeletonResult } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { fmtDate, fmtMs } from '../../lib/format';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Progress } from '../../components/ui/progress.jsx';

export default function ResultPage() {
  const { jobId } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/verify/jobs/${jobId}/result`);
        if (alive) setR(data);
      } catch (e) {
        if (alive) setError(errMsg(e, 'This verification result is no longer available.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [jobId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <SkeletonResult />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={FileSearch}
          title="Result Unavailable"
          body={error}
          action={
            <Link to="/verify">
              <Button variant="default">Verify Another Document</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 print:p-0 print:space-y-4">
      {/* ---- HERO VERDICT CARD ---- */}
      <section className="rounded-3xl border border-border bg-card p-7 sm:p-10 text-center shadow-xl print:border-none print:shadow-none">
        <VerdictBadge verdict={r.verdict} confidence={r.confidence_level} />

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs">
          {r.issuer_name && <Meta label="Issuer" value={r.issuer_name} />}
          {r.doc_id && <Meta label="Document ID" value={`${r.doc_id.slice(0, 8)}…`} mono />}
          {r.issued_at && <Meta label="Issued" value={fmtDate(r.issued_at)} />}
          <Meta label="Verified On" value={fmtDate(r.created_at, true)} />
          <Meta label="Latency" value={fmtMs(r.duration_ms)} />
        </div>

        {/* Evidence Score Indicator */}
        <div className="mx-auto mt-7 max-w-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Deterministic Evidence Score
            </span>
            <span className="font-mono text-xs font-bold text-foreground">{r.evidence_score}/100</span>
          </div>
          <Progress value={r.evidence_score} max={100} indicatorClassName="bg-amber-500" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Composite index of passed cryptographic, structural and text checks.
          </p>
        </div>

        {/* Quick Actions (hidden in print) */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
          {r.report_url && (
            <a href={r.report_url} download>
              <Button variant="default">
                <Download size={16} /> Download Verification Report
              </Button>
            </a>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={15} /> Print Result
          </Button>
          <Link to="/verify">
            <Button variant="ghost">
              <RefreshCw size={15} /> Verify Another Document
            </Button>
          </Link>
        </div>
      </section>

      {/* ---- PLAIN LANGUAGE REASONS ---- */}
      {r.reasons?.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Deterministic Decision Rationale
          </h3>
          <ul className="space-y-3">
            {r.reasons.map((x, i) => (
              <motion.li
                key={x.code}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/70 bg-muted/30 p-4"
              >
                <p className="text-sm font-semibold text-foreground">{x.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{x.detail}</p>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

<<<<<<< HEAD
      {/* ---- EVIDENCE CHECKLIST ---- */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cryptographic & Forensic Evidence Checklist
        </h3>
=======
      {/* ---- heatmap ---- */}
      <section>
        <HeatmapViewer visual={r.visual} snapshotUrl={r.doc_id ? `/static/snapshots/${r.doc_id}.png` : null} />
      </section>

      {/* ---- evidence ---- */}
      <section>
        <h3 className="section-title mb-3">Evidence checklist — every check that ran</h3>
>>>>>>> origin/feat/ai-llm-explanation
        <EvidenceList checks={r.checks} />
      </section>

      {/* ---- HASH COMPARISON ---- */}
      <HashStrip expected={r.expected_file_hash} uploaded={r.uploaded_file_hash} match={r.hash_match} />

      {/* ---- FIELD LEVEL DIFF ---- */}
      {r.fields?.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Registry vs Extracted Text Comparison
          </h3>
          <FieldDiff fields={r.fields} ocrConfidence={r.ocr_confidence} />
        </section>
      )}

      {/* ---- VISUAL FORENSIC HEATMAP ---- */}
      <section>
        <HeatmapViewer visual={r.visual} snapshotUrl={r.doc_id ? `/static/snapshots/${r.doc_id}.png` : null} />
      </section>

      {/* ---- SEMANTIC CONSISTENCY CHECKS ---- */}
      {r.semantic_findings?.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Semantic Consistency Checks
            </h3>
            <Badge variant="outline" className="text-[10px]">
              advisory only
            </Badge>
          </div>
          <ul className="space-y-3">
            {r.semantic_findings.map((f, i) => (
              <li
                key={i}
                className={`rounded-xl border p-4 ${
                  f.severity === 'ERROR'
                    ? 'border-destructive/30 bg-destructive/10'
                    : f.severity === 'WARNING'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-emerald-500/30 bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      f.severity === 'ERROR'
                        ? 'text-destructive'
                        : f.severity === 'WARNING'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {f.status}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{f.field.replace(/_/g, ' ')}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{f.reason}</p>
                {f.observed_value && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Observed: <span className="font-medium text-foreground">{f.observed_value}</span>{' '}
                    {f.expected_rule && `· Expected: ${f.expected_rule}`}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- METADATA SIGNALS ---- */}
      {r.metadata && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            File Metadata Signals
          </h3>
          {r.metadata.signals?.length ? (
            <div className="flex flex-wrap gap-2">
              {r.metadata.signals.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-900 dark:text-amber-200"
                >
                  <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No suspicious metadata anomalies detected.</p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Metadata signals provide forensic context but never override mathematical digital signature verification.
          </p>
        </section>
      )}

      {/* ---- AI ASSISTED EXPLANATION ---- */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-amber-700 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Synthesis & Summary</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">
            Rule-Based
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{r.ai_explanation || plainLanguage(r)}</p>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Verdicts are calculated strictly from cryptographic proofs and deterministic verification rules. AI explanation is advisory.
          </span>
        </p>
      </section>

      <p className="pb-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 print:hidden">
        <Clock size={12} />
        Agnitia Verification Report · Immutable cryptographic proof aid
      </p>
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    </span>
  );
}

function plainLanguage(r) {
  const issuer = r.issuer_name || 'the issuer';
  switch (r.verdict) {
    case 'GENUINE':
      return `This is byte-for-byte the exact file ${issuer} signed. Its SHA-256 matches the registry ledger, and the registry record itself carries a valid ECDSA P-256 digital signature. The document can be accepted with high cryptographic confidence.`;
    case 'GENUINE COPY':
      return `The textual content is unchanged from what ${issuer} signed, but file-level encoding differs — typical for print-to-PDF exports, scans, or screenshots. Confidence is ${r.confidence_level} based on multi-layer OCR and layout comparison.`;
    case 'ALTERED':
      return `The file content differs from what ${issuer} cryptographically signed. One or more key fields have been edited. Review the visual difference heatmap to inspect modified regions.`;
    case 'FORGED':
      return `This document was not issued by ${issuer} in this form. Either digital signature verification failed, or a genuine QR code was affixed to mismatched content. Do not accept this document.`;
    case 'NOT ISSUED':
      return `No registry record exists for this document identifier in the Agnitia ledger. It was not issued by an accredited registered authority.`;
    case 'UNVERIFIABLE':
      return `A record was located, but cryptographic issuer authority cannot be confirmed at this time (the issuer may be suspended or signing keys revoked).`;
    case 'REVOKED':
      return `${issuer} has explicitly revoked and withdrawn this document. Even if file bytes match the original, it is invalidated.`;
    case 'EXPIRED':
      return `This document was authentically issued, but its designated validity period has lapsed.`;
    default:
      return `Insufficient readable evidence was extracted to reach a deterministic verdict. Upload a higher-resolution scan or enter the document ID directly.`;
  }
}
